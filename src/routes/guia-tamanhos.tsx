import { createFileRoute, Link } from "@tanstack/react-router";
import { CHARTS, SizeChartTable } from "@/components/size-guide";
import { SITE_URL } from "@/lib/site";

const URL = `${SITE_URL}/guia-tamanhos`;
const TITLE = "Guia de tamanhos: kimonos, rash guards, shorts e camisetas";
const DESCRIPTION =
  "Descubra o tamanho certo do seu kimono de Jiu-Jitsu e das peças de treino, por altura e peso.";

export const Route = createFileRoute("/guia-tamanhos")({
  head: () => ({
    meta: [
      { title: `${TITLE} — Kimono Store Pro` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: SizeGuidePage,
});

function SizeGuidePage() {
  const charts = [CHARTS.kimono, CHARTS.feminino, CHARTS.infantil, CHARTS.apparel];
  return (
    <div className="container-app max-w-3xl py-12">
      <h1 className="text-3xl font-extrabold uppercase tracking-tight">Guia de tamanhos</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Medidas de referência por altura e peso. Podem variar um pouco entre marcas e modelos; na dúvida entre dois
        tamanhos, escolha o maior.
      </p>

      <div className="mt-8 space-y-10">
        {charts.map((c) => (
          <section key={c.title}>
            <h2 className="mb-3 text-lg font-bold">{c.title}</h2>
            <SizeChartTable chart={c} />
            <p className="mt-2 text-xs text-muted-foreground">{c.note}</p>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm">
        Procurando o tamanho da faixa?{" "}
        <Link to="/guia-faixas" className="font-semibold text-brand underline">
          Veja o guia de faixas
        </Link>
        .
      </p>
    </div>
  );
}
