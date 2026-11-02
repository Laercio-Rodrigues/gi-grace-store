import { createFileRoute } from "@tanstack/react-router";

// Recebe os avisos de pagamento do Mercado Pago (configurar em Suas integrações > Webhooks).
export const Route = createFileRoute("/api/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleMpWebhook } = await import("@/server/mercadopago.server");
        return handleMpWebhook(request);
      },
    },
  },
});
