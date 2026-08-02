-- 1. Equipe / convites de admin
CREATE TABLE public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  note text,
  is_admin boolean NOT NULL DEFAULT false,
  user_id uuid,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_invites_email_key ON public.admin_invites (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage admin invites" ON public.admin_invites
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER admin_invites_updated_at BEFORE UPDATE ON public.admin_invites
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- 2. Upsert de convite + concessão de papel
CREATE OR REPLACE FUNCTION public.admin_upsert_invite(_email text, _name text, _note text, _make_admin boolean)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text := lower(trim(_email));
  v_id uuid;
  v_user uuid;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'E-mail inválido';
  END IF;

  SELECT p.id INTO v_user FROM public.profiles p WHERE lower(p.email) = v_email;

  INSERT INTO public.admin_invites (email, name, note, is_admin, user_id, invited_by)
  VALUES (v_email, nullif(trim(coalesce(_name,'')),''), nullif(trim(coalesce(_note,'')),''), coalesce(_make_admin,false), v_user, v_actor)
  ON CONFLICT (lower(email)) DO UPDATE
    SET name = coalesce(excluded.name, public.admin_invites.name),
        note = coalesce(excluded.note, public.admin_invites.note),
        is_admin = excluded.is_admin,
        user_id = coalesce(excluded.user_id, public.admin_invites.user_id)
  RETURNING id INTO v_id;

  IF v_user IS NOT NULL THEN
    PERFORM public.admin_set_admin(v_user, coalesce(_make_admin,false));
  END IF;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_upsert_invite(text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_invite(text, text, text, boolean) TO authenticated;

-- 3. Aplicar convite pendente no cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');

  UPDATE public.admin_invites SET user_id = NEW.id WHERE lower(email) = lower(NEW.email);

  IF EXISTS (SELECT 1 FROM public.admin_invites WHERE lower(email) = lower(NEW.email) AND is_admin) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.role_audit (target_user_id, actor_user_id, action, role)
      VALUES (NEW.id, NULL, 'grant', 'admin');
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Dados fictícios: empresa
INSERT INTO public.company_settings (legal_name, trade_name, cnpj, ie, im, crt, street, number, complement, district, city, city_code, state, zip_code, phone, email, nfe_series)
VALUES ('APS Kimonos Comercio de Artigos Esportivos LTDA', 'APS Kimonos Store', '12345678000195', '112233445', '987654', '1',
        'Avenida Paulista', '1578', 'Sala 1204', 'Bela Vista', 'São Paulo', '3550308', 'SP', '01310200',
        '(11) 98877-6655', 'contato@apskimonos.com.br', '1');

-- 5. Banners
INSERT INTO public.banners (title, subtitle, image_url, link, active, position) VALUES
  ('Coleção Competição 2026', 'Kimonos homologados IBJJF com até 20% OFF', 'asset:hero-gi', '/produtos?categoria=kimonos', true, 1),
  ('Rash Guards Pro', 'Compressão premium para treinos intensos', 'asset:rashguard-black', '/produtos?categoria=rash-guards', true, 2),
  ('Faixas Premium', 'Algodão trançado com reforço duplo', 'asset:belts', '/produtos?categoria=faixas', true, 3);

-- 6. Cupons
INSERT INTO public.coupons (code, discount_percent, expires_at, active) VALUES
  ('BLACKAPS20', 20, now() + interval '30 days', true),
  ('FRETEZERO', 5, now() + interval '15 days', true),
  ('NATAL25', 25, now() - interval '20 days', false)
ON CONFLICT DO NOTHING;

-- 7. Pedidos fictícios
DO $$
DECLARE
  u1 uuid; u2 uuid; u3 uuid; u4 uuid;
  o uuid;
  p_gi uuid; p_azul uuid; p_preto uuid; p_rash uuid; p_short uuid; p_faixa uuid; p_camisa uuid;
BEGIN
  SELECT id INTO u1 FROM public.profiles ORDER BY created_at LIMIT 1;
  SELECT id INTO u2 FROM public.profiles ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO u3 FROM public.profiles ORDER BY created_at OFFSET 2 LIMIT 1;
  SELECT id INTO u4 FROM public.profiles ORDER BY created_at OFFSET 3 LIMIT 1;
  u2 := coalesce(u2, u1); u3 := coalesce(u3, u1); u4 := coalesce(u4, u1);

  SELECT id INTO p_gi FROM public.products WHERE slug = 'kimono-trancado-pro-branco';
  SELECT id INTO p_azul FROM public.products WHERE slug = 'kimono-competition-azul-royal';
  SELECT id INTO p_preto FROM public.products WHERE slug = 'kimono-elite-preto';
  SELECT id INTO p_rash FROM public.products WHERE slug = 'rash-guard-manga-longa-preta';
  SELECT id INTO p_short FROM public.products WHERE slug = 'shorts-grappling-preto';
  SELECT id INTO p_faixa FROM public.products WHERE slug = 'faixa-preta-premium';
  SELECT id INTO p_camisa FROM public.products WHERE slug = 'camiseta-team-preta';

  -- Pedido 1 (entregue)
  INSERT INTO public.orders (user_id, status, subtotal, shipping, discount, total, payment_method, address_json, created_at)
  VALUES (u1, 'delivered', 948.00, 0, 94.80, 853.20, 'pix',
    '{"name":"Carlos Menezes","phone":"(11) 99123-4455","street":"Rua das Palmeiras","number":"320","district":"Vila Mariana","city":"São Paulo","state":"SP","zip_code":"04101000"}'::jsonb,
    now() - interval '48 days') RETURNING id INTO o;
  INSERT INTO public.order_items (order_id, product_id, product_name, product_image, size_name, quantity, price) VALUES
    (o, p_gi, 'Kimono Trançado Pro Branco', 'asset:gi-white', 'A2', 1, 749.00),
    (o, p_rash, 'Rash Guard Manga Longa Preta', 'asset:rashguard-black', 'M', 1, 199.00);

  -- Pedido 2 (entregue)
  INSERT INTO public.orders (user_id, status, subtotal, shipping, discount, total, payment_method, address_json, created_at)
  VALUES (u2, 'delivered', 1108.00, 0, 0, 1108.00, 'credit',
    '{"name":"Fernanda Lima","phone":"(21) 98877-1122","street":"Av. Atlântica","number":"1500","district":"Copacabana","city":"Rio de Janeiro","state":"RJ","zip_code":"22021001"}'::jsonb,
    now() - interval '35 days') RETURNING id INTO o;
  INSERT INTO public.order_items (order_id, product_id, product_name, product_image, size_name, quantity, price) VALUES
    (o, p_preto, 'Kimono Elite Preto', 'asset:gi-black', 'A3', 1, 949.00),
    (o, p_faixa, 'Faixa Preta Premium', 'asset:belts', 'A3', 1, 159.00);

  -- Pedido 3 (enviado)
  INSERT INTO public.orders (user_id, status, subtotal, shipping, discount, total, payment_method, address_json, created_at)
  VALUES (u3, 'shipped', 849.00, 0, 0, 849.00, 'boleto',
    '{"name":"Rodrigo Alves","phone":"(31) 99666-3322","street":"Rua dos Aimorés","number":"88","district":"Funcionários","city":"Belo Horizonte","state":"MG","zip_code":"30140070"}'::jsonb,
    now() - interval '12 days') RETURNING id INTO o;
  INSERT INTO public.order_items (order_id, product_id, product_name, product_image, size_name, quantity, price) VALUES
    (o, p_azul, 'Kimono Competition Azul Royal', 'asset:gi-blue', 'A1', 1, 849.00);

  -- Pedido 4 (pago)
  INSERT INTO public.orders (user_id, status, subtotal, shipping, discount, total, payment_method, address_json, created_at)
  VALUES (u4, 'paid', 358.00, 39.90, 0, 397.90, 'pix',
    '{"name":"Juliana Prado","phone":"(41) 99555-7788","street":"Rua XV de Novembro","number":"210","district":"Centro","city":"Curitiba","state":"PR","zip_code":"80020310"}'::jsonb,
    now() - interval '6 days') RETURNING id INTO o;
  INSERT INTO public.order_items (order_id, product_id, product_name, product_image, size_name, quantity, price) VALUES
    (o, p_short, 'Shorts Grappling Preto', 'asset:shorts', 'M', 1, 159.00),
    (o, p_rash, 'Rash Guard Manga Longa Preta', 'asset:rashguard-black', 'G', 1, 199.00);

  -- Pedido 5 (pendente)
  INSERT INTO public.orders (user_id, status, subtotal, shipping, discount, total, payment_method, address_json, created_at)
  VALUES (u1, 'pending', 99.00, 39.90, 0, 138.90, 'boleto',
    '{"name":"Carlos Menezes","phone":"(11) 99123-4455","street":"Rua das Palmeiras","number":"320","district":"Vila Mariana","city":"São Paulo","state":"SP","zip_code":"04101000"}'::jsonb,
    now() - interval '2 days') RETURNING id INTO o;
  INSERT INTO public.order_items (order_id, product_id, product_name, product_image, size_name, quantity, price) VALUES
    (o, p_camisa, 'Camiseta Team Preta', 'asset:gi-white', 'M', 1, 99.00);

  -- Pedido 6 (cancelado)
  INSERT INTO public.orders (user_id, status, subtotal, shipping, discount, total, payment_method, address_json, created_at)
  VALUES (u2, 'cancelled', 399.00, 39.90, 39.90, 399.00, 'credit',
    '{"name":"Fernanda Lima","phone":"(21) 98877-1122","street":"Av. Atlântica","number":"1500","district":"Copacabana","city":"Rio de Janeiro","state":"RJ","zip_code":"22021001"}'::jsonb,
    now() - interval '20 days') RETURNING id INTO o;
  INSERT INTO public.order_items (order_id, product_id, product_name, product_image, size_name, quantity, price) VALUES
    (o, (SELECT id FROM public.products WHERE slug='kimono-iniciante-branco'), 'Kimono Iniciante Branco', 'asset:gi-white', 'A0', 1, 399.00);

  -- Pedido 7 (entregue, mês atual)
  INSERT INTO public.orders (user_id, status, subtotal, shipping, discount, total, payment_method, address_json, created_at)
  VALUES (u3, 'delivered', 1498.00, 0, 149.80, 1348.20, 'pix',
    '{"name":"Rodrigo Alves","phone":"(31) 99666-3322","street":"Rua dos Aimorés","number":"88","district":"Funcionários","city":"Belo Horizonte","state":"MG","zip_code":"30140070"}'::jsonb,
    now() - interval '9 days') RETURNING id INTO o;
  INSERT INTO public.order_items (order_id, product_id, product_name, product_image, size_name, quantity, price) VALUES
    (o, p_gi, 'Kimono Trançado Pro Branco', 'asset:gi-white', 'A2', 2, 749.00);

  -- Pedido 8 (pago, recente)
  INSERT INTO public.orders (user_id, status, subtotal, shipping, discount, total, payment_method, address_json, created_at)
  VALUES (u4, 'paid', 288.00, 39.90, 0, 327.90, 'credit',
    '{"name":"Juliana Prado","phone":"(41) 99555-7788","street":"Rua XV de Novembro","number":"210","district":"Centro","city":"Curitiba","state":"PR","zip_code":"80020310"}'::jsonb,
    now() - interval '1 day') RETURNING id INTO o;
  INSERT INTO public.order_items (order_id, product_id, product_name, product_image, size_name, quantity, price) VALUES
    (o, p_faixa, 'Faixa Preta Premium', 'asset:belts', 'A2', 1, 289.00);
END $$;

-- 8. Faturas fictícias
DO $$
DECLARE
  inv uuid;
  o1 uuid; o2 uuid; o3 uuid;
BEGIN
  SELECT id INTO o1 FROM public.orders WHERE status='delivered' ORDER BY created_at LIMIT 1;
  SELECT id INTO o2 FROM public.orders WHERE status='delivered' ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO o3 FROM public.orders WHERE status='shipped' ORDER BY created_at LIMIT 1;

  INSERT INTO public.invoices (order_id, type, number, series, status, customer_name, customer_doc, customer_email,
    products_total, shipping, discount, other_expenses, tax_total, total, payment_method, notes, issued_at)
  VALUES (o1, 'receipt', 1, '1', 'paid', 'Carlos Menezes', '39053344705', 'carlos.menezes@exemplo.com.br',
    948.00, 0, 94.80, 0, 0, 853.20, 'pix', 'Recibo de venda — pagamento via PIX confirmado.', now() - interval '47 days')
  RETURNING id INTO inv;
  INSERT INTO public.invoice_items (invoice_id, position, description, unit, quantity, unit_price, discount, total)
  VALUES (inv, 1, 'Kimono Trançado Pro Branco A2', 'UN', 1, 749.00, 74.90, 674.10),
         (inv, 2, 'Rash Guard Manga Longa Preta M', 'UN', 1, 199.00, 19.90, 179.10);

  INSERT INTO public.invoices (order_id, type, number, series, status, customer_name, customer_doc, customer_email,
    products_total, shipping, discount, other_expenses, tax_total, total, payment_method, notes, issued_at)
  VALUES (o2, 'nfe', 1, '1', 'issued', 'Fernanda Lima', '11222333000181', 'fernanda.lima@exemplo.com.br',
    1108.00, 0, 0, 0, 199.44, 1108.00, 'credit', 'Venda de mercadoria adquirida de terceiros.', now() - interval '34 days')
  RETURNING id INTO inv;
  INSERT INTO public.invoice_items (invoice_id, position, description, ncm, cfop, unit, quantity, unit_price, discount, total,
    origin, cst, icms_base, icms_rate, icms_value, ipi_rate, ipi_value, pis_rate, pis_value, cofins_rate, cofins_value)
  VALUES (inv, 1, 'Kimono Elite Preto A3', '62113200', '5102', 'UN', 1, 949.00, 0, 949.00, '0', '00', 949.00, 18, 170.82, 0, 0, 1.65, 15.66, 7.6, 72.12),
         (inv, 2, 'Faixa Preta Premium A3', '63079010', '5102', 'UN', 1, 159.00, 0, 159.00, '0', '00', 159.00, 18, 28.62, 0, 0, 1.65, 2.62, 7.6, 12.08);

  INSERT INTO public.invoices (order_id, type, number, series, status, customer_name, customer_doc, customer_email,
    products_total, shipping, discount, other_expenses, tax_total, total, payment_method, notes, issued_at)
  VALUES (o3, 'receipt', 2, '1', 'issued', 'Rodrigo Alves', '52998224725', 'rodrigo.alves@exemplo.com.br',
    849.00, 0, 0, 0, 0, 849.00, 'boleto', 'Pedido de venda — aguardando compensação do boleto.', now() - interval '11 days')
  RETURNING id INTO inv;
  INSERT INTO public.invoice_items (invoice_id, position, description, unit, quantity, unit_price, discount, total)
  VALUES (inv, 1, 'Kimono Competition Azul Royal A1', 'UN', 1, 849.00, 0, 849.00);

  INSERT INTO public.invoices (type, number, series, status, customer_name, customer_doc, customer_email,
    products_total, shipping, discount, other_expenses, tax_total, total, payment_method, notes, issued_at)
  VALUES ('nfe', 2, '1', 'cancelled', 'Academia Gracie Barra Centro', '45997418000153', 'compras@gbcentro.com.br',
    2500.00, 120.00, 0, 0, 450.00, 2620.00, 'boleto', 'Nota cancelada a pedido do cliente.', now() - interval '5 days')
  RETURNING id INTO inv;
  INSERT INTO public.invoice_items (invoice_id, position, description, ncm, cfop, unit, quantity, unit_price, discount, total,
    origin, cst, icms_base, icms_rate, icms_value, pis_rate, pis_value, cofins_rate, cofins_value)
  VALUES (inv, 1, 'Kimono Iniciante Branco — lote academia', '62113200', '5102', 'UN', 5, 500.00, 0, 2500.00, '0', '00', 2500.00, 18, 450.00, 1.65, 41.25, 7.6, 190.00);
END $$;

-- 9. Boletos fictícios
INSERT INTO public.bills (description, supplier, category, amount, due_date, barcode, notes, status, paid_at, paid_amount) VALUES
  ('Aluguel da loja — mês corrente', 'Imobiliária Central', 'Aluguel', 4500.00, (current_date + 8), '34191.79001 01043.510047 91020.150008 5 98110000450000', 'Contrato 2024/118', 'pending', NULL, NULL),
  ('Energia elétrica', 'Enel SP', 'Utilidades', 682.45, (current_date + 3), '83640000000 6 82450000000 1 12345678901 2 34567890123 4', NULL, 'pending', NULL, NULL),
  ('Fornecedor de tecido trançado', 'Têxtil Nagoya LTDA', 'Fornecedores', 12800.00, (current_date + 21), NULL, 'Pedido de 200 kimonos', 'pending', NULL, NULL),
  ('Internet e telefonia', 'Vivo Empresas', 'Utilidades', 329.90, (current_date - 5), NULL, 'Vencido — negociar 2ª via', 'pending', NULL, NULL),
  ('Frete transportadora', 'JadLog', 'Logística', 1875.30, (current_date - 12), NULL, 'Atrasado', 'pending', NULL, NULL),
  ('Simples Nacional — DAS', 'Receita Federal', 'Impostos', 3260.77, (current_date - 18), NULL, 'Competência anterior', 'paid', (current_date - 18), 3260.77),
  ('Marketing digital', 'Agência Tatame Media', 'Marketing', 2400.00, (current_date - 25), NULL, NULL, 'paid', (current_date - 24), 2400.00),
  ('Manutenção do sistema PDV', 'TechShop Sistemas', 'Serviços', 590.00, (current_date - 40), NULL, 'Cancelado — serviço não prestado', 'cancelled', NULL, NULL);

-- 10. Equipe fictícia
INSERT INTO public.admin_invites (email, name, note, is_admin) VALUES
  ('gerente@apskimonos.com.br', 'Ana Paula Souza', 'Gerente da loja', true),
  ('financeiro@apskimonos.com.br', 'Marcos Tavares', 'Contas a pagar e faturamento', true),
  ('estoque@apskimonos.com.br', 'Bruna Carvalho', 'Responsável pelo estoque', false)
ON CONFLICT DO NOTHING;