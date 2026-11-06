// Rappels de Néophyte : une notification sur le téléphone à l'heure choisie si la séance du jour n'est pas faite,
// et une relance à 21 h quand une série est en danger. Lancée tous les quarts d'heure par pg_cron (supabase/rappels.sql).
//   GET                      → la clé publique VAPID, dont le navigateur a besoin pour s'abonner (créée au premier appel)
//   POST + en-tête x-jeton   → la tournée des rappels (seul pg_cron connaît le jeton)
//   POST + session { essai } → une notification d'essai sur les appareils de la personne connectée
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.117.3";
import { type Abonnement, type ClesVapid, envoyer, nouvellesCles } from "./webpush.ts";

const SITE = "https://neo-phyte.fr/";
const CONTACT = SITE; // les services de notification veulent une adresse de contact : https:// ou mailto:
const RELANCE = "21:00"; // heure de la relance « série en danger »
const PUSH_OK =
  /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;

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
  amis?: boolean; dernier_amis?: string | null; // cercle-vivant.sql
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
    // seulement vers les services de notifications connus (voir durcissement.sql)
    if (!PUSH_OK.test(l.endpoint)) {
      await admin.from("rappels").delete().eq("endpoint", l.endpoint);
      return false;
    }
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
  const amis = await tourneeAmis(admin, toutes as Ligne[], envoi);

  // qui doit recevoir quoi maintenant (au plus un rappel et une relance par jour)
  const dues: { l: Ligne; jour: string; type: "rappel" | "serie" }[] = [];
  for (const l of toutes as Ligne[]) {
    const { jour, heure } = ici(l.fuseau);
    const h = l.heure.slice(0, 5);
    if (heure >= h && l.dernier_rappel !== jour) dues.push({ l, jour, type: "rappel" });
    else if (l.serie && h < RELANCE && heure >= RELANCE && l.dernier_serie !== jour) dues.push({ l, jour, type: "serie" });
  }
  if (!dues.length) return reply({ ok: true, envoyes: 0, amis });

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
  return reply({ ok: true, envoyes, amis });
});

// ───── « À toi de jouer » (cercle-vivant.sql) : un ami t'attend dans un duel, te défie, te pique ou te pose une question ─────
// Une seule notification qui résume tout ce qui est arrivé depuis la dernière, entre 8 h et 21 h 30, heure de la personne.
const CALME = ["08:00", "21:30"];
async function tourneeAmis(
  admin: SupabaseClient,
  lignes: Ligne[],
  envoi: (l: Ligne, texte: string) => Promise<boolean>,
): Promise<number> {
  const prets = lignes.filter((l) => l.amis !== undefined && l.amis && (() => {
    const h = ici(l.fuseau).heure;
    return h >= CALME[0] && h < CALME[1];
  })());
  if (!prets.length) return 0;
  const ids = [...new Set(prets.map((l) => l.user_id))];
  const depuis = new Date(Math.min(...prets.map((l) => Date.parse(l.dernier_amis ?? "") || Date.now()))).toISOString();
  const maintenant = new Date().toISOString();
  const [duels, gestes, questions] = await Promise.all([
    admin.from("duels").select("code,a,b,tour,updated_at").in("tour", ids).eq("fini", false).gt("updated_at", depuis),
    admin.from("circle_nudges").select("code,from_id,to_id,kind,created_at").in("to_id", ids).in("kind", ["defi", "pique"]).gt("created_at", depuis),
    admin.from("circle_questions").select("code,from_id,to_id,created_at").gt("created_at", depuis),
  ]);
  if (duels.error || gestes.error || questions.error) {
    console.error(duels.error ?? gestes.error ?? questions.error);
    return 0;
  }
  // les questions posées à tout le cercle vont à chaque membre (sauf l'auteur)
  const codes = [...new Set((questions.data ?? []).filter((q) => !q.to_id).map((q) => q.code as string))];
  const membres = new Map<string, string[]>();
  const pseudos = new Map<string, string>();
  const tousCodes = [...new Set([...(duels.data ?? []), ...(gestes.data ?? []), ...(questions.data ?? [])].map((x) => x.code as string))];
  if (tousCodes.length) {
    const { data } = await admin.from("circle_members").select("code,user_id,pseudo").in("code", tousCodes);
    for (const m of data ?? []) {
      pseudos.set(m.code + ":" + m.user_id, m.pseudo);
      if (codes.includes(m.code)) membres.set(m.code, [...(membres.get(m.code) ?? []), m.user_id]);
    }
  }
  const nom = (code: string, id: string) => pseudos.get(code + ":" + id) ?? "Un ami";
  let n = 0;
  await Promise.all(prets.map(async (l) => {
    const t0 = Date.parse(l.dernier_amis ?? maintenant);
    const apres = (x: string) => Date.parse(x) > t0;
    const moi = l.user_id;
    const items: string[] = [];
    for (const d of duels.data ?? []) {
      if (d.tour === moi && apres(d.updated_at)) items.push(`${nom(d.code, d.a === moi ? d.b : d.a)} t'attend dans votre duel`);
    }
    for (const g of gestes.data ?? []) {
      if (g.to_id === moi && apres(g.created_at)) {
        items.push(g.kind === "defi" ? `${nom(g.code, g.from_id)} te défie à l'Éclair` : `${nom(g.code, g.from_id)} te lance une pique`);
      }
    }
    for (const q of questions.data ?? []) {
      if (!apres(q.created_at) || q.from_id === moi) continue;
      if (q.to_id === moi || (!q.to_id && (membres.get(q.code) ?? []).includes(moi))) {
        items.push(`${nom(q.code, q.from_id)} ${q.to_id ? "t'a écrit une question piège" : "pose une question au cercle"}`);
      }
    }
    await admin.from("rappels").update({ dernier_amis: maintenant }).eq("endpoint", l.endpoint);
    if (!items.length) return;
    const uniques = [...new Set(items)];
    const corps = uniques.length === 1 ? uniques[0] + "." : uniques.slice(0, 3).join(" ; ") + (uniques.length > 3 ? "…" : ".");
    const texte = JSON.stringify({ title: "À toi de jouer", body: corps, url: SITE + "#amis", tag: "neophyte-amis" });
    if (await envoi(l, texte)) n++;
  }));
  return n;
}
