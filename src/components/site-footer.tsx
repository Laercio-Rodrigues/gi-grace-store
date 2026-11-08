import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Instagram, Youtube, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { run } from "@/lib/api";
import { whatsappLink } from "@/lib/social";
import { getSiteSettingsFn, subscribeNewsletterFn } from "@/server/site.functions";

export function SiteFooter() {
  const { data: site } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => getSiteSettingsFn(),
    staleTime: 5 * 60 * 1000,
  });
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const social = [
    { label: "Instagram", href: site?.instagram_url, Icon: Instagram },
    { label: "YouTube", href: site?.youtube_url, Icon: Youtube },
    { label: "WhatsApp", href: whatsappLink(site?.whatsapp_number, site?.whatsapp_message), Icon: MessageCircle },
  ].filter((s): s is { label: string; href: string; Icon: typeof Instagram } => !!s.href);

  // "Fale conosco", "Trocas" e "Prazo": abrem o WhatsApp (com mensagem pronta) ou o e-mail de contato
  const contactHref = (topic: string) => {
    const wa = whatsappLink(site?.whatsapp_number, topic);
    if (wa) return wa;
    if (site?.contact_email) return `mailto:${site.contact_email}?subject=${encodeURIComponent(topic)}`;
    return null;
  };
  const helpLinks = [
    { label: "Trocas e devoluções", href: contactHref("Olá! Gostaria de saber sobre trocas e devoluções.") },
    { label: "Prazo de entrega", href: contactHref("Olá! Gostaria de saber sobre o prazo de entrega.") },
    { label: "Fale conosco", href: contactHref(site?.whatsapp_message || "Olá! Vim pelo site da loja.") },
  ];

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Informe o seu e-mail");
    setSending(true);
    const { error } = await run(subscribeNewsletterFn({ data: { email } }));
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Inscrição feita! Você receberá nossas novidades.");
    setEmail("");
  };

  return (
    <footer className="mt-24 bg-primary text-primary-foreground">
      <div className="container-app py-16 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <BrandLogo place="footer" />

          <p className="mt-4 text-sm text-primary-foreground/70 max-w-xs">
            Equipamento premium para praticantes de Jiu-Jitsu. Do iniciante ao competidor.
          </p>
          {social.length > 0 && (
            <div className="mt-6 flex gap-3">
              {social.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-white/5 hover:bg-brand transition-colors"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Loja</h3>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li><Link to="/produtos" search={{ categoria: "kimonos" }} className="hover:text-brand">Kimonos</Link></li>
            <li><Link to="/produtos" search={{ categoria: "rash-guards" }} className="hover:text-brand">Rash Guards</Link></li>
            <li><Link to="/produtos" search={{ categoria: "faixas" }} className="hover:text-brand">Faixas</Link></li>
            <li><Link to="/produtos" search={{ categoria: "acessorios" }} className="hover:text-brand">Acessórios</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Ajuda</h3>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li><Link to="/guia-faixas" className="hover:text-brand">Guia de faixas</Link></li>
            <li><Link to="/guia-tamanhos" className="hover:text-brand">Guia de tamanhos</Link></li>
            {helpLinks.map((l) => (
              <li key={l.label}>
                {l.href ? (
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-brand">
                    {l.label}
                  </a>
                ) : (
                  <span className="opacity-60" title="Cadastre o WhatsApp ou e-mail em Admin > Redes sociais">
                    {l.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Newsletter</h3>
          <p className="text-sm text-primary-foreground/70 mb-3">Cupons, lançamentos e conteúdo de JJ.</p>
          <form className="flex gap-2" onSubmit={subscribe}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-brand text-brand-foreground px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-md hover:opacity-90 disabled:opacity-60"
            >
              {sending ? "..." : "OK"}
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-app py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-primary-foreground/50">
          <span>© {new Date().getFullYear()} Kimono Store Pro — Todos os direitos reservados</span>
          <span>Feito para os guerreiros do tatame</span>
        </div>
      </div>
    </footer>
  );
}
