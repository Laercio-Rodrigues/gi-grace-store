-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'refunded');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "mp_payment_id" TEXT,
ADD COLUMN     "mp_preference_id" TEXT,
ADD COLUMN     "paid_at" TIMESTAMPTZ(3),
ADD COLUMN     "payment_status" "payment_status" NOT NULL DEFAULT 'pending',
ADD COLUMN     "payment_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_mp_payment_id_key" ON "orders"("mp_payment_id");

-- Pedidos antigos já pagos/enviados passam a constar como pagamento aprovado
UPDATE "orders" SET "payment_status" = 'approved', "paid_at" = "updated_at"
WHERE "status" IN ('paid', 'shipped', 'delivered');
