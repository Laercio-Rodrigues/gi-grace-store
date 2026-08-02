-- ===== company settings (emitente) =====
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  legal_name text NOT NULL DEFAULT '',
  trade_name text NOT NULL DEFAULT '',
  cnpj text NOT NULL DEFAULT '',
  ie text NOT NULL DEFAULT '',
  im text,
  crt text NOT NULL DEFAULT '1',
  street text NOT NULL DEFAULT '',
  number text NOT NULL DEFAULT '',
  complement text,
  district text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  city_code text,
  state text NOT NULL DEFAULT '',
  zip_code text NOT NULL DEFAULT '',
  phone text,
  email text,
  logo_url text,
  nfe_series text NOT NULL DEFAULT '1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_settings_singleton_chk CHECK (singleton)
);
GRANT SELECT, INSERT, UPDATE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage company settings" ON public.company_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER company_settings_updated_at BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- ===== invoices =====
CREATE TYPE public.invoice_type AS ENUM ('receipt', 'nfe');
CREATE TYPE public.invoice_status AS ENUM ('issued', 'paid', 'cancelled');

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type public.invoice_type NOT NULL,
  number integer NOT NULL,
  series text NOT NULL DEFAULT '1',
  status public.invoice_status NOT NULL DEFAULT 'issued',
  customer_name text NOT NULL,
  customer_doc text,
  customer_email text,
  products_total numeric NOT NULL DEFAULT 0,
  shipping numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  other_expenses numeric NOT NULL DEFAULT 0,
  tax_total numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text,
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, series, number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
CREATE INDEX invoices_issued_at_idx ON public.invoices (issued_at DESC);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  code text,
  description text NOT NULL,
  ncm text,
  cest text,
  cfop text,
  unit text NOT NULL DEFAULT 'UN',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  origin text,
  cst text,
  icms_base numeric NOT NULL DEFAULT 0,
  icms_rate numeric NOT NULL DEFAULT 0,
  icms_value numeric NOT NULL DEFAULT 0,
  ipi_rate numeric NOT NULL DEFAULT 0,
  ipi_value numeric NOT NULL DEFAULT 0,
  pis_rate numeric NOT NULL DEFAULT 0,
  pis_value numeric NOT NULL DEFAULT 0,
  cofins_rate numeric NOT NULL DEFAULT 0,
  cofins_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoice items" ON public.invoice_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX invoice_items_invoice_idx ON public.invoice_items (invoice_id);

-- ===== bills (boletos) =====
CREATE TYPE public.bill_status AS ENUM ('pending', 'paid', 'cancelled');

CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  supplier text NOT NULL DEFAULT '',
  category text,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  barcode text,
  attachment_url text,
  notes text,
  status public.bill_status NOT NULL DEFAULT 'pending',
  paid_at date,
  paid_amount numeric,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT ALL ON public.bills TO service_role;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bills" ON public.bills
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER bills_updated_at BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
CREATE INDEX bills_due_date_idx ON public.bills (due_date);

-- ===== role audit =====
CREATE TABLE public.role_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.role_audit TO authenticated;
GRANT ALL ON public.role_audit TO service_role;
ALTER TABLE public.role_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read role audit" ON public.role_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== product fiscal fields =====
ALTER TABLE public.products
  ADD COLUMN ncm text,
  ADD COLUMN cest text,
  ADD COLUMN cfop text,
  ADD COLUMN origin text,
  ADD COLUMN cst text,
  ADD COLUMN unit text NOT NULL DEFAULT 'UN',
  ADD COLUMN icms_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN ipi_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN pis_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN cofins_rate numeric NOT NULL DEFAULT 0;

-- ===== invoice numbering =====
CREATE OR REPLACE FUNCTION public.next_invoice_number(_type public.invoice_type, _series text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(max(number), 0) + 1 FROM public.invoices WHERE type = _type AND series = _series;
$$;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(public.invoice_type, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(public.invoice_type, text) TO authenticated;

-- ===== admin user management =====
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(user_id uuid, name text, email text, created_at timestamptz, is_admin boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.email, p.created_at,
         EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin')
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_admin(_user_id uuid, _make_admin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_admins integer;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.role_audit (target_user_id, actor_user_id, action, role)
      VALUES (_user_id, v_actor, 'grant', 'admin');
  ELSE
    IF _user_id = v_actor THEN
      RAISE EXCEPTION 'Você não pode remover o seu próprio acesso de administrador';
    END IF;
    SELECT count(*) INTO v_admins FROM public.user_roles WHERE role = 'admin';
    IF v_admins <= 1 THEN
      RAISE EXCEPTION 'A loja precisa de pelo menos um administrador';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
    INSERT INTO public.role_audit (target_user_id, actor_user_id, action, role)
      VALUES (_user_id, v_actor, 'revoke', 'admin');
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_set_admin(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_admin(uuid, boolean) TO authenticated;