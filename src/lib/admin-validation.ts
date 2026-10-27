import { z } from "zod";

/** Regras de validação reutilizáveis no painel admin. */

export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const imageRefSchema = z
  .string()
  .trim()
  .max(500, "Máximo de 500 caracteres")
  .refine(
    (v) => v.startsWith("asset:") || /^https?:\/\/\S+$/i.test(v) || v.startsWith("/"),
    "Use uma URL http(s), um caminho iniciado com / ou asset:chave",
  );

export const linkSchema = z
  .string()
  .trim()
  .max(500, "Máximo de 500 caracteres")
  .refine((v) => /^https?:\/\/\S+$/i.test(v) || v.startsWith("/"), "Informe uma URL válida ou caminho interno");

export type FieldRule = {
  /** Máximo de caracteres (text) ou valor máximo (number). */
  max?: number;
  /** Mínimo de caracteres (text) ou valor mínimo (number). */
  min?: number;
  /** Aceita apenas inteiros (number). */
  int?: boolean;
  /** Validação especializada. */
  format?: "slug" | "url" | "image" | "coupon";
};

type BuildField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "datetime";
  required?: boolean;
  rule?: FieldRule;
};

function textSchema(f: BuildField) {
  const rule = f.rule ?? {};
  switch (rule.format) {
    case "slug":
      return z.string().trim().min(1).max(rule.max ?? 120).regex(slugRegex, "Use apenas letras minúsculas, números e hífens");
    case "coupon":
      return z
        .string()
        .trim()
        .min(3, "Mínimo de 3 caracteres")
        .max(rule.max ?? 30)
        .regex(/^[A-Z0-9-]+$/, "Use apenas letras maiúsculas, números e hífens");
    case "url":
      return linkSchema;
    case "image":
      return imageRefSchema;
    default:
      return z
        .string()
        .trim()
        .min(rule.min ?? 1, `Mínimo de ${rule.min ?? 1} caractere(s)`)
        .max(rule.max ?? 200, `Máximo de ${rule.max ?? 200} caracteres`);
  }
}

/** Valida um registro do CRUD genérico. Retorna erros por campo. */
export function validateCrudRow(
  fields: BuildField[],
  row: Record<string, unknown>,
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const f of fields) {
    const raw = row[f.key];
    const empty = raw == null || (typeof raw === "string" && raw.trim() === "");

    if (f.type === "boolean") continue;

    if (empty) {
      if (f.required) errors[f.key] = `${f.label} é obrigatório`;
      continue;
    }

    if (f.type === "number") {
      const rule = f.rule ?? {};
      let s = z.number({ message: "Informe um número válido" });
      if (rule.int) s = s.int("Use um número inteiro");
      if (rule.min != null) s = s.min(rule.min, `Mínimo ${rule.min}`);
      if (rule.max != null) s = s.max(rule.max, `Máximo ${rule.max}`);
      const parsed = s.safeParse(Number(raw));
      if (!parsed.success) errors[f.key] = parsed.error.issues[0].message;
      continue;
    }

    if (f.type === "datetime") {
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) errors[f.key] = "Data inválida";
      continue;
    }

    const parsed = textSchema(f).safeParse(String(raw));
    if (!parsed.success) errors[f.key] = parsed.error.issues[0].message;
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

/** Schema do editor de produtos. */
export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(150, "Nome muito longo"),
    slug: z.string().trim().min(2, "Slug muito curto").max(150, "Slug muito longo").regex(slugRegex, "Slug: apenas letras minúsculas, números e hífens"),
    description: z.string().trim().max(3000, "Descrição muito longa").optional().or(z.literal("")),
    technical_description: z.string().trim().max(3000, "Descrição técnica muito longa").optional().or(z.literal("")),
    category_id: z.string().uuid("Categoria inválida").optional().or(z.literal("")),
    brand_id: z.string().uuid("Marca inválida").optional().or(z.literal("")),
    price: z.number({ message: "Preço inválido" }).positive("Preço deve ser maior que zero").max(1_000_000, "Preço muito alto"),
    sale_price: z.number().positive("Preço promocional deve ser maior que zero").max(1_000_000).nullable(),
    stock: z.number({ message: "Estoque inválido" }).int("Estoque deve ser inteiro").min(0, "Estoque não pode ser negativo").max(1_000_000),
    sku: z.string().trim().max(60, "SKU muito longo").optional().or(z.literal("")),
    weight: z.string().trim().max(40, "Peso muito longo").optional().or(z.literal("")),
    material: z.string().trim().max(100, "Material muito longo").optional().or(z.literal("")),
    color: z.string().trim().max(60, "Cor muito longa").optional().or(z.literal("")),
    featured: z.boolean(),
    active: z.boolean(),
  })
  .refine((d) => d.sale_price == null || d.sale_price < d.price, {
    message: "Preço promocional deve ser menor que o preço",
    path: ["sale_price"],
  });

export const productImagesSchema = z
  .array(imageRefSchema)
  .max(12, "Máximo de 12 imagens");

export const productSizesSchema = z
  .array(
    z.object({
      size_id: z.string().uuid("Tamanho inválido"),
      stock: z.number().int("Estoque do tamanho deve ser inteiro").min(0, "Estoque do tamanho não pode ser negativo").max(1_000_000),
    }),
  )
  .max(30);

/** Primeira mensagem de erro de um ZodError, pronta para toast. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}
