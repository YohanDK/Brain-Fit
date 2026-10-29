// Le coach de Brain Fit : reçoit la conversation depuis la page, appelle Claude et renvoie la réponse au fil de l'eau.
// Seuls les comptes listés dans ALLOWED_EMAIL peuvent s'en servir, pour que personne d'autre ne dépense la clé API.
import Anthropic from "npm:@anthropic-ai/sdk@0.137.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const MODEL = Deno.env.get("COACH_MODEL") || "claude-opus-5-5";
const ALLOWED = (Deno.env.get("ALLOWED_EMAIL") || "").toLowerCase().split(/[\s,;]+/).filter(Boolean);
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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
  if (!user || !ALLOWED.includes((user.email ?? "").toLowerCase())) return fail("not_granted", 403);

  let body: { messages?: Turn[]; images?: Img[]; json?: boolean; tier?: string };
  try {
    body = await req.json();
  } catch {
    return fail("bad_request", 400);
  }
  const turns = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-24);
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") return fail("bad_request", 400);
  const images = (Array.isArray(body.images) ? body.images : [])
    .filter((i) => IMAGE_TYPES.includes(i?.media_type) && typeof i.data === "string")
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
