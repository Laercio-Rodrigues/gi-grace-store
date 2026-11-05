import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Categorias, marcas e tamanhos ──
  const cats = [
    ["Kimonos", "kimonos"], ["Rash Guards", "rash-guards"], ["Faixas", "faixas"],
    ["Shorts", "shorts"], ["Camisetas", "camisetas"], ["Acessórios", "acessorios"],
  ];
  for (const [i, [name, slug]] of cats.entries())
    await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug, position: i + 1 } });

  const brands = [
    ["Atama Pro", "atama-pro"], ["Kingz Elite", "kingz-elite"], ["Tatami Fight", "tatami-fight"],
    ["Venum BJJ", "venum-bjj"], ["Shoyoroll BR", "shoyoroll-br"],
  ];
  for (const [name, slug] of brands)
    await prisma.brand.upsert({ where: { slug }, update: {}, create: { name, slug } });

  const sizeNames = ["A0", "A1", "A2", "A3", "A4", "P", "M", "G", "GG"];
  for (const [i, name] of sizeNames.entries())
    await prisma.size.upsert({ where: { name }, update: {}, create: { name, position: i + 1 } });

  const cat = async (slug: string) => (await prisma.category.findUniqueOrThrow({ where: { slug } })).id;
  const brand = async (slug: string) => (await prisma.brand.findUniqueOrThrow({ where: { slug } })).id;

  // ── Produtos ──
  type P = [string, string, string, string, string, string, number, number | null, number, string, string, string, string, boolean, number, string, string[]];
  const products: P[] = [
    ["Kimono Trançado Pro Branco", "kimono-trancado-pro-branco", "Kimono de Jiu-Jitsu top de linha, tecido trançado 550gsm, corte anatômico e reforços premium.", "Trançado 550gsm • Calça ripstop • Reforços em EVA no colarinho • Costuras triplas", "kimonos", "atama-pro", 899, 749, 25, "KMN-PRO-WHT", "1.6kg", "Algodão trançado", "Branco", true, 340, "kimono", ["asset:gi-white", "asset:hero-gi"]],
    ["Kimono Competition Azul Royal", "kimono-competition-azul-royal", "Modelo de competição leve, aprovado pela IBJJF. Ideal para atletas que buscam performance.", "Trançado 450gsm • IBJJF aprovado • Calça ripstop reforçada", "kimonos", "kingz-elite", 849, null, 18, "KMN-COMP-BLU", "1.4kg", "Algodão trançado", "Azul", true, 210, "kimono", ["asset:gi-blue"]],
    ["Kimono Elite Preto", "kimono-elite-preto", "Design minimalista, corte moderno e acabamento premium. Para quem treina com atitude.", "Trançado 500gsm • Bordados discretos • Calça ripstop", "kimonos", "shoyoroll-br", 1099, 949, 12, "KMN-ELT-BLK", "1.5kg", "Algodão trançado", "Preto", true, 180, "kimono", ["asset:gi-black"]],
    ["Kimono Iniciante Branco", "kimono-iniciante-branco", "Kimono ideal para começar. Custo-benefício imbatível e alta durabilidade.", "Trançado 350gsm • Costuras reforçadas", "kimonos", "tatami-fight", 499, 399, 40, "KMN-STR-WHT", "1.3kg", "Algodão", "Branco", false, 520, "kimono", ["asset:gi-white"]],
    ["Rash Guard Manga Longa Preta", "rash-guard-manga-longa-preta", "Rash guard preto com detalhes vermelhos. Tecido de compressão de alta performance.", "Poliéster/Elastano • Costuras Flatlock • Anti-microbiana", "rash-guards", "venum-bjj", 249, 199, 60, "RSH-BLK-LS", "250g", "Poliéster/Elastano", "Preto", true, 480, "apparel", ["asset:rashguard-black"]],
    ["Rash Guard Competição Azul", "rash-guard-competicao-azul", "Aprovado para competição na faixa azul. Compressão muscular e secagem rápida.", "IBJJF aprovado • Poliéster/Elastano", "rash-guards", "kingz-elite", 269, null, 35, "RSH-BLU-CMP", "250g", "Poliéster/Elastano", "Azul", false, 220, "apparel", ["asset:rashguard-black"]],
    ["Shorts Grappling Preto", "shorts-grappling-preto", "Short para no-gi com faixa lateral vermelha. Liberdade total de movimento.", "Poliéster ripstop • Elástico ajustável • Costuras reforçadas", "shorts", "venum-bjj", 199, 159, 80, "SHR-GRP-BLK", "200g", "Poliéster ripstop", "Preto", true, 610, "apparel", ["asset:shorts"]],
    ["Shorts Fight Vermelho", "shorts-fight-vermelho", "Design agressivo, ideal para MMA e no-gi. Split lateral para máxima mobilidade.", "Poliéster ripstop • Split lateral", "shorts", "tatami-fight", 219, null, 22, "SHR-FGT-RED", "200g", "Poliéster ripstop", "Vermelho", false, 140, "apparel", ["asset:shorts"]],
    ["Faixa Preta Premium", "faixa-preta-premium", "Faixa preta oficial, algodão pesado, ponta rígida e acabamento impecável.", "Algodão 100% • Ponta preta • Tecido duplo", "faixas", "atama-pro", 289, null, 30, "BLT-BLK-PRM", "400g", "Algodão", "Preto", true, 190, "none", ["asset:belts"]],
    ["Faixa Azul Adulto", "faixa-azul-adulto", "Faixa azul adulto oficial, tecido resistente para treinos intensos.", "Algodão 100% • Costuras duplas", "faixas", "tatami-fight", 169, 139, 55, "BLT-BLU-ADT", "350g", "Algodão", "Azul", false, 380, "none", ["asset:belts"]],
    ["Camiseta Team Preta", "camiseta-team-preta", "Camiseta oficial com estampa exclusiva. Algodão premium, corte moderno.", "100% algodão penteado • Estampa em silk", "camisetas", "kingz-elite", 129, 99, 90, "TSH-TEAM-BLK", "180g", "Algodão", "Preto", false, 260, "apparel", ["asset:rashguard-black"]],
    ["Protetor Bucal Duplo", "protetor-bucal-duplo", "Proteção máxima para treinos e competição. Moldável e higiênico.", "Gel dual-layer • Case incluso", "acessorios", "venum-bjj", 79, 59, 200, "ACC-MTH-DBL", "30g", "Gel EVA", "Transparente", false, 720, "none", ["asset:shorts"]],
  ];
  const sizeSets: Record<string, [string[], number]> = {
    kimono: [["A0", "A1", "A2", "A3", "A4"], 5],
    apparel: [["P", "M", "G", "GG"], 8],
    none: [[], 0],
  };

  for (const p of products) {
    const [name, slug, description, technical_description, c, b, price, sale_price, stock, sku, weight, material, color, featured, sales_count, sizeSet, images] = p;
    if (await prisma.product.findUnique({ where: { slug } })) continue;
    const created = await prisma.product.create({
      data: {
        name, slug, description, technical_description, price, sale_price, stock, sku, weight, material, color, featured, sales_count,
        category_id: await cat(c), brand_id: await brand(b),
        images: { create: images.map((image_url, position) => ({ image_url, position })) },
      },
    });
    const [names, qty] = sizeSets[sizeSet];
    for (const n of names) {
      const size = await prisma.size.findUniqueOrThrow({ where: { name: n } });
      await prisma.productSize.create({ data: { product_id: created.id, size_id: size.id, stock: qty } });
    }
  }

  // ── Cupons e banners ──
  const day = 24 * 3600 * 1000;
  for (const [code, discount_percent, expires, active] of [
    ["BEMVINDO10", 10, null, true], ["KIMONO15", 15, null, true],
    ["BLACKAPS20", 20, new Date(Date.now() + 30 * day), true],
    ["FRETEZERO", 5, new Date(Date.now() + 15 * day), true],
    ["NATAL25", 25, new Date(Date.now() - 20 * day), false],
  ] as const)
    await prisma.coupon.upsert({ where: { code }, update: {}, create: { code, discount_percent, expires_at: expires, active } });

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

  // ── Primeiro administrador ──
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (email && password.length >= 6) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const user = await prisma.user.create({
        data: { email, password_hash: await bcrypt.hash(password, 12) },
      });
      await prisma.profile.create({ data: { id: user.id, name: "Administrador", email } });
      await prisma.userRole.createMany({
        data: [{ user_id: user.id, role: "customer" }, { user_id: user.id, role: "admin" }],
      });
      console.log(`Administrador criado: ${email}`);
    }
  } else {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD não definidos: nenhum administrador criado.");
  }
}

main().finally(() => prisma.$disconnect());
