import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "./-crud";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: () => (
    <CrudTable
      table="categories"
      title="Categorias"
      queryKey="admin-categories"
      fields={[
        { key: "name", label: "Nome", type: "text", required: true, rule: { min: 2, max: 80 } },
        { key: "slug", label: "Slug", type: "text", required: true, mono: true, rule: { format: "slug", max: 80 } },
        { key: "image_url", label: "Imagem (URL/asset)", type: "text", mono: true, rule: { format: "image", max: 500 } },
        { key: "position", label: "Posição", type: "number", default: 0, rule: { int: true, min: 0, max: 999 } },
        { key: "active", label: "Ativa", type: "boolean", default: true },
      ]}
      orderBy="position"
    />
  ),
});
