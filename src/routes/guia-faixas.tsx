import { createFileRoute, Link } from "@tanstack/react-router";

const SITE_URL = "https://gi-grace-store.lovable.app";
const URL = `${SITE_URL}/guia-faixas`;
const TITLE = "Faixas de Jiu-Jitsu: guia completo da graduação";
const DESCRIPTION =
  "Guia completo das faixas de Jiu-Jitsu: ordem das cores, graus, tempo médio de cada graduação, faixas infantis e como escolher o tamanho certo.";

type Belt = {
  color: string;
  swatch: string;
  time: string;
  summary: string;
  requirements: string[];
};

const ADULT_BELTS: Belt[] = [
  {
    color: "Faixa Branca",
    swatch: "bg-white border border-border",
    time: "1 a 2 anos",
    summary:
      "O ponto de partida de todo praticante. O foco está em sobreviver, entender posições e criar o hábito do treino.",
    requirements: [
      "Aprender as posições básicas: guarda, meia-guarda, montada, cem quilos e pegada nas costas",
      "Dominar as primeiras finalizações: armlock, triângulo, estrangulamento de gola e americana",
      "Frequência constante — normalmente 2 a 3 treinos por semana",
    ],
  },
  {
    color: "Faixa Azul",
    swatch: "bg-[#1D4ED8]",
    time: "2 a 3 anos",
    summary:
      "A primeira graduação adulta oficial. O aluno já se defende bem e começa a construir um jogo próprio.",
    requirements: [
      "Idade mínima de 16 anos pelas regras da IBJJF",
      "Repertório amplo de raspagens, passagens de guarda e defesas",
      "Capacidade de treinar com segurança com praticantes mais experientes",
    ],
  },
  {
    color: "Faixa Roxa",
    swatch: "bg-[#6D28D9]",
    time: "1,5 a 3 anos",
    summary:
      "Considerada a faixa da técnica refinada. O jogo fica pessoal, com sequências encadeadas e timing apurado.",
    requirements: [
      "Idade mínima de 16 anos e domínio consolidado do jogo em pé e no solo",
      "Encadeamento de ataques e transições em vez de movimentos isolados",
      "Início da vivência como monitor, ajudando faixas brancas e azuis",
    ],
  },
  {
    color: "Faixa Marrom",
    swatch: "bg-[#78350F]",
    time: "1 a 2 anos",
    summary:
      "A etapa de amadurecimento antes da preta. O praticante afina detalhes e reduz erros.",
    requirements: [
      "Idade mínima de 18 anos",
      "Jogo eficiente, econômico e adaptado ao próprio biotipo",
      "Participação ativa na formação dos alunos da academia",
    ],
  },
  {
    color: "Faixa Preta",
    swatch: "bg-[#111111]",
    time: "a partir dos 19 anos",
    summary:
      "Não é o fim da jornada: é o início do papel de professor e referência dentro do tatame.",
    requirements: [
      "Idade mínima de 19 anos pela IBJJF",
      "Domínio técnico completo e entendimento profundo dos conceitos",
      "Graus a cada 3 anos nos primeiros níveis, evoluindo depois para coral e vermelha",
    ],
  },
];

const KIDS_BELTS = [
  "Branca",
  "Cinza e branca",
  "Cinza",
  "Cinza e preta",
  "Amarela e branca",
  "Amarela",
  "Amarela e preta",
  "Laranja e branca",
  "Laranja",
  "Laranja e preta",
  "Verde e branca",
  "Verde",
  "Verde e preta",
];

const SIZES = [
  { size: "A1", height: "1,55 m – 1,65 m", weight: "55 – 65 kg" },
  { size: "A2", height: "1,65 m – 1,75 m", weight: "65 – 78 kg" },
  { size: "A3", height: "1,75 m – 1,85 m", weight: "78 – 90 kg" },
  { size: "A4", height: "1,85 m – 1,95 m", weight: "90 – 105 kg" },
];

const FAQ = [
  {
    q: "Quanto tempo leva para chegar à faixa preta no Jiu-Jitsu?",
    a: "Em média de 8 a 12 anos de treino consistente. O tempo varia conforme frequência semanal, competições e a avaliação do professor responsável pela graduação.",
  },
  {
    q: "Qual é a ordem das faixas de Jiu-Jitsu adulto?",
    a: "Branca, azul, roxa, marrom e preta. Depois da preta vêm os graus, a faixa coral (vermelha e preta), a coral vermelha e branca e, por fim, a faixa vermelha.",
  },
  {
    q: "O que significam os graus na faixa?",
    a: "Os graus são as listras aplicadas na ponta da faixa. Cada faixa colorida pode receber até quatro graus antes da promoção para a cor seguinte.",
  },
  {
    q: "Como escolher o tamanho da faixa?",
    a: "A faixa deve dar duas voltas na cintura e sobrar cerca de 30 cm de cada lado após o nó. O tamanho normalmente acompanha o tamanho do kimono: A1 usa faixa A1, e assim por diante.",
  },
  {
    q: "Pode lavar a faixa de Jiu-Jitsu?",
    a: "Pode e deve. A ideia de que lavar a faixa apaga o conhecimento é apenas folclore — higiene é parte da etiqueta do tatame. Lave em água fria e seque à sombra.",
  },
];

export const Route = createFileRoute("/guia-faixas")({
  head: () => ({
    meta: [
      { title: `${TITLE} — Kimono Store Pro` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: TITLE,
              description: DESCRIPTION,
              inLanguage: "pt-BR",
              mainEntityOfPage: URL,
              publisher: { "@id": `${SITE_URL}/#organization` },
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQ.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
                { "@type": "ListItem", position: 2, name: "Guia de faixas", item: URL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: BeltGuidePage,
});

function BeltGuidePage() {
  return (
    <article className="container-app py-12 md:py-16 max-w-3xl">
      <nav aria-label="Trilha de navegação" className="text-xs uppercase tracking-widest text-muted-foreground">
        <Link to="/" className="hover:text-brand">
          Início
        </Link>
        <span className="mx-2 opacity-40">/</span>
        <span className="text-foreground">Guia de faixas</span>
      </nav>

      <h1 className="mt-6 text-display text-4xl md:text-5xl">
        Faixas de Jiu-Jitsu: o guia completo da graduação
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Da branca à preta, cada faixa de Jiu-Jitsu marca uma etapa de amadurecimento técnico e
        pessoal. Abaixo você encontra a ordem das cores, o tempo médio em cada graduação, o que se
        espera do praticante e como escolher a faixa certa para o seu kimono.
      </p>

      <section className="mt-12" aria-labelledby="adulto">
        <h2 id="adulto" className="text-display text-2xl md:text-3xl">
          Ordem das faixas no Jiu-Jitsu adulto
        </h2>
        <div className="mt-6 space-y-4">
          {ADULT_BELTS.map((b) => (
            <div key={b.color} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className={`h-5 w-10 rounded-sm ${b.swatch}`} aria-hidden="true" />
                <h3 className="text-lg font-bold uppercase tracking-wide">{b.color}</h3>
                <span className="ml-auto text-xs uppercase tracking-widest text-muted-foreground">
                  {b.time}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{b.summary}</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {b.requirements.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="text-brand" aria-hidden="true">
                      —
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="graus">
        <h2 id="graus" className="text-display text-2xl md:text-3xl">
          Graus, ponteira e o que vem depois da faixa preta
        </h2>
        <p className="mt-4 text-muted-foreground">
          Entre uma cor e outra, o professor concede <strong>graus</strong> — as listras aplicadas
          na ponteira preta da faixa. Cada faixa colorida admite até quatro graus. Na faixa preta,
          os primeiros graus costumam vir a cada três anos. Após o sétimo grau, o praticante recebe
          a faixa coral (vermelha e preta); no oitavo, a coral vermelha e branca; e, no nono e
          décimo, a faixa vermelha, reservada aos grandes mestres da arte.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="infantil">
        <h2 id="infantil" className="text-display text-2xl md:text-3xl">
          Faixas infantis (4 a 15 anos)
        </h2>
        <p className="mt-4 text-muted-foreground">
          O sistema infantil tem mais etapas para manter as crianças motivadas. A sequência
          oficial da IBJJF é:
        </p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {KIDS_BELTS.map((k, i) => (
            <li key={k} className="flex gap-3 rounded-md bg-surface px-4 py-2 text-sm">
              <span className="font-bold text-brand">{String(i + 1).padStart(2, "0")}</span>
              <span>{k}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">
          Aos 16 anos o atleta migra para o sistema adulto, entrando como faixa azul quando já
          tiver alcançado as graduações verdes.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="tamanho">
        <h2 id="tamanho" className="text-display text-2xl md:text-3xl">
          Como escolher o tamanho da faixa
        </h2>
        <p className="mt-4 text-muted-foreground">
          A faixa deve dar duas voltas na cintura e sobrar cerca de 30 cm de cada lado depois do
          nó. Na prática, o tamanho acompanha o do kimono:
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Tabela de tamanhos de faixa por altura e peso do praticante
            </caption>
            <thead className="bg-surface text-xs uppercase tracking-widest">
              <tr>
                <th scope="col" className="p-3 text-left">
                  Tamanho
                </th>
                <th scope="col" className="p-3 text-left">
                  Altura
                </th>
                <th scope="col" className="p-3 text-left">
                  Peso
                </th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((s) => (
                <tr key={s.size} className="border-t border-border">
                  <th scope="row" className="p-3 text-left font-bold">
                    {s.size}
                  </th>
                  <td className="p-3 text-muted-foreground">{s.height}</td>
                  <td className="p-3 text-muted-foreground">{s.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Faixas de algodão trançado encolhem levemente na primeira lavagem — em caso de dúvida
          entre dois tamanhos, escolha o maior.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="faq">
        <h2 id="faq" className="text-display text-2xl md:text-3xl">
          Perguntas frequentes sobre faixas de Jiu-Jitsu
        </h2>
        <dl className="mt-6 space-y-5">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-lg border border-border bg-card p-5">
              <dt className="font-bold">{f.q}</dt>
              <dd className="mt-2 text-sm text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <aside className="mt-12 rounded-lg bg-primary p-8 text-primary-foreground">
        <h2 className="text-display text-2xl">Pronto para a próxima graduação?</h2>
        <p className="mt-2 text-sm opacity-80">
          Faixas oficiais de algodão trançado, kimonos e rash guards das melhores marcas de BJJ.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/produtos"
            search={{ categoria: "faixas" }}
            className="inline-flex items-center rounded-md bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-brand-foreground hover:opacity-90"
          >
            Ver faixas
          </Link>
          <Link
            to="/produtos"
            search={{ categoria: "kimonos" }}
            className="inline-flex items-center rounded-md border border-primary-foreground/30 px-5 py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-primary-foreground/10"
          >
            Ver kimonos
          </Link>
        </div>
      </aside>
    </article>
  );
}
