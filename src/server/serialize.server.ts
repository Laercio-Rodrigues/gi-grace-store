import { Prisma } from "@prisma/client";

/**
 * Converte o resultado do Prisma para o formato JSON que o front-end consome:
 * Decimal → number, Date → string ISO. Mantém objetos/arrays/JSON como estão.
 */
export type Plain<T> = T extends Prisma.Decimal
  ? number
  : T extends Date
    ? string
    : T extends Array<infer U>
      ? Plain<U>[]
      : T extends object
        ? { [K in keyof T]: Plain<T[K]> }
        : T;

export function plain<T>(value: T): Plain<T> {
  return convert(value) as Plain<T>;
}

function convert(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "bigint") return Number(v);
  if (typeof v !== "object") return v;
  if (Prisma.Decimal.isDecimal(v)) return (v as Prisma.Decimal).toNumber();
  if (Array.isArray(v)) return v.map(convert);
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = convert(val);
  return out;
}

/** Colunas DATE (sem hora) viram "YYYY-MM-DD". */
export const ymd = (d: Date | null | undefined): string | null =>
  d ? d.toISOString().slice(0, 10) : null;

/** "YYYY-MM-DD" → Date (UTC) para colunas DATE. */
export const parseYmd = (s: string | null | undefined): Date | null =>
  s ? new Date(`${s.slice(0, 10)}T00:00:00.000Z`) : null;

/** Traduz erros conhecidos do Prisma para mensagens amigáveis em português. */
export function friendlyError(e: unknown): Error {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const target = Array.isArray(e.meta?.target) ? (e.meta?.target as string[]).join(", ") : "";
      return new Error(
        target ? `Já existe um registro com este valor (${target}).` : "Já existe um registro com este valor.",
      );
    }
    if (e.code === "P2003") return new Error("Este registro está em uso e não pode ser alterado/excluído.");
    if (e.code === "P2025") return new Error("Registro não encontrado.");
  }
  return e instanceof Error ? e : new Error("Erro inesperado");
}
