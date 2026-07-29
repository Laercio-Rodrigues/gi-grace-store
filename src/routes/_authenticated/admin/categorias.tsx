import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "./-crud";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: () => (
    <CrudTable
      table="categories"
      title="Categorias"
      queryKey="admin-categories"
      fields={[
        { key: "name", label: "Nome", type: "text", required: true },
        { key: "slug", label: "Slug", type: "text", required: true, mono: true },
        { key: "image_url", label: "Imagem (URL/asset)", type: "text", mono: true },
        { key: "position", label: "Posição", type: "number", default: 0 },
        { key: "active", label: "Ativa", type: "boolean", default: true },
      ]}
      orderBy="position"
    />
  ),
});
