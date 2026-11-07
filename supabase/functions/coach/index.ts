// Le coach de Brain Fit : reçoit la conversation depuis la page, appelle Claude et renvoie la réponse au fil de l'eau.
// Les comptes listés dans ALLOWED_EMAIL s'en servent toujours. Les testeurs choisis (table coach_testeurs, supabase/coach.sql)
// y ont droit aussi, avec leur propre plafond (COACH_MAX_TESTEUR, 8 par jour par défaut). Avec la variable COACH_OUVERT=oui,
// tout compte à l'e-mail confirmé y a droit, avec ce même plafond.
import Anthropic from "npm:@anthropic-ai/sdk@0.137.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const MODEL = Deno.env.get("COACH_MODEL") || "claude-opus-5-5";
const ALLOWED = (Deno.env.get("ALLOWED_EMAIL") || "").toLowerCase().split(/[\s,;]+/).filter(Boolean);
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// échanges permis par compte et par jour (supabase/coach.sql) ; la vérification de la page ne compte pas
const MAX_JOUR = Math.max(1, Number(Deno.env.get("COACH_MAX_JOUR")) || 30);
const OUVERT = /^(oui|1|true|tous)$/i.test(Deno.env.get("COACH_OUVERT") || "");
const MAX_TESTEUR = Math.max(1, Number(Deno.env.get("COACH_MAX_TESTEUR")) || 8);
// plafond commun à tous les comptes hors propriétaire : borne la facture même si quelqu'un crée cent comptes
const MAX_TOTAL = Math.max(1, Number(Deno.env.get("COACH_MAX_TOTAL_JOUR")) || 300);
// taille d'une demande : la conversation (en caractères) et chaque photo (base64, environ 3 Mo)
const MAX_TEXTE = 80000;
const MAX_IMAGE = 4_000_000;

const anthropic = new Anthropic(); // lit ANTHROPIC_API_KEY
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Turn = { role: "user" | "assistant"; content: string };
type Img = { media_type: string; data: string };

function fail(code: string, status: number) {
  return new Response(JSON.stringify({ error: code }), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  // la session envoyée par la page est vérifiée auprès de Supabase
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  const proprio = !!user && ALLOWED.includes((user.email ?? "").toLowerCase());
  if (!user) return fail("not_granted", 403);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  if (!proprio && !(OUVERT && user.email_confirmed_at)) {
    // testeur choisi : son e-mail confirmé figure dans coach_testeurs (table absente = personne)
    const email = (user.email ?? "").toLowerCase();
    const { data: t } = user.email_confirmed_at && email
      ? await admin.from("coach_testeurs").select("email").eq("email", email).maybeSingle()
      : { data: null };
    if (!t) return fail("not_granted", 403);
  }

  let body: { messages?: Turn[]; images?: Img[]; json?: boolean; tier?: string; ping?: boolean };
  try {
    body = await req.json();
  } catch {
    return fail("bad_request", 400);
  }
  // la page demande seulement si le coach lui est ouvert
  if (body.ping) return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  const turns = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-24);
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") return fail("bad_request", 400);
  if (turns.reduce((n, t) => n + t.content.length, 0) > MAX_TEXTE) return fail("too_long", 413);

  // plafond quotidien : protège la clé API si un compte s'emballe ou est détourné
  if (!proprio) {
    const jour = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
    const { data: lignes, error: et } = await admin.from("coach_usage").select("n").eq("jour", jour).limit(5000);
    if (et) {
      console.error(et);
      return fail("error", 500);
    }
    const total = (lignes ?? []).reduce((n, l) => n + (Number(l.n) || 0), 0);
    if (total >= MAX_TOTAL) return fail("rate_limited", 429);
  }
  const { data: permis, error: eq } = await admin.rpc("coach_consommer", { p_user: user.id, p_max: proprio ? MAX_JOUR : MAX_TESTEUR });
  if (eq) {
    // coach.sql pas encore lancé : on laisse passer le seul propriétaire ; toute autre panne bloque, pour ne pas dépenser sans compter
    if (eq.code !== "PGRST202" || !proprio) {
      console.error(eq);
      return fail("error", 500);
    }
    console.warn("coach.sql non lancé : pas de plafond");
  } else if (permis !== true) return fail("quota", 429);
  const images = (Array.isArray(body.images) ? body.images : [])
    .filter((i) => IMAGE_TYPES.includes(i?.media_type) && typeof i.data === "string" && i.data.length <= MAX_IMAGE)
    .slice(0, 4);

  // les photos (copie de dictée) accompagnent le dernier message
  const messages: Anthropic.Beta.BetaMessageParam[] = turns.map((t, i) =>
    i === turns.length - 1 && images.length
      ? {
        role: t.role,
        content: [
          ...images.map((im) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: im.media_type as "image/jpeg", data: im.data },
          })),
          { type: "text" as const, text: t.content },
        ],
      }
      : t
  );

  const stream = anthropic.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: body.tier === "complex" ? "high" : "medium" },
    ...(body.json ? { system: "Réponds uniquement avec l'objet JSON demandé, sans texte autour ni bloc de code." } : {}),
    messages,
    // si un filtre de sécurité refuse la demande, l'API la confie à un autre modèle au lieu d'échouer
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  } as Anthropic.Beta.MessageCreateParamsStreaming);

  const enc = new TextEncoder();
  const out = new ReadableStream<Uint8Array>({
    async start(c) {
      stream.on("text", (delta) => c.enqueue(enc.encode(delta)));
      try {
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") c.enqueue(enc.encode("\u0000refused"));
      } catch (e) {
        console.error(e);
        const code = e instanceof Anthropic.RateLimitError
          ? "rate_limited"
          : e instanceof Anthropic.APIUserAbortError
          ? "cancelled"
          : "error";
        c.enqueue(enc.encode("\u0000" + code));
      }
      c.close();
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(out, {
    headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
});
