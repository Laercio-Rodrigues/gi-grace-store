import { prisma } from "./db.server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  provisionUser,
} from "./auth.server";

const STATE_COOKIE = "ksp_oauth";

function origin(request: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

/** Só aceita caminhos internos (evita open redirect). */
export function safeRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

function cookie(name: string, value: string, request: Request, maxAge: number) {
  const secure = origin(request).startsWith("https://");
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

const clearCookie = (name: string, request: Request) => cookie(name, "", request, 0);

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function googleAuthUrl(request: Request, next: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) return null;

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin(request)}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return {
    location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    cookie: cookie(STATE_COOKIE, JSON.stringify({ state, next }), request, 600),
  };
}

function fail(request: Request, message: string) {
  const headers = new Headers({ Location: `/auth?erro=${encodeURIComponent(message)}` });
  headers.append("Set-Cookie", clearCookie(STATE_COOKIE, request));
  return new Response(null, { status: 302, headers });
}

export async function handleGoogleCallback(request: Request): Promise<Response> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(request, "Login com Google não configurado.");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error") || !code || !state) {
    return fail(request, "Login com Google cancelado.");
  }

  let saved: { state: string; next: string } | null = null;
  try {
    saved = JSON.parse(readCookie(request, STATE_COOKIE) ?? "null");
  } catch {
    saved = null;
  }
  if (!saved || saved.state !== state) return fail(request, "Sessão de login expirada. Tente novamente.");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin(request)}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error("token");
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) throw new Error("userinfo");
    const info = (await infoRes.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    if (!info.email || !info.email_verified) return fail(request, "Seu e-mail do Google não foi verificado.");

    const email = info.email.toLowerCase();
    let user = await prisma.user.findFirst({
      where: { OR: [{ google_id: info.sub }, { email }] },
    });
    if (!user) {
      user = await prisma.$transaction((tx) =>
        provisionUser(tx, { email, name: info.name, avatar_url: info.picture, google_id: info.sub }),
      );
    } else if (!user.google_id) {
      user = await prisma.user.update({ where: { id: user.id }, data: { google_id: info.sub } });
    }

    const token = await createSessionToken(user.id);
    const headers = new Headers({ Location: safeRedirect(saved.next) });
    headers.append("Set-Cookie", cookie(SESSION_COOKIE, token, request, SESSION_MAX_AGE));
    headers.append("Set-Cookie", clearCookie(STATE_COOKIE, request));
    return new Response(null, { status: 302, headers });
  } catch (e) {
    console.error("[google-login]", e);
    return fail(request, "Não foi possível entrar com o Google.");
  }
}
