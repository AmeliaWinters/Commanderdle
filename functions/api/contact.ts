import { rateLimitOk, clientIp, type RateLimitDB } from "./rateLimit";

export interface ContactEnv {
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  STATS_DB?: RateLimitDB;
}

type Ctx = { request: Request; env: ContactEnv };

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT = 5;
const RATE_WINDOW_SEC = 60 * 60;

export const onRequest = async (ctx: Ctx): Promise<Response> => {
  const { request, env } = ctx;
  if (request.method.toUpperCase() !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    return json({ error: "contact unavailable" }, 503);
  }

  let body: {
    name?: unknown;
    email?: unknown;
    message?: unknown;
    website?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true });
  }

  const name =
    typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  const email =
    typeof body.email === "string" ? body.email.trim().slice(0, 320) : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (message.length < 1 || message.length > 5000) {
    return json({ error: "message required" }, 400);
  }
  if (email && !EMAIL_RE.test(email)) {
    return json({ error: "invalid email" }, 400);
  }

  if (env.STATS_DB) {
    const ok = await rateLimitOk(
      env.STATS_DB,
      `contact:${clientIp(request)}`,
      RATE_LIMIT,
      RATE_WINDOW_SEC,
    );
    if (!ok)
      return json({ error: "too many messages, please try again later" }, 429);
  }

  const from = name || email || "a Commandle visitor";
  const text =
    `New message from the Commandle contact form.\n\n` +
    `Name:  ${name || "(not given)"}\n` +
    `Email: ${email || "(not given)"}\n\n` +
    `${message}\n`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: env.CONTACT_TO,
      ...(email && EMAIL_RE.test(email) ? { reply_to: email } : {}),
      subject: `Commandle contact from ${from}`,
      text,
    }),
  });

  if (!res.ok) {
    return json({ error: "send failed" }, 502);
  }

  return json({ ok: true });
};
