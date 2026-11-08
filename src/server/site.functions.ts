import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./middleware";
import {
  EMAIL_RE,
  normalizeInstagram,
  normalizeWhatsapp,
  normalizeYoutube,
} from "@/lib/social";

// ───────────── Público ─────────────

/** Redes sociais e contato exibidos no rodapé. */
export const getSiteSettingsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { prisma } = await import("./db.server");
  const s = await prisma.siteSettings.findFirst({
    select: {
      instagram_url: true,
      youtube_url: true,
      whatsapp_number: true,
      whatsapp_message: true,
      contact_email: true,
    },
  });
  return (
    s ?? {
      instagram_url: null,
      youtube_url: null,
      whatsapp_number: null,
      whatsapp_message: null,
      contact_email: null,
    }
  );
});

// limitador simples por e-mail (em memória) contra repetição/abuso
const recent = new Map<string, number>();

export const subscribeNewsletterFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().toLowerCase().max(254) }))
  .handler(async ({ data }) => {
    if (!EMAIL_RE.test(data.email)) throw new Error("Informe um e-mail válido.");
    const now = Date.now();
    if ((recent.get(data.email) ?? 0) > now - 10_000) return { ok: true as const };
    recent.set(data.email, now);

    const { prisma } = await import("./db.server");
    // idempotente: e-mail repetido não gera erro
    await prisma.newsletterSubscriber.upsert({
      where: { email: data.email },
      update: {},
      create: { email: data.email },
    });
    return { ok: true as const };
  });

// ───────────── Admin ─────────────

export const adminSiteSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { prisma } = await import("./db.server");
    const s = await prisma.siteSettings.findFirst();
    return {
      instagram_url: s?.instagram_url ?? "",
      youtube_url: s?.youtube_url ?? "",
      whatsapp_number: s?.whatsapp_number ?? "",
      whatsapp_message: s?.whatsapp_message ?? "",
      contact_email: s?.contact_email ?? "",
    };
  });

export const adminSaveSiteSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    z.object({
      instagram_url: z.string().max(300),
      youtube_url: z.string().max(300),
      whatsapp_number: z.string().max(40),
      whatsapp_message: z.string().max(300),
      contact_email: z.string().max(254),
    }),
  )
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");

    const instagram = normalizeInstagram(data.instagram_url);
    if (instagram === null) throw new Error("Instagram inválido. Use @perfil ou o link do seu perfil.");
    const youtube = normalizeYoutube(data.youtube_url);
    if (youtube === null) throw new Error("YouTube inválido. Use @canal ou o link do seu canal.");
    const whatsapp = normalizeWhatsapp(data.whatsapp_number);
    if (whatsapp === null) throw new Error("WhatsApp inválido. Informe DDD + número (ex.: 66 99999-9999).");
    const email = data.contact_email.trim().toLowerCase();
    if (email && !EMAIL_RE.test(email)) throw new Error("E-mail de contato inválido.");

    const values = {
      instagram_url: instagram || null,
      youtube_url: youtube || null,
      whatsapp_number: whatsapp || null,
      whatsapp_message: data.whatsapp_message.trim() || null,
      contact_email: email || null,
    };
    await prisma.siteSettings.upsert({
      where: { singleton: true },
      update: values,
      create: { ...values, singleton: true },
    });
    return { ok: true as const, ...values };
  });

export const adminSubscribersFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { prisma } = await import("./db.server");
    const { plain } = await import("./serialize.server");
    const [rows, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({ orderBy: { created_at: "desc" }, take: 500 }),
      prisma.newsletterSubscriber.count(),
    ]);
    return { total, rows: plain(rows) };
  });

export const adminDeleteSubscriberFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    await prisma.newsletterSubscriber.deleteMany({ where: { id: data.id } });
    return { ok: true as const };
  });
