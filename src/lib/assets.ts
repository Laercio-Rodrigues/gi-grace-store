import heroGi from "@/assets/hero-gi.jpg";
import giWhite from "@/assets/gi-white.jpg";
import giBlue from "@/assets/gi-blue.jpg";
import giBlack from "@/assets/gi-black.jpg";
import rashguardBlack from "@/assets/rashguard-black.jpg";
import belts from "@/assets/belts.jpg";
import shorts from "@/assets/shorts.jpg";

const map: Record<string, string> = {
  "hero-gi": heroGi,
  "gi-white": giWhite,
  "gi-blue": giBlue,
  "gi-black": giBlack,
  "rashguard-black": rashguardBlack,
  belts,
  shorts,
};

const FALLBACK = giWhite;

/** Resolve a stored image URL. Supports `asset:key` for bundled assets. */
export function resolveImage(url: string | null | undefined): string {
  if (!url) return FALLBACK;
  if (url.startsWith("asset:")) return map[url.slice(6)] ?? FALLBACK;
  return url;
}

export const heroImage = heroGi;
