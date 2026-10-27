/** URL pública do site (SEO: canonical, og:url, sitemap). Defina VITE_SITE_URL no .env. */
export const SITE_URL: string = (
  (import.meta.env.VITE_SITE_URL as string | undefined) || "http://localhost:3000"
).replace(/\/$/, "");
