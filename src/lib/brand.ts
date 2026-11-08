/**
 * ═══════════ IDENTIDADE DA LOJA — edite aqui ═══════════
 */
export const BRAND = {
  /** Arquivo do logo (fica em public/images). */
  logoSrc: "/images/Logo.jpeg",
  logoAlt: "APS Kimonos Store",

  /** Nome ao lado do logo: a primeira parte na cor do texto, a segunda em destaque (vermelho). */
  nameMain: "Kimono",
  nameAccent: "Store",
  showName: true,

  /** Formato: "oval" | "circulo" | "arredondado" | "reto" (retangular, sem arredondar). */
  logoShape: "reto" as "oval" | "circulo" | "arredondado" | "reto",

  /**
   * ALTURA DO LOGO, em relação ao tamanho do nome:
   *   h-[1em]   = mesma altura do nome  ← atual
   *   h-[1.3em] = um pouco maior
   *   h-[1.6em] = bem maior
   * Para aumentar tudo junto, aumente o tamanho do nome em nameSize.
   */
  logoHeight: {
    header: "h-[1em]",
    drawer: "h-[1em]",
    footer: "h-[1em]",
  },

  /** Tamanho do nome (o logo acompanha). Classes Tailwind: text-lg, text-xl, text-2xl, text-3xl... */
  nameSize: {
    header: "text-xl md:text-2xl",
    drawer: "text-lg",
    footer: "text-2xl",
  },
} as const;

export const LOGO_SHAPE_CLASS: Record<(typeof BRAND)["logoShape"], string> = {
  oval: "rounded-[50%]",
  circulo: "rounded-full aspect-square object-cover",
  arredondado: "rounded-md",
  reto: "",
};