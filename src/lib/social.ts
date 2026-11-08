/** Validação e links das redes sociais (usado no admin, no servidor e no rodapé). */

const clean = (s: string | null | undefined) => (s ?? "").trim();

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.hostname.replace(/^www\./, "").toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Aceita "@perfil", "perfil" ou a URL completa. Retorna URL https válida, "" se vazio, ou null se inválido. */
export function normalizeInstagram(input: string | null | undefined): string | "" | null {
  const v = clean(input);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) {
    const h = hostOf(v);
    return h === "instagram.com" || h === "instagr.am" ? v.replace(/^http:/i, "https:") : null;
  }
  const handle = v.replace(/^@/, "").replace(/^(www\.)?instagram\.com\//i, "").replace(/\/+$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `https://www.instagram.com/${handle}` : null;
}

/** Aceita "@canal" ou a URL completa do YouTube. */
export function normalizeYoutube(input: string | null | undefined): string | "" | null {
  const v = clean(input);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) {
    const h = hostOf(v);
    return h === "youtube.com" || h === "m.youtube.com" || h === "youtu.be" ? v.replace(/^http:/i, "https:") : null;
  }
  const handle = v.replace(/^@/, "");
  return /^[A-Za-z0-9._-]{1,50}$/.test(handle) ? `https://www.youtube.com/@${handle}` : null;
}

/** Só dígitos, com DDI. Sem DDI (10 ou 11 dígitos) assume Brasil (55). Retorna "" se vazio, null se inválido. */
export function normalizeWhatsapp(input: string | null | undefined): string | "" | null {
  const digits = clean(input).replace(/\D/g, "");
  if (!digits) return "";
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return full.length >= 12 && full.length <= 15 ? full : null;
}

export function whatsappLink(number: string | null | undefined, message?: string | null): string | null {
  const n = normalizeWhatsapp(number);
  if (!n) return null;
  const text = clean(message);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
