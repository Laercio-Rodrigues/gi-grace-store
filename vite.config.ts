import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// O Nitro gera o servidor Node (.output/server/index.mjs) usado pelo Docker.
// Sem plataforma detectada (Vercel, Netlify...), o preset padrão é "node-server".
// Para forçar: NITRO_PRESET=node-server npm run build
export default defineConfig(({ command }) => ({
  server: { host: "0.0.0.0", port: 3000 },
  resolve: { dedupe: ["react", "react-dom", "@tanstack/react-router"] },
  plugins: [
    tsConfigPaths(),
    tanstackStart({
      // Usa src/server.ts como entrada do servidor (wrapper de erros SSR).
      server: { entry: "server" },
    }),
    ...(command === "build" ? [nitro()] : []),
    viteReact(),
    tailwindcss(),
  ],
}));
