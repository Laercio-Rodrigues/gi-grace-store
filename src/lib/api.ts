/**
 * Helper para chamar server functions mantendo o estilo `{ data, error }`
 * usado nas telas (os erros lançados no servidor chegam como Error com a mensagem em pt-BR).
 */
export function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Erro inesperado";
}

export async function run<T>(
  promise: Promise<T>,
): Promise<{ data: T; error: null } | { data: null; error: { message: string } }> {
  try {
    return { data: await promise, error: null };
  } catch (e) {
    return { data: null, error: { message: errorMessage(e) } };
  }
}
