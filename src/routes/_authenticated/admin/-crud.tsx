import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type FieldType = "text" | "number" | "boolean" | "datetime";
export type Field = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  mono?: boolean;
  default?: unknown;
};

type Props = {
  table: string;
  title: string;
  queryKey: string;
  fields: Field[];
  orderBy?: string;
  orderDesc?: boolean;
};

export function CrudTable({ table, title, queryKey, fields, orderBy, orderDesc }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const list = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      let q = supabase.from(table as any).select("*");
      if (orderBy) q = q.order(orderBy, { ascending: !orderDesc });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
  });

  const emptyRow = () => {
    const r: Record<string, unknown> = {};
    fields.forEach((f) => {
      r[f.key] = f.default ?? (f.type === "boolean" ? false : f.type === "number" ? 0 : "");
    });
    return r;
  };

  const save = async () => {
    if (!editing) return;
    for (const f of fields) {
      if (f.required && (editing[f.key] === "" || editing[f.key] == null)) {
        return toast.error(`${f.label} é obrigatório`);
      }
    }
    const payload: Record<string, unknown> = {};
    fields.forEach((f) => {
      const v = editing[f.key];
      if (f.type === "number") payload[f.key] = v === "" || v == null ? null : Number(v);
      else if (f.type === "datetime") payload[f.key] = v ? new Date(v as string).toISOString() : null;
      else if (f.type === "text") payload[f.key] = v === "" ? null : v;
      else payload[f.key] = v;
    });

    const id = editing.id as string | undefined;
    const { error } = id
      ? await supabase.from(table as any).update(payload).eq("id", id)
      : await supabase.from(table as any).insert(payload);

    if (error) return toast.error(error.message);
    toast.success(id ? "Atualizado" : "Criado");
    setEditing(null);
    qc.invalidateQueries({ queryKey: [queryKey] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    qc.invalidateQueries({ queryKey: [queryKey] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <button
          onClick={() => setEditing(emptyRow())}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-widest">
              <tr>
                {fields.map((f) => (
                  <th key={f.key} className="text-left p-3">{f.label}</th>
                ))}
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((row) => (
                <tr key={row.id as string} className="border-t border-border">
                  {fields.map((f) => (
                    <td key={f.key} className={`p-3 ${f.mono ? "font-mono text-xs" : ""}`}>
                      {renderCell(row[f.key], f.type)}
                    </td>
                  ))}
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(row)} className="rounded p-2 hover:bg-surface" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(row.id as string)} className="rounded p-2 text-destructive hover:bg-destructive/10" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!list.data?.length && (
                <tr>
                  <td colSpan={fields.length + 1} className="p-8 text-center text-muted-foreground">
                    Nenhum registro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing.id ? "Editar" : "Novo"}</h3>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-surface"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {f.label}{f.required && <span className="text-brand"> *</span>}
                  </label>
                  {f.type === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={!!editing[f.key]}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })}
                    />
                  ) : f.type === "datetime" ? (
                    <input
                      type="datetime-local"
                      value={editing[f.key] ? String(editing[f.key]).slice(0, 16) : ""}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={(editing[f.key] as any) ?? ""}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${f.mono ? "font-mono" : ""}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-sm font-semibold">Cancelar</button>
              <button onClick={save} className="rounded-md bg-primary px-6 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-brand transition-colors">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderCell(v: unknown, type: FieldType) {
  if (v == null || v === "") return <span className="text-muted-foreground">—</span>;
  if (type === "boolean") {
    return v ? (
      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">Sim</span>
    ) : (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">Não</span>
    );
  }
  if (type === "datetime") return new Date(v as string).toLocaleString("pt-BR");
  const s = String(v);
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}
