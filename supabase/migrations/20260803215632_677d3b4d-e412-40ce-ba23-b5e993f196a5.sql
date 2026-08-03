CREATE TABLE public.payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  bank_name text NOT NULL,
  bank_code text,
  agency text,
  account_number text,
  account_type text NOT NULL DEFAULT 'corrente',
  holder_name text NOT NULL,
  holder_doc text,
  pix_key_type text,
  pix_key text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_accounts TO authenticated;
GRANT ALL ON public.payment_accounts TO service_role;

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment accounts"
ON public.payment_accounts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payment_accounts_updated_at BEFORE UPDATE ON public.payment_accounts
FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

CREATE UNIQUE INDEX payment_accounts_single_default ON public.payment_accounts (is_default) WHERE is_default;

INSERT INTO public.payment_accounts (label, bank_name, bank_code, agency, account_number, account_type, holder_name, holder_doc, pix_key_type, pix_key, active, is_default, notes) VALUES
('Conta principal', 'Banco do Brasil', '001', '1234-5', '98765-4', 'corrente', 'APS Kimonos Store LTDA', '12.345.678/0001-90', 'cnpj', '12345678000190', true, true, 'Conta usada para receber vendas do site'),
('Conta secundária', 'Itaú Unibanco', '341', '0456', '12345-6', 'corrente', 'APS Kimonos Store LTDA', '12.345.678/0001-90', 'email', 'financeiro@apskimonos.com.br', true, false, 'Reserva para boletos'),
('Conta PIX rápida', 'Nubank', '260', '0001', '7654321-0', 'pagamento', 'APS Kimonos Store LTDA', '12.345.678/0001-90', 'telefone', '+5565999998888', false, false, 'Desativada temporariamente');