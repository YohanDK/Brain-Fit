// Notifications Web Push sans dépendance : clés VAPID (RFC 8292) et chiffrement du message (RFC 8291, aes128gcm).
// Tout passe par WebCrypto, donc le même code tourne dans Supabase (Deno) et dans Node pour les tests.

export type Abonnement = { endpoint: string; p256dh: string; auth: string };
export type ClesVapid = { publique: string; privee: JsonWebKey };

const enc = new TextEncoder();

export function b64url(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function deB64url(s: string): Uint8Array {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "===".slice((t.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}

// une paire de clés VAPID : la publique (format brut, base64url) va au navigateur, la privée reste en base
export async function nouvellesCles(): Promise<ClesVapid> {
  const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return {
    publique: b64url(await crypto.subtle.exportKey("raw", k.publicKey)),
    privee: await crypto.subtle.exportKey("jwk", k.privateKey),
  };
}

// en-tête Authorization signé, valable 12 h, pour le service de notifications de l'abonnement
export async function enteteVapid(endpoint: string, cles: ClesVapid, contact: string): Promise<string> {
  const head = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64url(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: contact,
  })));
  const key = await crypto.subtle.importKey("jwk", cles.privee, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body));
  return `vapid t=${head}.${body}.${b64url(sig)}, k=${cles.publique}`;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, bytes * 8));
}

// chiffre le message pour le seul navigateur abonné (seul lui a la clé privée correspondante)
export async function chiffrer(sub: Abonnement, message: string): Promise<Uint8Array> {
  const uaPub = deB64url(sub.p256dh), authSecret = deB64url(sub.auth);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode("WebPush: info\0"), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const clair = concat(enc.encode(message), new Uint8Array([2])); // 2 : dernier (et seul) bloc
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, clair));
  const rs = new Uint8Array([0, 0, 16, 0]); // taille de bloc : 4096
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, chiffre);
}

// envoie une notification ; renvoie le code HTTP du service (404 ou 410 : abonnement disparu)
export async function envoyer(sub: Abonnement, message: string, cles: ClesVapid, contact: string): Promise<number> {
  const r = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await enteteVapid(sub.endpoint, cles, contact),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(6 * 3600), // un rappel qui arrive après six heures n'a plus de sens
      Urgency: "normal",
    },
    body: await chiffrer(sub, message),
  });
  await r.body?.cancel();
  return r.status;
}
