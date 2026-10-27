import { createFileRoute } from "@tanstack/react-router";

// Retorno do Google: troca o code por dados do usuário, cria/vincula a conta e abre a sessão.
export const Route = createFileRoute("/api/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleGoogleCallback } = await import("@/server/google.server");
        return handleGoogleCallback(request);
      },
    },
  },
});
