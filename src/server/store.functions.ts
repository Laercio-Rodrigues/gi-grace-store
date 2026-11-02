import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireUser } from "./middleware";

// ───────────── Catálogo público ─────────────

const listSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  sale_price: true,
  color: true,
  featured: true,
  sales_count: true,
  created_at: true,
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { select: { image_url: true, position: true }, orderBy: { position: "asc" } },
} satisfies Prisma.ProductSelect;

export const fetchProductsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const rows = await prisma.product.findMany({
    where: { active: true },
    select: listSelect,
    orderBy: { sales_count: "desc" },
  });
  return plain(rows);
});

export const fetchFeaturedFn = createServerFn({ method: "POST" }).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const rows = await prisma.product.findMany({
    where: { active: true, featured: true },
    select: listSelect,
    take: 8,
  });
  return plain(rows);
});

export const fetchCategoriesFn = createServerFn({ method: "POST" }).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const rows = await prisma.category.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true, image_url: true, position: true },
    orderBy: { position: "asc" },
  });
  return plain(rows);
});

export const fetchBrandsFn = createServerFn({ method: "POST" }).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const rows = await prisma.brand.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
  return plain(rows);
});

export const fetchBannersFn = createServerFn({ method: "POST" }).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const rows = await prisma.banner.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
  });
  return plain(rows);
});

export const fetchProductBySlugFn = createServerFn({ method: "POST" })
  .validator(z.object({ slug: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { plain } = await import("./serialize.server");
    const row = await prisma.product.findFirst({
      where: { slug: data.slug, active: true },
      include: {
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        images: { select: { image_url: true, position: true }, orderBy: { position: "asc" } },
        sizes: {
          select: { stock: true, size: { select: { id: true, name: true, position: true } } },
        },
      },
    });
    return row ? plain(row) : null;
  });

// ───────────── Cupom ─────────────

export const validateCouponFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ code: z.string().trim().min(1).max(60) }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const c = await prisma.coupon.findFirst({
      where: {
        code: { equals: data.code, mode: "insensitive" },
        active: true,
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
      select: { code: true, discount_percent: true },
    });
    return c;
  });

// ───────────── Favoritos ─────────────

export const listFavoritesFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { prisma } = await import("./db.server");
    const { plain } = await import("./serialize.server");
    const rows = await prisma.favorite.findMany({
      where: { user_id: context.user.id },
      select: {
        id: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            sale_price: true,
            images: { select: { image_url: true, position: true }, orderBy: { position: "asc" } },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
    return plain(rows);
  });

export const addFavoriteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ product_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { prisma } = await import("./db.server");
    // idempotente: favoritar duas vezes não gera erro
    await prisma.favorite.upsert({
      where: { user_id_product_id: { user_id: context.user.id, product_id: data.product_id } },
      update: {},
      create: { user_id: context.user.id, product_id: data.product_id },
    });
    return { ok: true as const };
  });

export const removeFavoriteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { prisma } = await import("./db.server");
    await prisma.favorite.deleteMany({ where: { id: data.id, user_id: context.user.id } });
    return { ok: true as const };
  });

// ───────────── Conta do cliente ─────────────

export const getProfileFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { prisma } = await import("./db.server");
    const { plain } = await import("./serialize.server");
    const p = await prisma.profile.findUnique({ where: { id: context.user.id } });
    return p ? plain(p) : null;
  });

export const updateProfileFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({ name: z.string().trim().max(120), phone: z.string().trim().max(30) }),
  )
  .handler(async ({ data, context }) => {
    const { prisma } = await import("./db.server");
    await prisma.profile.update({
      where: { id: context.user.id },
      data: { name: data.name || null, phone: data.phone || null },
    });
    return { ok: true as const };
  });

export const listMyOrdersFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { prisma } = await import("./db.server");
    const { plain } = await import("./serialize.server");
    const rows = await prisma.order.findMany({
      where: { user_id: context.user.id },
      select: {
        id: true,
        status: true,
        total: true,
        created_at: true,
        payment_status: true,
        payment_method: true,
        payment_url: true,
        items: {
          select: {
            product_name: true,
            product_image: true,
            quantity: true,
            price: true,
            size_name: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
    return plain(rows);
  });

// ───────────── Pedido ─────────────

const addressSchema = z.object({
  street: z.string().trim().min(3).max(120),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(80).optional().or(z.literal("")),
  district: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(40),
  zip_code: z.string().trim().min(8).max(12),
});

export const createOrderFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      items: z
        .array(
          z.object({
            product_id: z.string().uuid(),
            size_name: z.string().trim().max(20).nullable().optional(),
            quantity: z.number().int(),
          }),
        )
        .min(1, "Carrinho vazio")
        .max(50, "Muitos itens no pedido"),
      address: addressSchema,
      payment_method: z.enum(["online", "cash"], {
        errorMap: () => ({ message: "Forma de pagamento inválida" }),
      }),
      coupon: z.string().trim().max(60).nullable().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { prisma } = await import("./db.server");
    const { friendlyError } = await import("./serialize.server");
    const { Prisma: PrismaRuntime } = await import("@prisma/client");
    const mp = await import("./mercadopago.server");
    const Decimal = PrismaRuntime.Decimal;

    if (data.payment_method === "online" && !mp.mpEnabled()) {
      throw new Error("Pagamento online indisponível no momento.");
    }
    if (data.payment_method === "cash" && !mp.cashEnabled()) {
      throw new Error("Pagamento na loja indisponível.");
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        let payUrl: string | null = null;
        const order = await tx.order.create({
          data: {
            user_id: context.user.id,
            status: "pending",
            subtotal: 0,
            shipping: 0,
            discount: 0,
            total: 0,
            payment_method: data.payment_method === "online" ? "mercadopago" : "cash",
            address_json: data.address,
          },
        });

        let subtotal = new Decimal(0);

        for (const it of data.items) {
          if (it.quantity < 1 || it.quantity > 20) throw new Error("Quantidade inválida");
          const sizeName = it.size_name?.trim() || null;

          const product = await tx.product.findFirst({ where: { id: it.product_id, active: true } });
          if (!product) throw new Error("Produto indisponível");

          const unit = product.sale_price ?? product.price;

          if (sizeName) {
            const ps = await tx.productSize.findFirst({
              where: { product_id: product.id, size: { name: sizeName } },
            });
            if (!ps) throw new Error(`Tamanho indisponível para ${product.name}`);
            // baixa atômica: só atualiza se ainda houver estoque suficiente
            const upd = await tx.productSize.updateMany({
              where: { id: ps.id, stock: { gte: it.quantity } },
              data: { stock: { decrement: it.quantity } },
            });
            if (upd.count === 0) {
              throw new Error(`Estoque insuficiente para ${product.name} (${sizeName})`);
            }
            await tx.$executeRaw`UPDATE "products" SET "stock" = GREATEST(0, "stock" - ${it.quantity}), "sales_count" = "sales_count" + ${it.quantity} WHERE "id" = ${product.id}::uuid`;
          } else {
            const upd = await tx.product.updateMany({
              where: { id: product.id, stock: { gte: it.quantity } },
              data: { stock: { decrement: it.quantity }, sales_count: { increment: it.quantity } },
            });
            if (upd.count === 0) throw new Error(`Estoque insuficiente para ${product.name}`);
          }

          const img = await tx.productImage.findFirst({
            where: { product_id: product.id },
            orderBy: { position: "asc" },
            select: { image_url: true },
          });

          await tx.orderItem.create({
            data: {
              order_id: order.id,
              product_id: product.id,
              product_name: product.name,
              product_image: img?.image_url ?? null,
              size_name: sizeName,
              quantity: it.quantity,
              price: unit,
            },
          });

          subtotal = subtotal.add(new Decimal(unit).mul(it.quantity));
        }

        let discount = new Decimal(0);
        if (data.coupon && data.coupon.trim()) {
          const coupon = await tx.coupon.findFirst({
            where: {
              code: { equals: data.coupon.trim(), mode: "insensitive" },
              active: true,
              OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
            },
          });
          if (coupon) discount = subtotal.mul(coupon.discount_percent).div(100).toDecimalPlaces(2);
        }

        const shipping = subtotal.gt(499) ? new Decimal(0) : new Decimal("39.90");
        const afterDiscount = subtotal.sub(discount);
        const total = (afterDiscount.lt(0) ? new Decimal(0) : afterDiscount).add(shipping);

        await tx.order.update({
          where: { id: order.id },
          data: { subtotal, shipping, discount, total },
        });

        // Cobrança no Mercado Pago. Se falhar, a transação inteira é desfeita
        // (pedido e baixa de estoque), então não sobra pedido "fantasma".
        if (data.payment_method === "online") {
          const pref = await mp.createPreference({
            orderId: order.id,
            total: total.toNumber(),
            email: context.user.email,
          });
          payUrl = pref.url;
          await tx.order.update({
            where: { id: order.id },
            data: { payment_url: pref.url, mp_preference_id: pref.id },
          });
        }

        return { id: order.id, url: payUrl };
      }, { maxWait: 10_000, timeout: 30_000 });
      return { id: result.id, payment_url: result.url };
    } catch (e) {
      throw friendlyError(e);
    }
  });

// ───────────── Pagamento ─────────────

/** Formas de pagamento disponíveis (definidas por variáveis de ambiente no servidor). */
export const getPaymentConfigFn = createServerFn({ method: "POST" }).handler(async () => {
  const mp = await import("./mercadopago.server");
  return {
    online: mp.mpEnabled(),
    cash: mp.cashEnabled(),
    max_installments: mp.maxInstallments(),
  };
});

/** Confere no Mercado Pago o pagamento de um pedido do próprio usuário (ao voltar do checkout). */
export const syncOrderPaymentFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ order_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const mp = await import("./mercadopago.server");
    try {
      await mp.syncOrderPayment(data.order_id, context.user.id);
    } catch (e) {
      console.error("[mercadopago] sync", e);
    }
    return { ok: true as const };
  });
