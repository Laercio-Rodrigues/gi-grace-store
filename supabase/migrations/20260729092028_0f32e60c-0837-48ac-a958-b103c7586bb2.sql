
-- =========================================
-- KIMONO STORE PRO - COMPLETE SCHEMA
-- =========================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles insertable by owner" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (active = true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admins manage brands" ON public.brands FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  technical_description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  sale_price NUMERIC(10,2) CHECK (sale_price >= 0),
  stock INT NOT NULL DEFAULT 0,
  sku TEXT UNIQUE,
  weight TEXT,
  material TEXT,
  color TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sales_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products(category_id);
CREATE INDEX products_brand_idx ON public.products(brand_id);
CREATE INDEX products_active_idx ON public.products(active);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (active = true);
CREATE POLICY "Admins read all products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Product images
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins manage product images" ON public.product_images FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Sizes
CREATE TABLE public.sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  position INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.sizes TO anon, authenticated;
GRANT ALL ON public.sizes TO service_role;
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sizes" ON public.sizes FOR SELECT USING (true);

CREATE TABLE public.product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.sizes(id) ON DELETE CASCADE,
  stock INT NOT NULL DEFAULT 0,
  UNIQUE(product_id, size_id)
);
GRANT SELECT ON public.product_sizes TO anon, authenticated;
GRANT ALL ON public.product_sizes TO service_role;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product sizes" ON public.product_sizes FOR SELECT USING (true);
CREATE POLICY "Admins manage product sizes" ON public.product_sizes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Addresses
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  district TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Coupons
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT USING (active = true);
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10,2) NOT NULL,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  address_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  size_name TEXT,
  quantity INT NOT NULL CHECK (quantity > 0),
  price NUMERIC(10,2) NOT NULL
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Users insert own order items" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins read all order items" ON public.order_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users create own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Banners
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active banners" ON public.banners FOR SELECT USING (active = true);
CREATE POLICY "Admins manage banners" ON public.banners FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================
-- SEED
-- =========================
INSERT INTO public.categories (name, slug, position) VALUES
  ('Kimonos', 'kimonos', 1),
  ('Rash Guards', 'rash-guards', 2),
  ('Faixas', 'faixas', 3),
  ('Shorts', 'shorts', 4),
  ('Camisetas', 'camisetas', 5),
  ('Acessórios', 'acessorios', 6);

INSERT INTO public.brands (name, slug) VALUES
  ('Atama Pro', 'atama-pro'),
  ('Kingz Elite', 'kingz-elite'),
  ('Tatami Fight', 'tatami-fight'),
  ('Venum BJJ', 'venum-bjj'),
  ('Shoyoroll BR', 'shoyoroll-br');

INSERT INTO public.sizes (name, position) VALUES
  ('A0', 1),('A1', 2),('A2', 3),('A3', 4),('A4', 5),
  ('P', 6),('M', 7),('G', 8),('GG', 9);

-- Products (image_url encoded as asset key resolved in client)
WITH
  cats AS (SELECT slug, id FROM public.categories),
  brs  AS (SELECT slug, id FROM public.brands)
INSERT INTO public.products (name, slug, description, technical_description, category_id, brand_id, price, sale_price, stock, sku, weight, material, color, featured, active, sales_count)
VALUES
 ('Kimono Trançado Pro Branco', 'kimono-trancado-pro-branco',
  'Kimono de Jiu-Jitsu top de linha, tecido trançado 550gsm, corte anatômico e reforços premium.',
  'Trançado 550gsm • Calça ripstop • Reforços em EVA no colarinho • Costuras triplas',
  (SELECT id FROM cats WHERE slug='kimonos'), (SELECT id FROM brs WHERE slug='atama-pro'),
  899.00, 749.00, 25, 'KMN-PRO-WHT', '1.6kg', 'Algodão trançado', 'Branco', true, true, 340),

 ('Kimono Competition Azul Royal', 'kimono-competition-azul-royal',
  'Modelo de competição leve, aprovado pela IBJJF. Ideal para atletas que buscam performance.',
  'Trançado 450gsm • IBJJF aprovado • Calça ripstop reforçada',
  (SELECT id FROM cats WHERE slug='kimonos'), (SELECT id FROM brs WHERE slug='kingz-elite'),
  849.00, NULL, 18, 'KMN-COMP-BLU', '1.4kg', 'Algodão trançado', 'Azul', true, true, 210),

 ('Kimono Elite Preto', 'kimono-elite-preto',
  'Design minimalista, corte moderno e acabamento premium. Para quem treina com atitude.',
  'Trançado 500gsm • Bordados discretos • Calça ripstop',
  (SELECT id FROM cats WHERE slug='kimonos'), (SELECT id FROM brs WHERE slug='shoyoroll-br'),
  1099.00, 949.00, 12, 'KMN-ELT-BLK', '1.5kg', 'Algodão trançado', 'Preto', true, true, 180),

 ('Kimono Iniciante Branco', 'kimono-iniciante-branco',
  'Kimono ideal para começar. Custo-benefício imbatível e alta durabilidade.',
  'Trançado 350gsm • Costuras reforçadas',
  (SELECT id FROM cats WHERE slug='kimonos'), (SELECT id FROM brs WHERE slug='tatami-fight'),
  499.00, 399.00, 40, 'KMN-STR-WHT', '1.3kg', 'Algodão', 'Branco', false, true, 520),

 ('Rash Guard Manga Longa Preta', 'rash-guard-manga-longa-preta',
  'Rash guard preto com detalhes vermelhos. Tecido de compressão de alta performance.',
  'Poliéster/Elastano • Costuras Flatlock • Anti-microbiana',
  (SELECT id FROM cats WHERE slug='rash-guards'), (SELECT id FROM brs WHERE slug='venum-bjj'),
  249.00, 199.00, 60, 'RSH-BLK-LS', '250g', 'Poliéster/Elastano', 'Preto', true, true, 480),

 ('Rash Guard Competição Azul', 'rash-guard-competicao-azul',
  'Aprovado para competição na faixa azul. Compressão muscular e secagem rápida.',
  'IBJJF aprovado • Poliéster/Elastano',
  (SELECT id FROM cats WHERE slug='rash-guards'), (SELECT id FROM brs WHERE slug='kingz-elite'),
  269.00, NULL, 35, 'RSH-BLU-CMP', '250g', 'Poliéster/Elastano', 'Azul', false, true, 220),

 ('Shorts Grappling Preto', 'shorts-grappling-preto',
  'Short para no-gi com faixa lateral vermelha. Liberdade total de movimento.',
  'Poliéster ripstop • Elástico ajustável • Costuras reforçadas',
  (SELECT id FROM cats WHERE slug='shorts'), (SELECT id FROM brs WHERE slug='venum-bjj'),
  199.00, 159.00, 80, 'SHR-GRP-BLK', '200g', 'Poliéster ripstop', 'Preto', true, true, 610),

 ('Shorts Fight Vermelho', 'shorts-fight-vermelho',
  'Design agressivo, ideal para MMA e no-gi. Split lateral para máxima mobilidade.',
  'Poliéster ripstop • Split lateral',
  (SELECT id FROM cats WHERE slug='shorts'), (SELECT id FROM brs WHERE slug='tatami-fight'),
  219.00, NULL, 22, 'SHR-FGT-RED', '200g', 'Poliéster ripstop', 'Vermelho', false, true, 140),

 ('Faixa Preta Premium', 'faixa-preta-premium',
  'Faixa preta oficial, algodão pesado, ponta rígida e acabamento impecável.',
  'Algodão 100% • Ponta preta • Tecido duplo',
  (SELECT id FROM cats WHERE slug='faixas'), (SELECT id FROM brs WHERE slug='atama-pro'),
  289.00, NULL, 30, 'BLT-BLK-PRM', '400g', 'Algodão', 'Preto', true, true, 190),

 ('Faixa Azul Adulto', 'faixa-azul-adulto',
  'Faixa azul adulto oficial, tecido resistente para treinos intensos.',
  'Algodão 100% • Costuras duplas',
  (SELECT id FROM cats WHERE slug='faixas'), (SELECT id FROM brs WHERE slug='tatami-fight'),
  169.00, 139.00, 55, 'BLT-BLU-ADT', '350g', 'Algodão', 'Azul', false, true, 380),

 ('Camiseta Team Preta', 'camiseta-team-preta',
  'Camiseta oficial com estampa exclusiva. Algodão premium, corte moderno.',
  '100% algodão penteado • Estampa em silk',
  (SELECT id FROM cats WHERE slug='camisetas'), (SELECT id FROM brs WHERE slug='kingz-elite'),
  129.00, 99.00, 90, 'TSH-TEAM-BLK', '180g', 'Algodão', 'Preto', false, true, 260),

 ('Protetor Bucal Duplo', 'protetor-bucal-duplo',
  'Proteção máxima para treinos e competição. Moldável e higiênico.',
  'Gel dual-layer • Case incluso',
  (SELECT id FROM cats WHERE slug='acessorios'), (SELECT id FROM brs WHERE slug='venum-bjj'),
  79.00, 59.00, 200, 'ACC-MTH-DBL', '30g', 'Gel EVA', 'Transparente', false, true, 720);

-- Product images (asset keys: hero-gi, gi-white, gi-blue, gi-black, rashguard-black, belts, shorts)
INSERT INTO public.product_images (product_id, image_url, position)
SELECT p.id, img.url, img.pos FROM public.products p
JOIN (VALUES
  ('kimono-trancado-pro-branco','asset:gi-white',0),
  ('kimono-trancado-pro-branco','asset:hero-gi',1),
  ('kimono-competition-azul-royal','asset:gi-blue',0),
  ('kimono-elite-preto','asset:gi-black',0),
  ('kimono-iniciante-branco','asset:gi-white',0),
  ('rash-guard-manga-longa-preta','asset:rashguard-black',0),
  ('rash-guard-competicao-azul','asset:rashguard-black',0),
  ('shorts-grappling-preto','asset:shorts',0),
  ('shorts-fight-vermelho','asset:shorts',0),
  ('faixa-preta-premium','asset:belts',0),
  ('faixa-azul-adulto','asset:belts',0),
  ('camiseta-team-preta','asset:rashguard-black',0),
  ('protetor-bucal-duplo','asset:shorts',0)
) AS img(slug,url,pos) ON img.slug = p.slug;

-- Product sizes: give kimonos A0-A4, apparel P-GG
INSERT INTO public.product_sizes (product_id, size_id, stock)
SELECT p.id, s.id, 5
FROM public.products p, public.sizes s
WHERE p.slug IN ('kimono-trancado-pro-branco','kimono-competition-azul-royal','kimono-elite-preto','kimono-iniciante-branco')
  AND s.name IN ('A0','A1','A2','A3','A4');

INSERT INTO public.product_sizes (product_id, size_id, stock)
SELECT p.id, s.id, 8
FROM public.products p, public.sizes s
WHERE p.slug IN ('rash-guard-manga-longa-preta','rash-guard-competicao-azul','shorts-grappling-preto','shorts-fight-vermelho','camiseta-team-preta')
  AND s.name IN ('P','M','G','GG');

-- Coupons
INSERT INTO public.coupons (code, discount_percent, active) VALUES
  ('BEMVINDO10', 10, true),
  ('KIMONO15', 15, true);

-- Banners
INSERT INTO public.banners (title, subtitle, image_url, link, position) VALUES
  ('Nova Coleção Pro', 'Kimonos trançados 550gsm com corte anatômico', 'asset:hero-gi', '/produtos?categoria=kimonos', 1);
