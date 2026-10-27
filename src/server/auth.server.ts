import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { getCookie, getRequest } from "@tanstack/react-start/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db.server";

export const SESSION_COOKIE = "ksp_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET não configurado (mínimo 16 caracteres). Veja o .env.example.");
  }
  return new TextEncoder().encode(s);
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export async function createSessionToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

async function userIdFromToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** true quando a requisição chegou por HTTPS (inclusive atrás de proxy reverso). */
export function isSecureRequest(): boolean {
  try {
    const req = getRequest();
    if (req.headers.get("x-forwarded-proto")?.split(",")[0].trim() === "https") return true;
    return new URL(req.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export const sessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isSecureRequest(),
  path: "/",
  maxAge: SESSION_MAX_AGE,
});

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
};

/** Usuário logado (ou null). Consulta o banco a cada chamada: revogar admin tem efeito imediato. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const userId = await userIdFromToken(getCookie(SESSION_COOKIE));
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      profile: { select: { name: true } },
      roles: { where: { role: "admin" }, select: { id: true }, take: 1 },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.profile?.name ?? null,
    is_admin: user.roles.length > 0,
  };
}

type Tx = Prisma.TransactionClient;

/**
 * Cria usuário + perfil + papel "customer" e aplica convite de admin pendente
 * (equivalente ao antigo trigger handle_new_user).
 */
export async function provisionUser(
  tx: Tx,
  input: {
    email: string;
    name?: string | null;
    avatar_url?: string | null;
    password_hash?: string | null;
    google_id?: string | null;
  },
) {
  const email = input.email.trim().toLowerCase();
  const user = await tx.user.create({
    data: {
      email,
      password_hash: input.password_hash ?? null,
      google_id: input.google_id ?? null,
    },
  });
  await tx.profile.create({
    data: {
      id: user.id,
      name: input.name?.trim() || email.split("@")[0],
      email,
      avatar_url: input.avatar_url ?? null,
    },
  });
  await tx.userRole.create({ data: { user_id: user.id, role: "customer" } });

  const invite = await tx.adminInvite.findUnique({ where: { email } });
  if (invite) {
    await tx.adminInvite.update({ where: { id: invite.id }, data: { user_id: user.id } });
    if (invite.is_admin) {
      await tx.userRole.upsert({
        where: { user_id_role: { user_id: user.id, role: "admin" } },
        update: {},
        create: { user_id: user.id, role: "admin" },
      });
      await tx.roleAudit.create({
        data: { target_user_id: user.id, actor_user_id: null, action: "grant", role: "admin" },
      });
    }
  }
  return user;
}

// Limitador simples (em memória) para tentativas de login por e-mail.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function assertLoginAllowed(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  }
}
export function registerLoginFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}
export const clearLoginFailures = (key: string) => void attempts.delete(key);
