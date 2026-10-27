import { createFileRoute } from "@tanstack/react-router";

// Inicia o login com Google (OAuth 2.0 – authorization code).
export const Route = createFileRoute("/api/auth/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { googleAuthUrl, safeRedirect } = await import("@/server/google.server");
        const url = new URL(request.url);
        const next = safeRedirect(url.searchParams.get("redirect"));
        const result = googleAuthUrl(request, next);
        if (!result) return new Response("Login com Google não configurado.", { status: 404 });
        return new Response(null, {
          status: 302,
          headers: { Location: result.location, "Set-Cookie": result.cookie },
        });
      },
    },
  },
});
