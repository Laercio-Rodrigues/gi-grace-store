import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "./-crud";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: () => (
    <CrudTable
      table="banners"
      title="Banners"
      queryKey="admin-banners"
      fields={[
        { key: "title", label: "Título", type: "text", required: true, rule: { min: 2, max: 120 } },
        { key: "subtitle", label: "Subtítulo", type: "text", rule: { max: 200 } },
        { key: "image_url", label: "Imagem (URL/asset)", type: "text", required: true, mono: true, rule: { format: "image", max: 500 } },
        { key: "link", label: "Link", type: "text", mono: true, rule: { format: "url", max: 500 } },
        { key: "position", label: "Posição", type: "number", default: 0, rule: { int: true, min: 0, max: 999 } },
        { key: "active", label: "Ativo", type: "boolean", default: true },
      ]}
      orderBy="position"
    />
  ),
});
