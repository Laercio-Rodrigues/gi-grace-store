import { createMiddleware } from "@tanstack/react-start";

/** Exige usuário logado. Injeta `context.user`. */
export const requireUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { getSessionUser } = await import("./auth.server");
  const user = await getSessionUser();
  if (!user) throw new Error("Você precisa estar logado.");
  return next({ context: { user } });
});

/** Exige usuário administrador. */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireUser])
  .server(async ({ next, context }) => {
    if (!context.user.is_admin) throw new Error("Acesso negado");
    return next();
  });
