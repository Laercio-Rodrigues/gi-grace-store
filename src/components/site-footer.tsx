import { Link } from "@tanstack/react-router";
import { Instagram, Youtube, MessageCircle } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-primary text-primary-foreground">
      <div className="container-app py-16 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="text-display text-2xl">
            Kimono<span className="text-brand">Store</span>
          </div>
          <p className="mt-4 text-sm text-primary-foreground/70 max-w-xs">
            Equipamento premium para praticantes de Jiu-Jitsu. Do iniciante ao competidor.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-brand transition-colors" aria-label="Instagram">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-brand transition-colors" aria-label="YouTube">
              <Youtube className="h-4 w-4" />
            </a>
            <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-brand transition-colors" aria-label="WhatsApp">
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
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
            <li>Guia de tamanhos</li>
            <li>Trocas e devoluções</li>
            <li>Prazo de entrega</li>
            <li>Fale conosco</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Newsletter</h3>
          <p className="text-sm text-primary-foreground/70 mb-3">Cupons, lançamentos e conteúdo de JJ.</p>
          <form className="flex gap-2">
            <input
              type="email"
              placeholder="Seu e-mail"
              className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand"
            />
            <button className="bg-brand text-brand-foreground px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-md hover:opacity-90">
              OK
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
