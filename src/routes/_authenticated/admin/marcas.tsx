import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "./-crud";

export const Route = createFileRoute("/_authenticated/admin/marcas")({
  component: () => (
    <CrudTable
      table="brands"
      title="Marcas"
      queryKey="admin-brands"
      fields={[
        { key: "name", label: "Nome", type: "text", required: true },
        { key: "slug", label: "Slug", type: "text", required: true, mono: true },
        { key: "logo_url", label: "Logo (URL)", type: "text", mono: true },
      ]}
      orderBy="name"
    />
  ),
});
