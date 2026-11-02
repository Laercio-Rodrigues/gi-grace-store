export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  mercadopago: "Mercado Pago",
  pix: "PIX",
  credit: "Cartão de crédito",
  debit: "Cartão de débito",
  boleto: "Boleto",
  cash: "Dinheiro na loja",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  approved: "Pago",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Estornado",
};

export const PAYMENT_STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

export const paymentMethodLabel = (m: string | null | undefined) =>
  m ? (PAYMENT_METHOD_LABEL[m] ?? m) : "—";
