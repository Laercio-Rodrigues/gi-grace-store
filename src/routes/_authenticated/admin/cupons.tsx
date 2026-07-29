import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "./-crud";

export const Route = createFileRoute("/_authenticated/admin/cupons")({
  component: () => (
    <CrudTable
      table="coupons"
      title="Cupons"
      queryKey="admin-coupons"
      fields={[
        { key: "code", label: "Código", type: "text", required: true, mono: true },
        { key: "discount_percent", label: "Desconto (%)", type: "number", required: true },
        { key: "expires_at", label: "Expira em", type: "datetime" },
        { key: "active", label: "Ativo", type: "boolean", default: true },
      ]}
      orderBy="created_at"
      orderDesc
    />
  ),
});
