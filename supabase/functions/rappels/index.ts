// Rappels de Néophyte : une notification sur le téléphone à l'heure choisie si la séance du jour n'est pas faite,
// et une relance à 21 h quand une série est en danger. Lancée tous les quarts d'heure par pg_cron (supabase/rappels.sql).
//   GET                      → la clé publique VAPID, dont le navigateur a besoin pour s'abonner (créée au premier appel)
//   POST + en-tête x-jeton   → la tournée des rappels (seul pg_cron connaît le jeton)
//   POST + session { essai } → une notification d'essai sur les appareils de la personne connectée
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.117.3";
import { type Abonnement, type ClesVapid, envoyer, nouvellesCles } from "./webpush.ts";

const SITE = "https://yohandk.github.io/Brain-Fit/";
const CONTACT = SITE; // les services de notification veulent une adresse de contact : https:// ou mailto:
const RELANCE = "21:00"; // heure de la relance « série en danger »

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Config = { vapid: ClesVapid | null; jeton: string; actif: boolean };
type Ligne = Abonnement & {
  user_id: string; heure: string; serie: boolean; fuseau: string;
  dernier_rappel: string | null; dernier_serie: string | null;
};
type Jours = Record<string, { done?: Record<string, unknown> }>;
type Progres = { days?: Jours; freeze?: { used?: string[] } };

async function config(admin: SupabaseClient): Promise<Config> {
  const { data, error } = await admin.from("rappels_config").select("vapid, jeton, actif").eq("id", true).single();
  if (error) throw error;
  if (data.vapid) return data as Config;
  // première fois : on crée les clés ; si un autre appel l'a fait entre-temps, on garde les siennes
  const vapid = await nouvellesCles();
  await admin.from("rappels_config").update({ vapid }).eq("id", true).is("vapid", null);
  const { data: d2, error: e2 } = await admin.from("rappels_config").select("vapid, jeton, actif").eq("id", true).single();
  if (e2) throw e2;
  return d2 as Config;
}

// date (AAAA-MM-JJ) et heure (HH:MM) dans le fuseau de la personne
function ici(fuseau: string, quand = new Date()) {
  let f: Intl.DateTimeFormat;
  try {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: fuseau, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  } catch {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  }
  const p = Object.fromEntries(f.formatToParts(quand).map((x) => [x.type, x.value]));
  return { jour: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}:${p.minute}` };
}
function veille(jour: string, n = 1): string {
  const d = new Date(jour + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
const actif = (p: Progres, k: string) => Object.values(p.days?.[k]?.done ?? {}).some(Boolean);

// même règle que la page : un jour protégé par une égide ne casse pas la série mais ne la fait pas avancer
export function serieAvant(p: Progres, jour: string): number {
  const geles = new Set(p.freeze?.used ?? []);
  let n = 0, k = veille(jour);
  for (let i = 0; i < 4000 && (actif(p, k) || geles.has(k)); i++) {
    if (actif(p, k)) n++;
    k = veille(k);
  }
  return n;
}

function message(type: "rappel" | "serie" | "essai", serie: number) {
  const corps = type === "essai"
    ? "Les rappels sont en place. Tu recevras le prochain à l'heure choisie, seulement si ta séance n'est pas faite."
    : type === "serie"
    ? `Ta série de ${serie} jours est en danger : un seul exercice ce soir suffit à la garder.`
    : serie >= 2
    ? `Ta série de ${serie} jours t'attend : quelques minutes suffisent pour la prolonger.`
    : "Ta séance du jour t'attend : quelques minutes pour écrire et raisonner par toi-même.";
  return JSON.stringify({ title: "Néophyte", body: corps, url: SITE, tag: "neophyte-" + type });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  let cfg: Config;
  try {
    cfg = await config(admin);
  } catch (e) {
    console.error(e); // rappels.sql pas encore lancé
    return reply({ error: "not_ready" }, 503);
  }

  if (req.method === "GET") return reply({ cle: cfg.vapid!.publique, actif: cfg.actif });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  const envoi = async (l: Ligne, texte: string) => {
    try {
      const s = await envoyer(l, texte, cfg.vapid!, CONTACT);
      if (s === 404 || s === 410) await admin.from("rappels").delete().eq("endpoint", l.endpoint); // appli désinstallée, notifications refusées…
      else if (s >= 300) console.error("envoi refusé", s, new URL(l.endpoint).host);
      return s < 300;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // notification d'essai, demandée depuis les Réglages
  const jeton = req.headers.get("x-jeton");
  if (!jeton) {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    if (!user) return reply({ error: "not_granted" }, 403);
    const { data: lignes } = await admin.from("rappels").select("*").eq("user_id", user.id);
    if (!lignes?.length) return reply({ error: "no_subscription" }, 404);
    const ok = await Promise.all((lignes as Ligne[]).map((l) => envoi(l, message("essai", 0))));
    return reply({ ok: ok.some(Boolean) }, ok.some(Boolean) ? 200 : 502);
  }

  // la tournée : réservée à pg_cron
  if (jeton !== cfg.jeton) return reply({ error: "not_granted" }, 403);
  if (!cfg.actif) return reply({ ok: true, envoyes: 0, coupe: true });

  const { data: toutes, error } = await admin.from("rappels").select("*");
  if (error) {
    console.error(error);
    return reply({ error: "error" }, 500);
  }
  // qui doit recevoir quoi maintenant (au plus un rappel et une relance par jour)
  const dues: { l: Ligne; jour: string; type: "rappel" | "serie" }[] = [];
  for (const l of toutes as Ligne[]) {
    const { jour, heure } = ici(l.fuseau);
    const h = l.heure.slice(0, 5);
    if (heure >= h && l.dernier_rappel !== jour) dues.push({ l, jour, type: "rappel" });
    else if (l.serie && h < RELANCE && heure >= RELANCE && l.dernier_serie !== jour) dues.push({ l, jour, type: "serie" });
  }
  if (!dues.length) return reply({ ok: true, envoyes: 0 });

  // les progrès des personnes concernées, pour ne rien envoyer à qui a déjà fait sa séance
  const ids = [...new Set(dues.map((d) => d.l.user_id))];
  const { data: docs } = await admin.from("docs").select("user_id, data").eq("name", "progress").in("user_id", ids);
  const progres = new Map((docs ?? []).map((d) => [d.user_id as string, (d.data ?? {}) as Progres]));

  let envoyes = 0;
  await Promise.all(dues.map(async ({ l, jour, type }) => {
    const p = progres.get(l.user_id) ?? {};
    const serie = serieAvant(p, jour);
    const colonne = type === "rappel" ? "dernier_rappel" : "dernier_serie";
    // marqué traité d'abord : un envoi raté n'est pas retenté toute la soirée
    await admin.from("rappels").update({ [colonne]: jour }).eq("endpoint", l.endpoint);
    if (actif(p, jour)) return; // séance déjà faite
    if (type === "serie" && serie < 2) return; // pas de série à sauver
    if (await envoi(l, message(type, serie))) envoyes++;
  }));
  return reply({ ok: true, envoyes });
});
