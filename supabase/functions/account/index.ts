// Efface le compte Néophyte de la personne connectée : ses captures, ses progrès, sa place dans un cercle, puis le compte lui-même.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!user) return reply({ error: "not_granted" }, 403);

  // les captures envoyées avec « Signaler un problème » ne partent pas d'elles-mêmes : on les efface d'abord
  try {
    const bucket = admin.storage.from("retours");
    for (let i = 0; i < 50; i++) {
      const { data: files } = await bucket.list(user.id, { limit: 100 });
      if (!files?.length) break;
      const { error } = await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
      if (error) throw error;
    }
  } catch (e) {
    console.error(e); // dossier absent (retours.sql pas encore lancé) ou panne : on efface quand même le compte
  }

  // les lignes de docs, circle_members, signalements et retours partent avec le compte (on delete cascade)
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(error);
    return reply({ error: "error" }, 500);
  }
  return reply({ ok: true }, 200);
});
