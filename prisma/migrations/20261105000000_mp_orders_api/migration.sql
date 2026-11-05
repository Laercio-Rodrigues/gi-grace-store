-- A integração passou para a API de Orders do Mercado Pago: a coluna guarda o ID da order (ORD...)
ALTER TABLE "orders" RENAME COLUMN "mp_preference_id" TO "mp_order_id";
