import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Row = { size: string; height: string; weight: string };
type Chart = { title: string; note: string; rows: Row[] };

// Medidas de referência (variam um pouco entre marcas e modelos).
const CHARTS: Record<"kimono" | "feminino" | "infantil" | "apparel", Chart> = {
  kimono: {
    title: "Kimono masculino",
    note: "Kimonos de algodão podem encolher até 3% nas primeiras lavagens. Entre dois tamanhos, escolha o maior.",
    rows: [
      { size: "A0", height: "1,55 – 1,65 m", weight: "55 – 65 kg" },
      { size: "A1", height: "1,65 – 1,72 m", weight: "65 – 75 kg" },
      { size: "A2", height: "1,72 – 1,78 m", weight: "75 – 85 kg" },
      { size: "A3", height: "1,78 – 1,85 m", weight: "85 – 95 kg" },
      { size: "A4", height: "1,85 – 1,95 m", weight: "95 – 110 kg" },
    ],
  },
  feminino: {
    title: "Kimono feminino",
    note: "Corte feminino mais ajustado no quadril. Entre dois tamanhos, escolha o maior.",
    rows: [
      { size: "F1", height: "1,50 – 1,58 m", weight: "45 – 55 kg" },
      { size: "F2", height: "1,58 – 1,65 m", weight: "55 – 65 kg" },
      { size: "F3", height: "1,65 – 1,72 m", weight: "65 – 75 kg" },
      { size: "F4", height: "1,72 – 1,80 m", weight: "75 – 90 kg" },
    ],
  },
  infantil: {
    title: "Kimono infantil",
    note: "Crianças crescem rápido: se estiver entre dois tamanhos, escolha o maior.",
    rows: [
      { size: "M0", height: "1,00 – 1,15 m", weight: "17 – 22 kg" },
      { size: "M1", height: "1,15 – 1,30 m", weight: "22 – 30 kg" },
      { size: "M2", height: "1,30 – 1,45 m", weight: "30 – 40 kg" },
      { size: "M3", height: "1,45 – 1,55 m", weight: "40 – 50 kg" },
    ],
  },
  apparel: {
    title: "Rash guards, shorts e camisetas",
    note: "Peças de compressão devem ficar justas ao corpo. Para um caimento mais solto, escolha um tamanho acima.",
    rows: [
      { size: "P", height: "1,60 – 1,70 m", weight: "55 – 65 kg" },
      { size: "M", height: "1,68 – 1,76 m", weight: "65 – 75 kg" },
      { size: "G", height: "1,74 – 1,82 m", weight: "75 – 88 kg" },
      { size: "GG", height: "1,80 – 1,90 m", weight: "88 – 100 kg" },
    ],
  },
};

function pickChart(sizeNames: string[]): Chart {
  const has = (re: RegExp) => sizeNames.some((n) => re.test(n));
  if (has(/^A\d$/)) return CHARTS.kimono;
  if (has(/^F\d$/)) return CHARTS.feminino;
  if (has(/^M\d$/)) return CHARTS.infantil;
  return CHARTS.apparel;
}

/** Botão "Guia de tamanhos" + janela com a tabela certa para o produto. */
export function SizeGuide({ sizeNames, selected }: { sizeNames: string[]; selected?: string | null }) {
  const [open, setOpen] = useState(false);
  const chart = pickChart(sizeNames);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground underline hover:text-brand"
      >
        Guia de tamanhos
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guia de tamanhos — {chart.title}</DialogTitle>
            <DialogDescription>Medidas de referência por altura e peso.</DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-widest">
                <tr>
                  <th className="px-3 py-2">Tamanho</th>
                  <th className="px-3 py-2">Altura</th>
                  <th className="px-3 py-2">Peso</th>
                </tr>
              </thead>
              <tbody>
                {chart.rows.map((r) => (
                  <tr
                    key={r.size}
                    className={`border-t border-border ${r.size === selected ? "bg-brand/10 font-semibold" : ""}`}
                  >
                    <td className="px-3 py-2 font-bold">{r.size}</td>
                    <td className="px-3 py-2">{r.height}</td>
                    <td className="px-3 py-2">{r.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">{chart.note}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
