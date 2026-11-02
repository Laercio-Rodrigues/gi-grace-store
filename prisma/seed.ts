/**
 * Seed da loja (npm run db:seed  |  npx prisma db seed).
 *
 * É IDEMPOTENTE: pode rodar quantas vezes quiser, nada é duplicado.
 *
 * Variáveis de ambiente:
 *  - ADMIN_EMAIL / ADMIN_PASSWORD  cria o primeiro administrador (se ainda não existir)
 *  - SEED_DEMO=false               pula os dados de demonstração (clientes, pedidos,
 *                                  avaliações, notas, boletos). O catálogo é sempre criado.
 *  - DEMO_PASSWORD                 senha dos clientes de teste (padrão: Teste@123)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SizeSet = "kimono" | "feminino" | "infantil" | "apparel" | "none";

type ProductSeed = {
  name: string;
  slug: string;
  description: string;
  tech: string;
  category: string;
  brand: string;
  price: number;
  sale?: number | null;
  stock: number;
  sku: string;
  weight: string;
  material: string;
  color: string;
  featured?: boolean;
  sales: number;
  sizes: SizeSet;
  images: string[];
  /** dias atrás em que o produto "entrou" no catálogo (para ordenar "mais recentes") */
  age?: number;
};

const SIZE_SETS: Record<SizeSet, [string[], number]> = {
  kimono: [["A0", "A1", "A2", "A3", "A4"], 5],
  feminino: [["F1", "F2", "F3", "F4"], 4],
  infantil: [["M0", "M1", "M2", "M3"], 6],
  apparel: [["P", "M", "G", "GG"], 8],
  none: [[], 0],
};

const PRODUCTS: ProductSeed[] = [
  // ───────── Kimonos ─────────
  { name: "Kimono Trançado Pro Branco", slug: "kimono-trancado-pro-branco", category: "kimonos", brand: "atama-pro", price: 899, sale: 749, stock: 25, sku: "KMN-PRO-WHT", weight: "1.6kg", material: "Algodão trançado", color: "Branco", featured: true, sales: 340, sizes: "kimono", images: ["asset:gi-white", "asset:hero-gi"], age: 60,
    description: "Kimono de Jiu-Jitsu top de linha, tecido trançado 550gsm, corte anatômico e reforços premium.",
    tech: "Trançado 550gsm • Calça ripstop • Reforços em EVA no colarinho • Costuras triplas" },
  { name: "Kimono Competition Azul Royal", slug: "kimono-competition-azul-royal", category: "kimonos", brand: "kingz-elite", price: 849, sale: null, stock: 25, sku: "KMN-COMP-BLU", weight: "1.4kg", material: "Algodão trançado", color: "Azul", featured: true, sales: 210, sizes: "kimono", images: ["asset:gi-blue"], age: 55,
    description: "Modelo de competição leve, aprovado pela IBJJF. Ideal para atletas que buscam performance.",
    tech: "Trançado 450gsm • IBJJF aprovado • Calça ripstop reforçada" },
  { name: "Kimono Elite Preto", slug: "kimono-elite-preto", category: "kimonos", brand: "shoyoroll-br", price: 1099, sale: 949, stock: 25, sku: "KMN-ELT-BLK", weight: "1.5kg", material: "Algodão trançado", color: "Preto", featured: true, sales: 180, sizes: "kimono", images: ["asset:gi-black"], age: 50,
    description: "Design minimalista, corte moderno e acabamento premium. Para quem treina com atitude.",
    tech: "Trançado 500gsm • Bordados discretos • Calça ripstop" },
  { name: "Kimono Iniciante Branco", slug: "kimono-iniciante-branco", category: "kimonos", brand: "tatami-fight", price: 499, sale: 399, stock: 25, sku: "KMN-STR-WHT", weight: "1.3kg", material: "Algodão", color: "Branco", sales: 520, sizes: "kimono", images: ["asset:gi-white"], age: 45,
    description: "Kimono ideal para começar. Custo-benefício imbatível e alta durabilidade.",
    tech: "Trançado 350gsm • Costuras reforçadas" },
  { name: "Kimono Pearl Weave Branco", slug: "kimono-pearl-weave-branco", category: "kimonos", brand: "venum-bjj", price: 649, sale: null, stock: 25, sku: "KMN-PRL-WHT", weight: "1.2kg", material: "Algodão pearl weave", color: "Branco", sales: 275, sizes: "kimono", images: ["asset:hero-gi", "asset:gi-white"], age: 20,
    description: "Pearl weave leve e resistente, perfeito para treinos longos e dias quentes.",
    tech: "Pearl weave 375gsm • Calça ripstop • Etiquetas removíveis" },
  { name: "Kimono Training Azul Marinho", slug: "kimono-training-azul-marinho", category: "kimonos", brand: "atama-pro", price: 579, sale: 499, stock: 25, sku: "KMN-TRN-NVY", weight: "1.4kg", material: "Algodão trançado", color: "Azul", sales: 160, sizes: "kimono", images: ["asset:gi-blue", "asset:gi-black"], age: 12,
    description: "Kimono de treino diário, resistente a lavagens frequentes e com ótimo caimento.",
    tech: "Trançado 420gsm • Costuras reforçadas • Pré-encolhido" },
  { name: "Kimono Black Edition Preto", slug: "kimono-black-edition-preto", category: "kimonos", brand: "kingz-elite", price: 959, sale: null, stock: 25, sku: "KMN-BLK-ED", weight: "1.5kg", material: "Algodão trançado", color: "Preto", featured: true, sales: 95, sizes: "kimono", images: ["asset:gi-black", "asset:hero-gi"], age: 5,
    description: "Edição limitada em preto fosco com patches discretos. Aprovado para competição.",
    tech: "Trançado 480gsm • Patches bordados • IBJJF aprovado" },
  { name: "Kimono Feminino Branco Lite", slug: "kimono-feminino-branco-lite", category: "kimonos", brand: "atama-pro", price: 679, sale: 599, stock: 16, sku: "KMN-FEM-WHT", weight: "1.1kg", material: "Algodão pearl weave", color: "Branco", featured: true, sales: 130, sizes: "feminino", images: ["asset:gi-white"], age: 18,
    description: "Corte feminino anatômico, leve e confortável, com reforços onde você mais precisa.",
    tech: "Pearl weave 350gsm • Corte feminino • Calça com cordão ajustável" },
  { name: "Kimono Feminino Preto Elite", slug: "kimono-feminino-preto-elite", category: "kimonos", brand: "shoyoroll-br", price: 899, sale: null, stock: 16, sku: "KMN-FEM-BLK", weight: "1.2kg", material: "Algodão trançado", color: "Preto", sales: 70, sizes: "feminino", images: ["asset:gi-black"], age: 9,
    description: "Versão feminina da linha Elite: acabamento premium e caimento impecável.",
    tech: "Trançado 450gsm • Bordados discretos • Calça ripstop" },
  { name: "Kimono Infantil Azul", slug: "kimono-infantil-azul", category: "kimonos", brand: "tatami-fight", price: 299, sale: 249, stock: 24, sku: "KMN-KID-BLU", weight: "0.9kg", material: "Algodão", color: "Azul", sales: 205, sizes: "infantil", images: ["asset:gi-blue"], age: 30,
    description: "Kimono infantil resistente, macio e fácil de lavar. Para os pequenos campeões.",
    tech: "Trançado 300gsm • Costuras duplas • Cordão ajustável" },
  { name: "Kimono Infantil Branco", slug: "kimono-infantil-branco", category: "kimonos", brand: "tatami-fight", price: 289, sale: null, stock: 24, sku: "KMN-KID-WHT", weight: "0.9kg", material: "Algodão", color: "Branco", sales: 190, sizes: "infantil", images: ["asset:gi-white"], age: 30,
    description: "Clássico infantil branco, leve e durável para as primeiras aulas.",
    tech: "Trançado 300gsm • Costuras duplas" },

  // ───────── Rash guards ─────────
  { name: "Rash Guard Manga Longa Preta", slug: "rash-guard-manga-longa-preta", category: "rash-guards", brand: "venum-bjj", price: 249, sale: 199, stock: 32, sku: "RSH-BLK-LS", weight: "250g", material: "Poliéster/Elastano", color: "Preto", featured: true, sales: 480, sizes: "apparel", images: ["asset:rashguard-black"], age: 40,
    description: "Rash guard preto com detalhes vermelhos. Tecido de compressão de alta performance.",
    tech: "Poliéster/Elastano • Costuras Flatlock • Anti-microbiana" },
  { name: "Rash Guard Competição Azul", slug: "rash-guard-competicao-azul", category: "rash-guards", brand: "kingz-elite", price: 269, sale: null, stock: 32, sku: "RSH-BLU-CMP", weight: "250g", material: "Poliéster/Elastano", color: "Azul", sales: 220, sizes: "apparel", images: ["asset:rashguard-black"], age: 35,
    description: "Aprovado para competição na faixa azul. Compressão muscular e secagem rápida.",
    tech: "IBJJF aprovado • Poliéster/Elastano" },
  { name: "Rash Guard Manga Curta Branca", slug: "rash-guard-manga-curta-branca", category: "rash-guards", brand: "atama-pro", price: 219, sale: 179, stock: 32, sku: "RSH-WHT-SS", weight: "200g", material: "Poliéster/Elastano", color: "Branco", sales: 150, sizes: "apparel", images: ["asset:rashguard-black"], age: 14,
    description: "Manga curta para dias quentes, com proteção UV e ótima ventilação.",
    tech: "Proteção UV50 • Costuras Flatlock • Secagem rápida" },
  { name: "Rash Guard Ranked Vermelha", slug: "rash-guard-ranked-vermelha", category: "rash-guards", brand: "venum-bjj", price: 289, sale: null, stock: 32, sku: "RSH-RED-RNK", weight: "260g", material: "Poliéster/Elastano", color: "Vermelho", sales: 88, sizes: "apparel", images: ["asset:rashguard-black"], age: 3,
    description: "Linha Ranked com barra de graduação: mostre sua faixa também no no-gi.",
    tech: "Compressão média • Barra de graduação • Anti-microbiana" },

  // ───────── Shorts ─────────
  { name: "Shorts Grappling Preto", slug: "shorts-grappling-preto", category: "shorts", brand: "venum-bjj", price: 199, sale: 159, stock: 32, sku: "SHR-GRP-BLK", weight: "200g", material: "Poliéster ripstop", color: "Preto", featured: true, sales: 610, sizes: "apparel", images: ["asset:shorts"], age: 38,
    description: "Short para no-gi com faixa lateral vermelha. Liberdade total de movimento.",
    tech: "Poliéster ripstop • Elástico ajustável • Costuras reforçadas" },
  { name: "Shorts Fight Vermelho", slug: "shorts-fight-vermelho", category: "shorts", brand: "tatami-fight", price: 219, sale: null, stock: 32, sku: "SHR-FGT-RED", weight: "200g", material: "Poliéster ripstop", color: "Vermelho", sales: 140, sizes: "apparel", images: ["asset:shorts"], age: 33,
    description: "Design agressivo, ideal para MMA e no-gi. Split lateral para máxima mobilidade.",
    tech: "Poliéster ripstop • Split lateral" },
  { name: "Shorts Jiu-Jitsu Azul Marinho", slug: "shorts-jiu-jitsu-azul-marinho", category: "shorts", brand: "atama-pro", price: 189, sale: 149, stock: 32, sku: "SHR-JJ-NVY", weight: "190g", material: "Poliéster", color: "Azul", sales: 120, sizes: "apparel", images: ["asset:shorts"], age: 10,
    description: "Short leve sem bolsos, com velcro e cordão para não abrir durante o rolamento.",
    tech: "Velcro + cordão • Sem bolsos • Costuras reforçadas" },

  // ───────── Faixas ─────────
  { name: "Faixa Preta Premium", slug: "faixa-preta-premium", category: "faixas", brand: "atama-pro", price: 289, sale: null, stock: 30, sku: "BLT-BLK-PRM", weight: "400g", material: "Algodão", color: "Preto", featured: true, sales: 190, sizes: "none", images: ["asset:belts"], age: 42,
    description: "Faixa preta oficial, algodão pesado, ponta rígida e acabamento impecável.",
    tech: "Algodão 100% • Ponta preta • Tecido duplo" },
  { name: "Faixa Azul Adulto", slug: "faixa-azul-adulto", category: "faixas", brand: "tatami-fight", price: 169, sale: 139, stock: 55, sku: "BLT-BLU-ADT", weight: "350g", material: "Algodão", color: "Azul", sales: 380, sizes: "none", images: ["asset:belts"], age: 41,
    description: "Faixa azul adulto oficial, tecido resistente para treinos intensos.",
    tech: "Algodão 100% • Costuras duplas" },
  { name: "Faixa Branca Adulto", slug: "faixa-branca-adulto", category: "faixas", brand: "tatami-fight", price: 99, sale: null, stock: 70, sku: "BLT-WHT-ADT", weight: "320g", material: "Algodão", color: "Branco", sales: 410, sizes: "none", images: ["asset:belts"], age: 41,
    description: "A faixa de todo começo. Macia, resistente e com ponta preta rígida.",
    tech: "Algodão 100% • Costuras duplas" },
  { name: "Faixa Roxa Adulto", slug: "faixa-roxa-adulto", category: "faixas", brand: "kingz-elite", price: 179, sale: null, stock: 40, sku: "BLT-PRP-ADT", weight: "350g", material: "Algodão", color: "Roxo", sales: 150, sizes: "none", images: ["asset:belts"], age: 25,
    description: "Faixa roxa adulto com tecido encorpado que mantém o nó firme.",
    tech: "Algodão 100% • Costuras duplas" },
  { name: "Faixa Marrom Adulto", slug: "faixa-marrom-adulto", category: "faixas", brand: "kingz-elite", price: 189, sale: 159, stock: 35, sku: "BLT-BRN-ADT", weight: "350g", material: "Algodão", color: "Marrom", sales: 85, sizes: "none", images: ["asset:belts"], age: 25,
    description: "Faixa marrom adulto com acabamento premium e ponta rígida.",
    tech: "Algodão 100% • Costuras duplas" },

  // ───────── Camisetas ─────────
  { name: "Camiseta Team Preta", slug: "camiseta-team-preta", category: "camisetas", brand: "kingz-elite", price: 129, sale: 99, stock: 32, sku: "TSH-TEAM-BLK", weight: "180g", material: "Algodão", color: "Preto", sales: 260, sizes: "apparel", images: ["asset:rashguard-black"], age: 28,
    description: "Camiseta oficial com estampa exclusiva. Algodão premium, corte moderno.",
    tech: "100% algodão penteado • Estampa em silk" },
  { name: "Camiseta Dry Fit Vermelha", slug: "camiseta-dry-fit-vermelha", category: "camisetas", brand: "venum-bjj", price: 119, sale: null, stock: 32, sku: "TSH-DRY-RED", weight: "150g", material: "Poliéster dry fit", color: "Vermelho", sales: 105, sizes: "apparel", images: ["asset:rashguard-black"], age: 7,
    description: "Camiseta dry fit para treinar ou usar no dia a dia, seca rápido e não retém odor.",
    tech: "Poliéster dry fit • Tecnologia anti-odor" },
  { name: "Camiseta OSS Branca", slug: "camiseta-oss-branca", category: "camisetas", brand: "atama-pro", price: 109, sale: 89, stock: 32, sku: "TSH-OSS-WHT", weight: "180g", material: "Algodão", color: "Branco", sales: 75, sizes: "apparel", images: ["asset:rashguard-black"], age: 4,
    description: "Estampa OSS minimalista em algodão macio. O básico que combina com tudo.",
    tech: "100% algodão penteado • Estampa em silk" },

  // ───────── Acessórios ─────────
  { name: "Protetor Bucal Duplo", slug: "protetor-bucal-duplo", category: "acessorios", brand: "venum-bjj", price: 79, sale: 59, stock: 200, sku: "ACC-MTH-DBL", weight: "30g", material: "Gel EVA", color: "Transparente", sales: 720, sizes: "none", images: ["asset:shorts"], age: 36,
    description: "Proteção máxima para treinos e competição. Moldável e higiênico.",
    tech: "Gel dual-layer • Case incluso" },
  { name: "Mochila Esportiva Academia", slug: "mochila-esportiva-academia", category: "acessorios", brand: "kingz-elite", price: 219, sale: 179, stock: 40, sku: "ACC-BAG-GYM", weight: "700g", material: "Poliéster 600D", color: "Preto", sales: 115, sizes: "none", images: ["asset:belts"], age: 16,
    description: "Mochila com compartimento ventilado para kimono molhado e bolso para acessórios.",
    tech: "Poliéster 600D • Compartimento ventilado • 35L" },
  { name: "Fita Atlética (Tape) 3 rolos", slug: "fita-atletica-tape-3-rolos", category: "acessorios", brand: "venum-bjj", price: 49, sale: null, stock: 150, sku: "ACC-TAPE-3", weight: "120g", material: "Algodão adesivo", color: "Branco", sales: 330, sizes: "none", images: ["asset:belts"], age: 22,
    description: "Fita atlética para proteger dedos e articulações durante o treino.",
    tech: "3 rolos de 3,8cm x 13,7m • Adesivo hipoalergênico" },
];

const SIZE_ORDER = [
  "A0", "A1", "A2", "A3", "A4",
  "F1", "F2", "F3", "F4",
  "M0", "M1", "M2", "M3",
  "P", "M", "G", "GG",
];

const day = 24 * 3600 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * day);
const money = (n: number) => Math.round(n * 100) / 100;

async function seedCatalog() {
  // ── Categorias, marcas e tamanhos ──
  const cats: [string, string][] = [
    ["Kimonos", "kimonos"], ["Rash Guards", "rash-guards"], ["Faixas", "faixas"],
    ["Shorts", "shorts"], ["Camisetas", "camisetas"], ["Acessórios", "acessorios"],
  ];
  for (const [i, [name, slug]] of cats.entries())
    await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug, position: i + 1 } });

  const brands: [string, string][] = [
    ["Atama Pro", "atama-pro"], ["Kingz Elite", "kingz-elite"], ["Tatami Fight", "tatami-fight"],
    ["Venum BJJ", "venum-bjj"], ["Shoyoroll BR", "shoyoroll-br"],
  ];
  for (const [name, slug] of brands)
    await prisma.brand.upsert({ where: { slug }, update: {}, create: { name, slug } });

  for (const [i, name] of SIZE_ORDER.entries())
    await prisma.size.upsert({ where: { name }, update: {}, create: { name, position: i + 1 } });

  const catId = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  const brandId = new Map((await prisma.brand.findMany()).map((b) => [b.slug, b.id]));
  const sizeId = new Map((await prisma.size.findMany()).map((s) => [s.name, s.id]));

  // ── Produtos ──
  let created = 0;
  for (const p of PRODUCTS) {
    if (await prisma.product.findUnique({ where: { slug: p.slug } })) continue;
    const product = await prisma.product.create({
      data: {
        name: p.name, slug: p.slug, description: p.description, technical_description: p.tech,
        price: p.price, sale_price: p.sale ?? null, stock: p.stock, sku: p.sku,
        weight: p.weight, material: p.material, color: p.color,
        featured: p.featured ?? false, sales_count: p.sales, created_at: daysAgo(p.age ?? 30),
        // dados fiscais padrão (edite em Admin > Produtos)
        ncm: p.category === "kimonos" ? "62113300" : "61099000", cfop: "5102", origin: "0",
        cst: "102", unit: "UN",
        category_id: catId.get(p.category)!, brand_id: brandId.get(p.brand)!,
        images: { create: p.images.map((image_url, position) => ({ image_url, position })) },
      },
    });
    const [names, qty] = SIZE_SETS[p.sizes];
    for (const n of names)
      await prisma.productSize.create({
        data: { product_id: product.id, size_id: sizeId.get(n)!, stock: qty },
      });
    created++;
  }
  console.log(`Catálogo: ${created} produto(s) novo(s), ${PRODUCTS.length - created} já existiam.`);

  // ── Cupons ──
  for (const [code, discount_percent, expires, active] of [
    ["BEMVINDO10", 10, null, true], ["KIMONO15", 15, null, true],
    ["BLACKAPS20", 20, new Date(Date.now() + 30 * day), true],
    ["FRETEZERO", 5, new Date(Date.now() + 15 * day), true],
    ["NATAL25", 25, new Date(Date.now() - 20 * day), false],
  ] as const)
    await prisma.coupon.upsert({ where: { code }, update: {}, create: { code, discount_percent, expires_at: expires, active } });

  // ── Banners ──
  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.createMany({
      data: [
        { title: "Coleção Competição 2026", subtitle: "Kimonos homologados IBJJF com até 20% OFF", image_url: "asset:hero-gi", link: "/produtos?categoria=kimonos", position: 1 },
        { title: "Rash Guards Pro", subtitle: "Compressão premium para treinos intensos", image_url: "asset:rashguard-black", link: "/produtos?categoria=rash-guards", position: 2 },
        { title: "Faixas Premium", subtitle: "Algodão trançado com reforço duplo", image_url: "asset:belts", link: "/produtos?categoria=faixas", position: 3 },
      ],
    });
  }

  // ── Empresa (dados de exemplo: edite em Admin > Empresa) ──
  if ((await prisma.companySettings.count()) === 0) {
    await prisma.companySettings.create({
      data: {
        legal_name: "APS Kimonos Comercio de Artigos Esportivos LTDA", trade_name: "APS Kimonos Store",
        cnpj: "12345678000195", ie: "112233445", im: "987654", crt: "1",
        street: "Avenida Paulista", number: "1578", complement: "Sala 1204", district: "Bela Vista",
        city: "São Paulo", city_code: "3550308", state: "SP", zip_code: "01310200",
        phone: "(11) 98877-6655", email: "contato@apskimonos.com.br", nfe_series: "1",
      },
    });
  }
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || password.length < 6) {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD não definidos (ou senha < 6): nenhum administrador criado.");
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // garante o papel de admin mesmo que a conta já exista (ex.: criada pelo site)
    await prisma.userRole.upsert({
      where: { user_id_role: { user_id: existing.id, role: "admin" } },
      update: {},
      create: { user_id: existing.id, role: "admin" },
    });
    console.log(`Administrador já existia: ${email}`);
    return;
  }
  const user = await prisma.user.create({ data: { email, password_hash: await bcrypt.hash(password, 12) } });
  await prisma.profile.create({ data: { id: user.id, name: "Administrador", email } });
  await prisma.userRole.createMany({
    data: [{ user_id: user.id, role: "customer" }, { user_id: user.id, role: "admin" }],
  });
  console.log(`Administrador criado: ${email}`);
}

// ───────────────────────── Dados de demonstração ─────────────────────────

const DEMO_CUSTOMERS = [
  { email: "cliente@teste.com", name: "Cliente Teste", phone: "(11) 91234-5678",
    address: { street: "Rua Augusta", number: "1200", complement: "Apto 41", district: "Consolação", city: "São Paulo", state: "SP", zip_code: "01304001" } },
  { email: "maria@teste.com", name: "Maria Souza", phone: "(21) 99876-5432",
    address: { street: "Avenida Atlântica", number: "500", complement: "", district: "Copacabana", city: "Rio de Janeiro", state: "RJ", zip_code: "22010000" } },
  { email: "joao@teste.com", name: "João Pereira", phone: "(31) 98765-4321",
    address: { street: "Rua da Bahia", number: "88", complement: "", district: "Centro", city: "Belo Horizonte", state: "MG", zip_code: "30160011" } },
];

type DemoOrder = {
  customer: number;
  daysAgo: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  payment: "pix" | "credit" | "cash" | "mercadopago";
  coupon?: number; // % de desconto
  items: [slug: string, size: string | null, qty: number][];
};

const DEMO_ORDERS: DemoOrder[] = [
  { customer: 0, daysAgo: 28, status: "delivered", payment: "pix", items: [["kimono-trancado-pro-branco", "A2", 1], ["faixa-azul-adulto", null, 1]] },
  { customer: 0, daysAgo: 12, status: "shipped", payment: "credit", coupon: 10, items: [["rash-guard-manga-longa-preta", "M", 2], ["shorts-grappling-preto", "M", 1]] },
  { customer: 0, daysAgo: 1, status: "pending", payment: "mercadopago", items: [["protetor-bucal-duplo", null, 1]] },
  { customer: 1, daysAgo: 20, status: "delivered", payment: "credit", items: [["kimono-feminino-branco-lite", "F2", 1]] },
  { customer: 1, daysAgo: 6, status: "paid", payment: "pix", coupon: 15, items: [["kimono-elite-preto", "A1", 1], ["camiseta-team-preta", "P", 2]] },
  { customer: 2, daysAgo: 15, status: "cancelled", payment: "pix", items: [["kimono-competition-azul-royal", "A3", 1]] },
  { customer: 2, daysAgo: 3, status: "paid", payment: "credit", items: [["kimono-infantil-azul", "M1", 1], ["faixa-branca-adulto", null, 1]] },
  { customer: 2, daysAgo: 0, status: "pending", payment: "cash", items: [["mochila-esportiva-academia", null, 1], ["fita-atletica-tape-3-rolos", null, 2]] },
];

const DEMO_REVIEWS: [customer: number, slug: string, rating: number, comment: string][] = [
  [0, "kimono-trancado-pro-branco", 5, "Kimono incrível, caimento perfeito e muito resistente. Recomendo!"],
  [1, "kimono-trancado-pro-branco", 4, "Muito bom, só encolheu um pouco na primeira lavagem."],
  [2, "kimono-trancado-pro-branco", 5, "Melhor custo-benefício que já comprei para competição."],
  [0, "rash-guard-manga-longa-preta", 5, "Compressão ótima e não solta nada no treino."],
  [1, "rash-guard-manga-longa-preta", 5, "Secagem rápida e o tecido é excelente."],
  [1, "kimono-feminino-branco-lite", 5, "Corte feminino de verdade, finalmente um kimono que serve!"],
  [2, "kimono-infantil-azul", 4, "Meu filho adorou, resistente e confortável."],
  [0, "shorts-grappling-preto", 4, "Leve e firme, não abre no rolamento."],
  [2, "faixa-branca-adulto", 5, "Faixa boa e bem acabada, ponta firme."],
  [0, "faixa-azul-adulto", 5, "Tecido encorpado, o nó fica firme."],
];

async function seedDemo() {
  const password_hash = await bcrypt.hash(process.env.DEMO_PASSWORD || "Teste@123", 12);
  const customers: string[] = [];

  for (const c of DEMO_CUSTOMERS) {
    let user = await prisma.user.findUnique({ where: { email: c.email } });
    if (!user) {
      user = await prisma.user.create({ data: { email: c.email, password_hash } });
      await prisma.profile.create({ data: { id: user.id, name: c.name, email: c.email, phone: c.phone } });
      await prisma.userRole.create({ data: { user_id: user.id, role: "customer" } });
      await prisma.address.create({ data: { user_id: user.id, is_default: true, ...c.address } });
    }
    customers.push(user.id);
  }

  const products = new Map((await prisma.product.findMany({ include: { images: { orderBy: { position: "asc" } } } })).map((p) => [p.slug, p]));

  // Favoritos e avaliações
  for (const [ci, slug, rating, comment] of DEMO_REVIEWS) {
    const product = products.get(slug);
    if (!product) continue;
    await prisma.review.upsert({
      where: { user_id_product_id: { user_id: customers[ci], product_id: product.id } },
      update: {},
      create: { user_id: customers[ci], product_id: product.id, rating, comment },
    });
  }
  for (const [ci, slug] of [[0, "kimono-elite-preto"], [0, "faixa-preta-premium"], [1, "kimono-pearl-weave-branco"], [2, "rash-guard-ranked-vermelha"]] as const) {
    const product = products.get(slug);
    if (!product) continue;
    await prisma.favorite.upsert({
      where: { user_id_product_id: { user_id: customers[ci], product_id: product.id } },
      update: {},
      create: { user_id: customers[ci], product_id: product.id },
    });
  }

  // Pedidos (só se a loja ainda não tem nenhum: assim nunca duplica nem mexe em pedidos reais)
  const hasOrders = (await prisma.order.count()) > 0;
  const createdOrders: { id: string; total: number; payment: string; status: string; customer: number; at: Date }[] = [];
  if (!hasOrders) {
    for (const o of DEMO_ORDERS) {
      const lines = o.items.map(([slug, size, qty]) => {
        const p = products.get(slug);
        if (!p) throw new Error(`Produto do seed não encontrado: ${slug}`);
        return { p, size, qty, unit: Number(p.sale_price ?? p.price) };
      });
      const subtotal = money(lines.reduce((n, l) => n + l.unit * l.qty, 0));
      const discount = money(subtotal * ((o.coupon ?? 0) / 100));
      const shipping = subtotal > 499 ? 0 : 39.9;
      const total = money(subtotal - discount + shipping);
      const at = daysAgo(o.daysAgo);
      const paid = ["paid", "shipped", "delivered"].includes(o.status);
      const order = await prisma.order.create({
        data: {
          user_id: customers[o.customer], status: o.status, subtotal, shipping, discount, total,
          payment_method: o.payment, address_json: DEMO_CUSTOMERS[o.customer].address,
          payment_status: paid ? "approved" : o.status === "cancelled" ? "cancelled" : "pending",
          paid_at: paid ? at : null, created_at: at, updated_at: at,
          items: {
            create: lines.map((l) => ({
              product_id: l.p.id, product_name: l.p.name, product_image: l.p.images[0]?.image_url ?? null,
              size_name: l.size, quantity: l.qty, price: l.unit,
            })),
          },
        },
      });
      createdOrders.push({ id: order.id, total, payment: o.payment, status: o.status, customer: o.customer, at });
    }
    console.log(`Demo: ${createdOrders.length} pedidos criados.`);
  }

  // Recibos para pedidos pagos/entregues
  if ((await prisma.invoice.count()) === 0) {
    let number = 0;
    for (const o of createdOrders.filter((x) => ["paid", "shipped", "delivered"].includes(x.status)).slice(0, 4)) {
      number++;
      const order = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { items: true } });
      await prisma.invoice.create({
        data: {
          order_id: order.id, type: "receipt", number, series: "1", status: "paid",
          customer_name: DEMO_CUSTOMERS[o.customer].name, customer_email: DEMO_CUSTOMERS[o.customer].email,
          products_total: order.subtotal, shipping: order.shipping, discount: order.discount, total: order.total,
          payment_method: o.payment, issued_at: o.at, payload: {},
          items: {
            create: order.items.map((it, position) => ({
              position, product_id: it.product_id, description: it.size_name ? `${it.product_name} (${it.size_name})` : it.product_name,
              unit: "UN", quantity: it.quantity, unit_price: it.price, total: money(Number(it.price) * it.quantity),
            })),
          },
        },
      });
    }
    console.log(`Demo: ${number} recibo(s) criados.`);
  }

  // Boletos a pagar e conta bancária de exemplo
  if ((await prisma.bill.count()) === 0) {
    await prisma.bill.createMany({
      data: [
        { description: "Fornecedor de kimonos — lote 14", supplier: "Atama Pro Ltda", category: "Fornecedor", amount: 4850, due_date: daysAgo(-7), status: "pending" },
        { description: "Aluguel do galpão", supplier: "Imobiliária Central", category: "Aluguel", amount: 3200, due_date: daysAgo(-12), status: "pending" },
        { description: "Embalagens e etiquetas", supplier: "Pack Brasil", category: "Insumos", amount: 640.5, due_date: daysAgo(5), status: "paid", paid_at: daysAgo(5), paid_amount: 640.5 },
        { description: "Energia elétrica", supplier: "Concessionária", category: "Contas", amount: 389.9, due_date: daysAgo(3), status: "pending" },
      ],
    });
  }
  if ((await prisma.paymentAccount.count()) === 0) {
    await prisma.paymentAccount.create({
      data: {
        label: "Conta principal", bank_name: "Banco de Exemplo", bank_code: "000", agency: "0001",
        account_number: "12345-6", account_type: "corrente", holder_name: "APS Kimonos Comercio LTDA",
        holder_doc: "12.345.678/0001-95", pix_key_type: "email", pix_key: "contato@apskimonos.com.br",
        is_default: true,
      },
    });
  }
  console.log(`Demo pronta. Clientes de teste: ${DEMO_CUSTOMERS.map((c) => c.email).join(", ")} (senha: ${process.env.DEMO_PASSWORD ? "DEMO_PASSWORD" : "Teste@123"})`);
}

async function main() {
  await seedCatalog();
  await seedAdmin();
  if (process.env.SEED_DEMO === "false") console.log("SEED_DEMO=false: dados de demonstração ignorados.");
  else await seedDemo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
