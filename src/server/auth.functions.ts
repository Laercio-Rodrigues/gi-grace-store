import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(254);

/** Sessão atual (cookie httpOnly). Não expõe nada sensível. */
export const getSessionFn = createServerFn({ method: "POST" }).handler(async () => {
  const { getSessionUser } = await import("./auth.server");
  const u = await getSessionUser();
  return u
    ? { user: { id: u.id, email: u.email, name: u.name }, is_admin: u.is_admin }
    : { user: null, is_admin: false };
});

/** Recursos de login habilitados no servidor. */
export const getAuthConfigFn = createServerFn({ method: "POST" }).handler(async () => ({
  google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
}));

export const signUpFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(1, "Informe seu nome").max(100),
      email: emailSchema,
      password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres").max(72),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await import("./auth.server");
    const { prisma } = await import("./db.server");
    const { friendlyError } = await import("./serialize.server");

    const exists = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (exists) throw new Error("Este e-mail já tem conta. Faça login.");

    const password_hash = await auth.hashPassword(data.password);
    let user;
    try {
      user = await prisma.$transaction((tx) =>
        auth.provisionUser(tx, { email: data.email, name: data.name, password_hash }),
      );
    } catch (e) {
      throw friendlyError(e);
    }

    setCookie(auth.SESSION_COOKIE, await auth.createSessionToken(user.id), auth.sessionCookieOptions());
    return { ok: true as const };
  });

export const signInFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: emailSchema, password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const auth = await import("./auth.server");
    const { prisma } = await import("./db.server");

    auth.assertLoginAllowed(data.email);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    const valid =
      !!user?.password_hash && (await auth.verifyPassword(data.password, user.password_hash));
    if (!user || !valid) {
      auth.registerLoginFailure(data.email);
      throw new Error("E-mail ou senha incorretos.");
    }

    auth.clearLoginFailures(data.email);
    setCookie(auth.SESSION_COOKIE, await auth.createSessionToken(user.id), auth.sessionCookieOptions());
    return { ok: true as const };
  });

export const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { SESSION_COOKIE } = await import("./auth.server");
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { ok: true as const };
});
