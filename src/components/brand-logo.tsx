import { BRAND, LOGO_SHAPE_CLASS } from "@/lib/brand";

type Place = "header" | "drawer" | "footer";

/** Logo + nome da loja lado a lado. O logo acompanha a altura do nome. Ajustes em src/lib/brand.ts. */
export function BrandLogo({ place = "header", className = "" }: { place?: Place; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 leading-none ${BRAND.nameSize[place]} ${className}`}>
      <img
        src={BRAND.logoSrc}
        alt={BRAND.logoAlt}
        loading={place === "header" ? "eager" : "lazy"}
        decoding="async"
        className={`${BRAND.logoHeight[place]} w-auto shrink-0 object-contain ${LOGO_SHAPE_CLASS[BRAND.logoShape]}`}
      />
      {BRAND.showName && (
        <span className="font-extrabold uppercase tracking-tight leading-none">
          {BRAND.nameMain}
          <span className="text-brand">{BRAND.nameAccent}</span>
        </span>
      )}
    </span>
  );
}
