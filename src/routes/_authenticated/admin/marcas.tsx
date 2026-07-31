import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "./-crud";

export const Route = createFileRoute("/_authenticated/admin/marcas")({
  component: () => (
    <CrudTable
      table="brands"
      title="Marcas"
      queryKey="admin-brands"
      fields={[
        { key: "name", label: "Nome", type: "text", required: true, rule: { min: 2, max: 80 } },
        { key: "slug", label: "Slug", type: "text", required: true, mono: true, rule: { format: "slug", max: 80 } },
        { key: "logo_url", label: "Logo (URL)", type: "text", mono: true, rule: { format: "image", max: 500 } },
      ]}
      orderBy="name"
    />
  ),
});
