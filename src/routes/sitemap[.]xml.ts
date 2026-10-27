import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE_URL as BASE_URL } from "@/lib/site";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/produtos", changefreq: "daily", priority: "0.9" },
          { path: "/guia-faixas", changefreq: "monthly", priority: "0.7" },
          { path: "/carrinho", changefreq: "monthly", priority: "0.3" },
          { path: "/auth", changefreq: "monthly", priority: "0.3" },
        ];

        const { prisma } = await import("@/server/db.server");
        const [products, cats] = await Promise.all([
          prisma.product.findMany({ where: { active: true }, select: { slug: true } }),
          prisma.category.findMany({ where: { active: true }, select: { slug: true } }),
        ]);


        const entries = [
          ...staticEntries,
          ...(cats ?? []).map((c) => ({
            path: `/produtos?categoria=${c.slug}`,
            changefreq: "weekly",
            priority: "0.7",
          })),
          ...(products ?? []).map((p) => ({
            path: `/produto/${p.slug}`,
            changefreq: "weekly",
            priority: "0.6",
          })),
        ];

        const urls = entries
          .map(
            (e) => `  <url>
    <loc>${BASE_URL}${e.path}</loc>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
