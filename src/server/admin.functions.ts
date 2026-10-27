import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "./middleware";

const uuid = z.string().uuid();
const nullableText = (max = 500) => z.string().max(max).nullable();
const slug = z
  .string()
  .trim()
  .min(2)
  .max(150)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: apenas letras minúsculas, números e hífens");

// ═════════════════════ CRUD genérico (banners, categorias, cupons, marcas) ═════════════════════

type FieldKind = "text" | "number" | "boolean" | "datetime";
type CrudConfig = {
  model: "banner" | "category" | "coupon" | "brand";
  types: Record<string, FieldKind>;
  required: string[];
  nullable: string[];
};

const CRUD: Record<string, CrudConfig> = {
  banners: {
    model: "banner",
    types: { title: "text", subtitle: "text", image_url: "text", link: "text", position: "number", active: "boolean" },
    required: ["title", "image_url"],
    nullable: ["subtitle", "link"],
  },
  categories: {
    model: "category",
    types: { name: "text", slug: "text", image_url: "text", position: "number", active: "boolean" },
    required: ["name", "slug"],
    nullable: ["image_url"],
  },
  coupons: {
    model: "coupon",
    types: { code: "text", discount_percent: "number", expires_at: "datetime", active: "boolean" },
    required: ["code", "discount_percent"],
    nullable: ["expires_at"],
  },
  brands: {
    model: "brand",
    types: { name: "text", slug: "text", logo_url: "text" },
    required: ["name", "slug"],
    nullable: ["logo_url"],
  },
};

const crudTable = z.enum(["banners", "categories", "coupons", "brands"]);

function coerceCrud(cfg: CrudConfig, table: string, payload: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, kind] of Object.entries(cfg.types)) {
    if (!(key in payload)) continue;
    const v = payload[key];
    let value: unknown;
    switch (kind) {
      case "text": {
        const s = v == null ? "" : String(v).trim();
        value = s === "" ? null : s;
        break;
      }
      case "number": {
        if (v === null || v === "" || v === undefined) value = null;
        else {
          const n = Number(v);
          if (!Number.isFinite(n)) throw new Error(`Valor numérico inválido em "${key}"`);
          value = Math.trunc(n);
        }
        break;
      }
      case "boolean":
        value = !!v;
        break;
      case "datetime": {
        if (!v) value = null;
        else {
          const d = new Date(String(v));
          if (Number.isNaN(d.getTime())) throw new Error(`Data inválida em "${key}"`);
          value = d;
        }
        break;
      }
    }
    if (value === null) {
      if (cfg.required.includes(key)) throw new Error(`Campo obrigatório: ${key}`);
      if (kind === "number") value = 0; // position etc.
      else if (!cfg.nullable.includes(key)) throw new Error(`Campo obrigatório: ${key}`);
    }
    out[key] = value;
  }
  if (table === "coupons") {
    if (typeof out.code === "string") out.code = out.code.toUpperCase();
    const pct = out.discount_percent as number;
    if (pct != null && (pct < 1 || pct > 100)) throw new Error("Desconto deve ficar entre 1 e 100%");
  }
  return out;
}

export const adminCrudListFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(
    z.object({ table: crudTable, orderBy: z.string().max(40).optional(), desc: z.boolean().optional() }),
  )
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { plain } = await import("./serialize.server");
    const cfg = CRUD[data.table];
    const allowed = [...Object.keys(cfg.types), "created_at"];
    const orderBy = data.orderBy && allowed.includes(data.orderBy) ? data.orderBy : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any)[cfg.model].findMany({
      ...(orderBy ? { orderBy: { [orderBy]: data.desc ? "desc" : "asc" } } : {}),
    });

    return JSON.parse(JSON.stringify(plain(rows)));

  });

export const adminCrudSaveFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(
    z.object({ table: crudTable, id: uuid.nullish(), payload: z.record(z.string(), z.unknown()) }),
  )
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { friendlyError } = await import("./serialize.server");
    const cfg = CRUD[data.table];
    try {
      const values = coerceCrud(cfg, data.table, data.payload);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delegate = (prisma as any)[cfg.model];
      if (data.id) await delegate.update({ where: { id: data.id }, data: values });
      else await delegate.create({ data: values });
      return { ok: true as const };
    } catch (e) {
      throw friendlyError(e);
    }
  });

export const adminCrudDeleteFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ table: crudTable, id: uuid }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { friendlyError } = await import("./serialize.server");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any)[CRUD[data.table].model].delete({ where: { id: data.id } });
      return { ok: true as const };
    } catch (e) {
      throw friendlyError(e);
    }
  });

// ═════════════════════ Dashboard ═════════════════════

export const adminStatsFn = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const [orders, products, userCount] = await Promise.all([
    prisma.order.findMany({
      select: { id: true, total: true, status: true, created_at: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        stock: true,
        sales_count: true,
        price: true,
        sale_price: true,
        active: true,
        images: { select: { image_url: true }, orderBy: { position: "asc" }, take: 1 },
      },
    }),
    prisma.profile.count(),
  ]);
  return { orders: plain(orders), products: plain(products), userCount };
});

// ═════════════════════ Pedidos ═════════════════════

const orderStatus = z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]);

export const adminOrdersFn = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const rows = await prisma.order.findMany({
    select: { id: true, total: true, status: true, payment_method: true, created_at: true, user_id: true },
    orderBy: { created_at: "desc" },
  });
  return plain(rows);
});

export const adminOrderFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { plain } = await import("./serialize.server");
    const row = await prisma.order.findUnique({ where: { id: data.id }, include: { items: true } });
    return row ? plain(row) : null;
  });

export const adminSetOrderStatusFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid, status: orderStatus }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { friendlyError } = await import("./serialize.server");
    try {
      await prisma.order.update({ where: { id: data.id }, data: { status: data.status } });
      return { ok: true as const };
    } catch (e) {
      throw friendlyError(e);
    }
  });

// ═════════════════════ Produtos ═════════════════════

export const adminProductsFn = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const rows = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      sale_price: true,
      stock: true,
      active: true,
      sales_count: true,
      featured: true,
      images: { select: { image_url: true, position: true }, orderBy: { position: "asc" } },
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return plain(rows);
});

export const adminSetProductFlagFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid, field: z.enum(["active", "featured"]), value: z.boolean() }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    await prisma.product.update({ where: { id: data.id }, data: { [data.field]: data.value } });
    return { ok: true as const };
  });

export const adminDeleteProductFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { friendlyError } = await import("./serialize.server");
    try {
      await prisma.product.delete({ where: { id: data.id } });
      return { ok: true as const };
    } catch (e) {
      throw friendlyError(e);
    }
  });

export const adminProductLookupsFn = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const [categories, brands, sizes] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.size.findMany({ select: { id: true, name: true, position: true }, orderBy: { position: "asc" } }),
  ]);
  return plain({ categories, brands, sizes });
});

/** Produto completo (editor e pré-preenchimento de nota fiscal). */
export const adminProductFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { plain } = await import("./serialize.server");
    const row = await prisma.product.findUnique({
      where: { id: data.id },
      include: {
        images: { select: { id: true, image_url: true, position: true }, orderBy: { position: "asc" } },
        sizes: { select: { size_id: true, stock: true } },
      },
    });
    return row ? plain(row) : null;
  });

const productPayload = z.object({
  name: z.string().trim().min(2).max(150),
  slug,
  description: nullableText(3000),
  technical_description: nullableText(3000),
  category_id: uuid.nullable(),
  brand_id: uuid.nullable(),
  price: z.number().min(0).max(1_000_000),
  sale_price: z.number().min(0).max(1_000_000).nullable(),
  stock: z.number().int().min(0).max(1_000_000),
  sku: nullableText(60),
  weight: nullableText(40),
  material: nullableText(100),
  color: nullableText(60),
  featured: z.boolean(),
  active: z.boolean(),
  ncm: nullableText(20),
  cest: nullableText(20),
  cfop: nullableText(10),
  unit: z.string().trim().min(1).max(6),
  origin: nullableText(2),
  cst: nullableText(4),
  icms_rate: z.number().min(0).max(100),
  ipi_rate: z.number().min(0).max(100),
  pis_rate: z.number().min(0).max(100),
  cofins_rate: z.number().min(0).max(100),
});

export const adminSaveProductFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(
    z.object({
      id: uuid.nullable(),
      product: productPayload,
      images: z.array(z.string().trim().min(1).max(500)).max(12),
      sizes: z
        .array(z.object({ size_id: uuid, stock: z.number().int().min(0).max(1_000_000) }))
        .max(30),
    }),
  )
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { friendlyError } = await import("./serialize.server");
    try {
      const id = await prisma.$transaction(async (tx) => {
        const saved = data.id
          ? await tx.product.update({ where: { id: data.id }, data: data.product, select: { id: true } })
          : await tx.product.create({ data: data.product, select: { id: true } });

        await tx.productImage.deleteMany({ where: { product_id: saved.id } });
        if (data.images.length) {
          await tx.productImage.createMany({
            data: data.images.map((image_url, position) => ({ product_id: saved.id, image_url, position })),
          });
        }

        await tx.productSize.deleteMany({ where: { product_id: saved.id } });
        if (data.sizes.length) {
          await tx.productSize.createMany({
            data: data.sizes.map((s) => ({ product_id: saved.id, size_id: s.size_id, stock: s.stock })),
            skipDuplicates: true,
          });
        }
        return saved.id;
      });
      return { id };
    } catch (e) {
      throw friendlyError(e);
    }
  });

// ═════════════════════ Empresa (emitente) ═════════════════════

export const adminCompanyFn = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const row = await prisma.companySettings.findFirst();
  return row ? plain(row) : null;
});

const companyPayload = z.object({
  legal_name: z.string().trim().min(2).max(150),
  trade_name: z.string().trim().max(150).optional().default(""),
  cnpj: z.string().trim().min(1).max(30),
  ie: z.string().trim().min(2).max(20),
  im: z.string().trim().max(20).optional().default(""),
  crt: z.enum(["1", "2", "3"]),
  street: z.string().trim().min(2).max(150),
  number: z.string().trim().min(1).max(15),
  complement: z.string().trim().max(60).optional().default(""),
  district: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  city_code: z.string().trim().max(10).optional().default(""),
  state: z.string().trim().min(2).max(2),
  zip_code: z.string().trim().min(8).max(12),
  phone: z.string().trim().max(20).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  nfe_series: z.string().trim().min(1).max(3),
});

export const adminSaveCompanyFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(companyPayload)
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const values = {
      ...data,
      im: data.im || null,
      complement: data.complement || null,
      city_code: data.city_code || null,
      phone: data.phone || null,
      email: data.email || null,
    };
    await prisma.companySettings.upsert({
      where: { singleton: true },
      update: values,
      create: { ...values, singleton: true },
    });
    return { ok: true as const };
  });

// ═════════════════════ Faturamento (recibos / NF-e) ═════════════════════

export const adminInvoicesFn = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const rows = await prisma.invoice.findMany({
    select: {
      id: true,
      type: true,
      number: true,
      series: true,
      status: true,
      customer_name: true,
      customer_doc: true,
      total: true,
      tax_total: true,
      payment_method: true,
      issued_at: true,
    },
    orderBy: { issued_at: "desc" },
  });
  return plain(rows);
});

export const adminInvoiceFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { plain } = await import("./serialize.server");
    const row = await prisma.invoice.findUnique({
      where: { id: data.id },
      include: { items: { orderBy: { position: "asc" } } },
    });
    return row ? plain(row) : null;
  });

export const adminSetInvoiceStatusFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid, status: z.enum(["issued", "paid", "cancelled"]) }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { friendlyError } = await import("./serialize.server");
    try {
      await prisma.invoice.update({ where: { id: data.id }, data: { status: data.status } });
      return { ok: true as const };
    } catch (e) {
      throw friendlyError(e);
    }
  });

const num = z.number().finite();
const invoiceItemPayload = z.object({
  product_id: uuid.nullish(),
  code: z.string().max(60).nullish(),
  description: z.string().trim().min(1).max(200),
  ncm: z.string().max(20).nullish(),
  cest: z.string().max(20).nullish(),
  cfop: z.string().max(10).nullish(),
  unit: z.string().min(1).max(6),
  quantity: num,
  unit_price: num,
  discount: num,
  total: num,
  origin: z.string().max(2).nullish(),
  cst: z.string().max(4).nullish(),
  icms_base: num,
  icms_rate: num,
  icms_value: num,
  ipi_rate: num,
  ipi_value: num,
  pis_rate: num,
  pis_value: num,
  cofins_rate: num,
  cofins_value: num,
});

export const adminCreateInvoiceFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(
    z.object({
      order_id: uuid.nullish(),
      type: z.enum(["receipt", "nfe"]),
      series: z.string().min(1).max(3),
      customer_name: z.string().trim().min(1).max(200),
      customer_doc: z.string().max(30).nullish(),
      customer_email: z.string().max(200).nullish(),
      products_total: num,
      shipping: num,
      discount: num,
      other_expenses: num,
      tax_total: num,
      total: num,
      payment_method: z.string().max(10).nullish(),
      notes: z.string().max(2000).nullish(),
      payload: z.record(z.string(), z.unknown()),
      items: z.array(invoiceItemPayload).min(1).max(200),
    }),
  )
  .handler(async ({ data, context }) => {
    const { prisma } = await import("./db.server");
    const { friendlyError } = await import("./serialize.server");
    const { Prisma: PrismaRuntime } = await import("@prisma/client");
    const { items, payload, ...head } = data;

    // Numeração sequencial por (tipo, série). Em caso de corrida, o índice único
    // (type, series, number) rejeita a duplicata e tentamos de novo.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const id = await prisma.$transaction(async (tx) => {
          const last = await tx.invoice.aggregate({
            where: { type: head.type, series: head.series },
            _max: { number: true },
          });
          const inv = await tx.invoice.create({
            data: {
              ...head,
              number: (last._max.number ?? 0) + 1,
              order_id: head.order_id ?? null,
              payload: payload as Prisma.InputJsonValue,
              created_by: context.user.id,
              items: {
                create: items.map((it, position) => ({ ...it, product_id: it.product_id ?? null, position })),
              },
            },
            select: { id: true },
          });
          return inv.id;
        });
        return { id };
      } catch (e) {
        const isDup = e instanceof PrismaRuntime.PrismaClientKnownRequestError && e.code === "P2002";
        if (isDup && attempt < 3) continue;
        throw friendlyError(e);
      }
    }
    throw new Error("Não foi possível gerar o número do documento. Tente novamente.");
  });

// ═════════════════════ Boletos (contas a pagar) ═════════════════════

export const adminBillsFn = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain, ymd } = await import("./serialize.server");
  const rows = await prisma.bill.findMany({ orderBy: { due_date: "asc" } });
  // due_date / paid_at são colunas DATE: o front espera "YYYY-MM-DD"
  return rows.map(({ due_date, paid_at, ...rest }) => ({
    ...plain(rest),
    due_date: ymd(due_date) as string,
    paid_at: ymd(paid_at),
  }));
});

export const adminCreateBillFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(
    z.object({
      description: z.string().trim().min(2).max(150),
      supplier: z.string().trim().min(2).max(120),
      category: z.string().max(60).nullish(),
      amount: z.number().positive().max(10_000_000),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
      barcode: z.string().max(60).nullish(),
      attachment_url: z.string().max(500).nullish(),
      notes: z.string().max(2000).nullish(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { prisma } = await import("./db.server");
    const { parseYmd } = await import("./serialize.server");
    await prisma.bill.create({
      data: {
        description: data.description,
        supplier: data.supplier,
        category: data.category || null,
        amount: data.amount,
        due_date: parseYmd(data.due_date)!,
        barcode: data.barcode || null,
        attachment_url: data.attachment_url || null,
        notes: data.notes || null,
        created_by: context.user.id,
      },
    });
    return { ok: true as const };
  });

export const adminUpdateBillFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(
    z.object({
      id: uuid,
      status: z.enum(["pending", "paid", "cancelled"]).optional(),
      paid_at: z.string().nullable().optional(),
      paid_amount: z.number().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { parseYmd, friendlyError } = await import("./serialize.server");
    try {
      await prisma.bill.update({
        where: { id: data.id },
        data: {
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.paid_at !== undefined ? { paid_at: parseYmd(data.paid_at) } : {}),
          ...(data.paid_amount !== undefined ? { paid_amount: data.paid_amount } : {}),
        },
      });
      return { ok: true as const };
    } catch (e) {
      throw friendlyError(e);
    }
  });

export const adminDeleteBillFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    await prisma.bill.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

// ═════════════════════ Contas bancárias de recebimento ═════════════════════

export const adminAccountsFn = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const rows = await prisma.paymentAccount.findMany({
    orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
  });
  return plain(rows);
});

export const adminCreateAccountFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(
    z.object({
      label: z.string().trim().min(2).max(80),
      bank_name: z.string().trim().min(2).max(80),
      bank_code: z.string().max(10).nullish(),
      agency: z.string().max(20).nullish(),
      account_number: z.string().max(30).nullish(),
      account_type: z.enum(["corrente", "poupanca", "pagamento"]),
      holder_name: z.string().trim().min(2).max(120),
      holder_doc: z.string().max(30).nullish(),
      pix_key_type: z.string().max(20).nullish(),
      pix_key: z.string().max(120).nullish(),
      notes: z.string().max(500).nullish(),
    }),
  )
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    await prisma.paymentAccount.create({
      data: {
        ...data,
        bank_code: data.bank_code || null,
        agency: data.agency || null,
        account_number: data.account_number || null,
        holder_doc: data.holder_doc || null,
        pix_key_type: data.pix_key ? (data.pix_key_type ?? null) : null,
        pix_key: data.pix_key || null,
        notes: data.notes || null,
      },
    });
    return { ok: true as const };
  });

export const adminMakeDefaultAccountFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const { friendlyError } = await import("./serialize.server");
    try {
      await prisma.$transaction([
        prisma.paymentAccount.updateMany({ where: { is_default: true }, data: { is_default: false } }),
        prisma.paymentAccount.update({ where: { id: data.id }, data: { is_default: true, active: true } }),
      ]);
      return { ok: true as const };
    } catch (e) {
      throw friendlyError(e);
    }
  });

export const adminToggleAccountFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const acc = await prisma.paymentAccount.findUnique({ where: { id: data.id } });
    if (!acc) throw new Error("Registro não encontrado.");
    if (acc.is_default && acc.active) {
      throw new Error("Escolha outro banco como principal antes de desativar este");
    }
    await prisma.paymentAccount.update({ where: { id: data.id }, data: { active: !acc.active } });
    return { ok: true as const };
  });

export const adminDeleteAccountFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    const acc = await prisma.paymentAccount.findUnique({ where: { id: data.id } });
    if (!acc) throw new Error("Registro não encontrado.");
    if (acc.is_default) throw new Error("Não é possível excluir a conta principal");
    await prisma.paymentAccount.delete({ where: { id: data.id } });
    return { ok: true as const };
  });

// ═════════════════════ Equipe / administradores ═════════════════════

export const adminInvitesFn = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const rows = await prisma.adminInvite.findMany({
    select: { id: true, email: true, name: true, note: true, is_admin: true, user_id: true, created_at: true },
    orderBy: { created_at: "desc" },
  });
  return plain(rows);
});

export const adminAuditFn = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { prisma } = await import("./db.server");
  const { plain } = await import("./serialize.server");
  const rows = await prisma.roleAudit.findMany({ orderBy: { created_at: "desc" }, take: 20 });
  return plain(rows);
});

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const adminUpsertInviteFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(
    z.object({
      email: z.string().max(254),
      name: z.string().max(120).nullish(),
      note: z.string().max(200).nullish(),
      make_admin: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { prisma } = await import("./db.server");
    const { friendlyError } = await import("./serialize.server");

    const email = data.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("E-mail inválido");
    const name = data.name?.trim() || null;
    const note = data.note?.trim() || null;
    const actor = context.user.id;

    try {
      await prisma.$transaction(async (tx) => {
        const profile = await tx.profile.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          select: { id: true },
        });
        const userId = profile?.id ?? null;

        const existing = await tx.adminInvite.findUnique({ where: { email } });
        if (existing) {
          await tx.adminInvite.update({
            where: { id: existing.id },
            data: {
              name: name ?? existing.name,
              note: note ?? existing.note,
              is_admin: data.make_admin,
              user_id: userId ?? existing.user_id,
            },
          });
        } else {
          await tx.adminInvite.create({
            data: { email, name, note, is_admin: data.make_admin, user_id: userId, invited_by: actor },
          });
        }

        if (!userId) return; // a pessoa ainda não tem conta: o acesso é aplicado no cadastro

        if (data.make_admin) {
          await tx.userRole.upsert({
            where: { user_id_role: { user_id: userId, role: "admin" } },
            update: {},
            create: { user_id: userId, role: "admin" },
          });
          await tx.roleAudit.create({
            data: { target_user_id: userId, actor_user_id: actor, action: "grant", role: "admin" },
          });
        } else {
          if (userId === actor) {
            throw new Error("Você não pode remover o seu próprio acesso de administrador");
          }
          const admins = await tx.userRole.count({ where: { role: "admin" } });
          if (admins <= 1) throw new Error("A loja precisa de pelo menos um administrador");
          await tx.userRole.deleteMany({ where: { user_id: userId, role: "admin" } });
          await tx.roleAudit.create({
            data: { target_user_id: userId, actor_user_id: actor, action: "revoke", role: "admin" },
          });
        }
      });
      return { ok: true as const };
    } catch (e) {
      throw friendlyError(e);
    }
  });

export const adminDeleteInviteFn = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .validator(z.object({ id: uuid }))
  .handler(async ({ data }) => {
    const { prisma } = await import("./db.server");
    await prisma.adminInvite.delete({ where: { id: data.id } });
    return { ok: true as const };
  });
