import { z } from "zod";

/** Utilitários e validações fiscais (Receita Federal / NF-e modelo 55). */

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export const CRT_OPTIONS = [
  { value: "1", label: "1 - Simples Nacional" },
  { value: "2", label: "2 - Simples Nacional (excesso de sublimite)" },
  { value: "3", label: "3 - Regime Normal" },
];

export const ORIGIN_OPTIONS = [
  { value: "0", label: "0 - Nacional" },
  { value: "1", label: "1 - Estrangeira (importação direta)" },
  { value: "2", label: "2 - Estrangeira (adquirida no mercado interno)" },
  { value: "3", label: "3 - Nacional com importação > 40%" },
  { value: "4", label: "4 - Nacional (processos produtivos básicos)" },
  { value: "5", label: "5 - Nacional com importação <= 40%" },
  { value: "6", label: "6 - Estrangeira sem similar nacional" },
  { value: "7", label: "7 - Estrangeira adquirida no país sem similar" },
  { value: "8", label: "8 - Nacional com importação > 70%" },
];

export const CST_OPTIONS = [
  { value: "102", label: "CSOSN 102 - Sem permissão de crédito" },
  { value: "101", label: "CSOSN 101 - Com permissão de crédito" },
  { value: "500", label: "CSOSN 500 - ICMS cobrado por ST" },
  { value: "00", label: "CST 00 - Tributada integralmente" },
  { value: "20", label: "CST 20 - Com redução de base de cálculo" },
  { value: "40", label: "CST 40 - Isenta" },
  { value: "41", label: "CST 41 - Não tributada" },
  { value: "60", label: "CST 60 - ICMS cobrado anteriormente por ST" },
];

export const CFOP_OPTIONS = [
  { value: "5102", label: "5102 - Venda de mercadoria (dentro do estado)" },
  { value: "6102", label: "6102 - Venda de mercadoria (fora do estado)" },
  { value: "5405", label: "5405 - Venda de mercadoria com ST (dentro do estado)" },
  { value: "6108", label: "6108 - Venda a não contribuinte (fora do estado)" },
  { value: "5949", label: "5949 - Outra saída de mercadoria" },
];

export const FREIGHT_OPTIONS = [
  { value: "0", label: "0 - Contratação por conta do remetente (CIF)" },
  { value: "1", label: "1 - Contratação por conta do destinatário (FOB)" },
  { value: "2", label: "2 - Contratação por conta de terceiros" },
  { value: "3", label: "3 - Transporte próprio por conta do remetente" },
  { value: "4", label: "4 - Transporte próprio por conta do destinatário" },
  { value: "9", label: "9 - Sem ocorrência de transporte" },
];

export const PAYMENT_OPTIONS = [
  { value: "01", label: "01 - Dinheiro" },
  { value: "02", label: "02 - Cheque" },
  { value: "03", label: "03 - Cartão de crédito" },
  { value: "04", label: "04 - Cartão de débito" },
  { value: "05", label: "05 - Crédito na loja" },
  { value: "15", label: "15 - Boleto bancário" },
  { value: "17", label: "17 - PIX" },
  { value: "90", label: "90 - Sem pagamento" },
  { value: "99", label: "99 - Outros" },
];

export const onlyDigits = (v: string) => (v ?? "").replace(/\D/g, "");

export function isValidCPF(value: string): boolean {
  const c = onlyDigits(value);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
    const d = (sum * 10) % 11;
    return d === 10 ? 0 : d;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

export function isValidCNPJ(value: string): boolean {
  const c = onlyDigits(value);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

export const isValidDoc = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 11 ? isValidCPF(d) : d.length === 14 ? isValidCNPJ(d) : false;
};

export function formatDoc(value: string): string {
  const d = onlyDigits(value);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value ?? "";
}

export function formatCep(value: string): string {
  const d = onlyDigits(value);
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, "$1-$2") : value ?? "";
}

export const cnpjSchema = z.string().trim().refine((v) => isValidCNPJ(v), "CNPJ inválido");
export const docSchema = z.string().trim().refine((v) => isValidDoc(v), "CPF ou CNPJ inválido");
export const cepSchema = z.string().trim().refine((v) => onlyDigits(v).length === 8, "CEP inválido");
export const ufSchema = z.enum(UFS, { message: "UF inválida" });
export const ncmSchema = z.string().trim().refine((v) => onlyDigits(v).length === 8, "NCM deve ter 8 dígitos");
export const cfopSchema = z.string().trim().refine((v) => onlyDigits(v).length === 4, "CFOP deve ter 4 dígitos");

export const companySchema = z.object({
  legal_name: z.string().trim().min(2, "Razão social obrigatória").max(150),
  trade_name: z.string().trim().max(150).optional().or(z.literal("")),
  cnpj: cnpjSchema,
  ie: z.string().trim().min(2, "Inscrição estadual obrigatória (ou ISENTO)").max(20),
  im: z.string().trim().max(20).optional().or(z.literal("")),
  crt: z.enum(["1", "2", "3"]),
  street: z.string().trim().min(2, "Logradouro obrigatório").max(150),
  number: z.string().trim().min(1, "Número obrigatório").max(15),
  complement: z.string().trim().max(60).optional().or(z.literal("")),
  district: z.string().trim().min(2, "Bairro obrigatório").max(80),
  city: z.string().trim().min(2, "Município obrigatório").max(80),
  city_code: z.string().trim().max(10).optional().or(z.literal("")),
  state: ufSchema,
  zip_code: cepSchema,
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(120).optional().or(z.literal("")),
  nfe_series: z.string().trim().min(1).max(3),
});

export const invoiceItemSchema = z.object({
  code: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().min(2, "Descrição do item obrigatória").max(200),
  ncm: z.string().trim().optional().or(z.literal("")),
  cest: z.string().trim().max(9).optional().or(z.literal("")),
  cfop: z.string().trim().optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(6),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  unit_price: z.number().min(0, "Valor unitário inválido"),
  discount: z.number().min(0),
  origin: z.string().trim().optional().or(z.literal("")),
  cst: z.string().trim().optional().or(z.literal("")),
  icms_rate: z.number().min(0).max(100),
  ipi_rate: z.number().min(0).max(100),
  pis_rate: z.number().min(0).max(100),
  cofins_rate: z.number().min(0).max(100),
});

/** Itens de NF-e exigem NCM e CFOP; recibo não. */
export const nfeItemSchema = invoiceItemSchema.extend({
  ncm: ncmSchema,
  cfop: cfopSchema,
  origin: z.string().trim().min(1, "Origem obrigatória"),
  cst: z.string().trim().min(2, "CST/CSOSN obrigatório"),
});

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Nome do destinatário obrigatório").max(150),
  doc: z.string().trim().optional().or(z.literal("")),
  ie: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  street: z.string().trim().max(150).optional().or(z.literal("")),
  number: z.string().trim().max(15).optional().or(z.literal("")),
  complement: z.string().trim().max(60).optional().or(z.literal("")),
  district: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(2).optional().or(z.literal("")),
  zip_code: z.string().trim().max(9).optional().or(z.literal("")),
});

export const nfeCustomerSchema = customerSchema.extend({
  doc: docSchema,
  street: z.string().trim().min(2, "Logradouro do destinatário obrigatório").max(150),
  number: z.string().trim().min(1, "Número obrigatório").max(15),
  district: z.string().trim().min(2, "Bairro obrigatório").max(80),
  city: z.string().trim().min(2, "Município obrigatório").max(80),
  state: ufSchema,
  zip_code: cepSchema,
});

export const billSchema = z.object({
  description: z.string().trim().min(2, "Descrição obrigatória").max(150),
  supplier: z.string().trim().min(2, "Fornecedor obrigatório").max(120),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  amount: z.number().positive("Valor deve ser maior que zero").max(10_000_000),
  due_date: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Vencimento inválido"),
  barcode: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || onlyDigits(v).length >= 44, "Linha digitável deve ter ao menos 44 dígitos"),
  attachment_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "Informe uma URL válida"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ItemInput = z.infer<typeof invoiceItemSchema>;

export function computeItem(it: ItemInput) {
  const gross = it.quantity * it.unit_price;
  const total = Math.max(0, gross - (it.discount || 0));
  const icms_base = total;
  const icms_value = round2((icms_base * it.icms_rate) / 100);
  const ipi_value = round2((total * it.ipi_rate) / 100);
  const pis_value = round2((total * it.pis_rate) / 100);
  const cofins_value = round2((total * it.cofins_rate) / 100);
  return {
    total: round2(total),
    icms_base: round2(icms_base),
    icms_value,
    ipi_value,
    pis_value,
    cofins_value,
    tax_total: round2(icms_value + ipi_value + pis_value + cofins_value),
  };
}

export const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

export const formatDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: v.length <= 10 ? "UTC" : undefined }) : "—";
