-- 1) Cupons deixam de ser públicos
DROP POLICY IF EXISTS "Public read active coupons" ON public.coupons;
REVOKE SELECT ON public.coupons FROM anon;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text)
RETURNS TABLE (code text, discount_percent integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.code, c.discount_percent
  FROM public.coupons c
  WHERE upper(c.code) = upper(trim(_code))
    AND c.active = true
    AND (c.expires_at IS NULL OR c.expires_at > now())
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO authenticated;

-- 2) Pedidos: cliente não escreve mais direto
DROP POLICY IF EXISTS "Users create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users insert own order items" ON public.order_items;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM authenticated;

CREATE OR REPLACE FUNCTION public.create_order(
  _items jsonb,
  _address jsonb,
  _payment_method text,
  _coupon text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_shipping numeric := 0;
  v_discount numeric := 0;
  v_percent integer := 0;
  it jsonb;
  v_product public.products%ROWTYPE;
  v_qty integer;
  v_size_name text;
  v_size_id uuid;
  v_stock integer;
  v_unit numeric;
  v_image text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio';
  END IF;
  IF jsonb_array_length(_items) > 50 THEN
    RAISE EXCEPTION 'Muitos itens no pedido';
  END IF;
  IF coalesce(_payment_method, '') NOT IN ('pix', 'credit', 'boleto') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida';
  END IF;

  INSERT INTO public.orders (user_id, status, subtotal, shipping, discount, total, payment_method, address_json)
  VALUES (v_user, 'pending', 0, 0, 0, 0, _payment_method, _address)
  RETURNING id INTO v_order_id;

  FOR it IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    v_qty := coalesce((it->>'quantity')::int, 0);
    IF v_qty < 1 OR v_qty > 20 THEN
      RAISE EXCEPTION 'Quantidade inválida';
    END IF;
    v_size_name := nullif(it->>'size_name', '');

    SELECT * INTO v_product FROM public.products
      WHERE id = (it->>'product_id')::uuid AND active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto indisponível';
    END IF;

    v_unit := coalesce(v_product.sale_price, v_product.price);

    IF v_size_name IS NOT NULL THEN
      SELECT ps.size_id, ps.stock INTO v_size_id, v_stock
      FROM public.product_sizes ps
      JOIN public.sizes s ON s.id = ps.size_id
      WHERE ps.product_id = v_product.id AND s.name = v_size_name
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Tamanho indisponível para %', v_product.name;
      END IF;
      IF v_stock < v_qty THEN
        RAISE EXCEPTION 'Estoque insuficiente para % (%)', v_product.name, v_size_name;
      END IF;
      UPDATE public.product_sizes SET stock = stock - v_qty
        WHERE product_id = v_product.id AND size_id = v_size_id;
    ELSE
      IF v_product.stock < v_qty THEN
        RAISE EXCEPTION 'Estoque insuficiente para %', v_product.name;
      END IF;
    END IF;

    UPDATE public.products
      SET stock = greatest(0, stock - v_qty), sales_count = sales_count + v_qty
      WHERE id = v_product.id;

    SELECT pi.image_url INTO v_image FROM public.product_images pi
      WHERE pi.product_id = v_product.id ORDER BY pi.position LIMIT 1;

    INSERT INTO public.order_items (order_id, product_id, product_name, product_image, size_name, quantity, price)
    VALUES (v_order_id, v_product.id, v_product.name, v_image, v_size_name, v_qty, v_unit);

    v_subtotal := v_subtotal + v_unit * v_qty;
  END LOOP;

  IF _coupon IS NOT NULL AND length(trim(_coupon)) > 0 THEN
    SELECT c.discount_percent INTO v_percent FROM public.coupons c
      WHERE upper(c.code) = upper(trim(_coupon))
        AND c.active = true
        AND (c.expires_at IS NULL OR c.expires_at > now());
    IF v_percent IS NULL THEN
      v_percent := 0;
    END IF;
    v_discount := round(v_subtotal * v_percent / 100.0, 2);
  END IF;

  v_shipping := CASE WHEN v_subtotal > 499 THEN 0 ELSE 39.9 END;

  UPDATE public.orders
    SET subtotal = v_subtotal,
        shipping = v_shipping,
        discount = v_discount,
        total = greatest(0, v_subtotal - v_discount) + v_shipping
    WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb, jsonb, text, text) TO authenticated;

-- 3) Avaliações apenas de compras entregues, uma por produto
DROP POLICY IF EXISTS "Users create own reviews" ON public.reviews;
CREATE POLICY "Users review purchased products" ON public.reviews
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.user_id = auth.uid()
      AND o.status = 'delivered'
      AND oi.product_id = reviews.product_id
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_product_unique
  ON public.reviews (user_id, product_id);