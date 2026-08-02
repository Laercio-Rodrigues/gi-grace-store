import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { cx } from "@/lib/format";
import apsLogo from "@/assets/aps-logo.jpg.asset.json";


const NAV = [
  { label: "Kimonos", to: "/produtos", search: { categoria: "kimonos" } },
  { label: "Rash Guards", to: "/produtos", search: { categoria: "rash-guards" } },
  { label: "Shorts", to: "/produtos", search: { categoria: "shorts" } },
  { label: "Faixas", to: "/produtos", search: { categoria: "faixas" } },
  { label: "Camisetas", to: "/produtos", search: { categoria: "camisetas" } },
  { label: "Acessórios", to: "/produtos", search: { categoria: "acessorios" } },
];

export function SiteHeader() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    window.location.href = `/produtos?busca=${encodeURIComponent(value)}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {/* announcement bar */}
      <div className="bg-primary text-primary-foreground text-[11px] tracking-widest uppercase">
        <div className="container-app py-2 flex items-center justify-center gap-2">
          <span className="hidden sm:inline">Frete grátis acima de R$ 499</span>
          <span className="sm:hidden">Frete grátis R$ 499+</span>
          <span className="opacity-40">•</span>
          <span>Cupom BEMVINDO10</span>
        </div>
      </div>

      <div className="container-app flex h-16 items-center gap-4">
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden -ml-2 p-2"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="APS Kimonos Store — página inicial">
          <img
            src={apsLogo.url}
            alt="APS Kimonos Store"
            width={140}
            height={40}
            className="h-9 w-auto md:h-10 object-contain"
          />
        </Link>


        <nav className="hidden lg:flex items-center gap-1 ml-6">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              search={n.search}
              className={cx(
                "px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors hover:text-brand",
                pathname === n.to ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar kimono, marca, tamanho..."
            className="w-full bg-surface border border-transparent focus:border-primary focus:outline-none pl-9 pr-3 py-2 text-sm rounded-md transition-colors"
          />
        </form>

        <div className="flex items-center gap-1 ml-auto md:ml-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden md:inline-flex text-xs font-semibold uppercase tracking-widest bg-brand text-brand-foreground px-3 py-1.5 rounded-full hover:opacity-90"
            >
              Admin
            </Link>
          )}
          <Link to={user ? "/favoritos" : "/auth"} className="p-2 hover:text-brand" aria-label="Favoritos">
            <Heart className="h-5 w-5" />
          </Link>
          <Link to={user ? "/conta" : "/auth"} className="p-2 hover:text-brand" aria-label="Conta">
            <User className="h-5 w-5" />
          </Link>
          <Link to="/carrinho" className="p-2 hover:text-brand relative" aria-label="Carrinho">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-brand text-brand-foreground text-[10px] font-bold h-4 min-w-4 px-1 rounded-full grid place-items-center">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute top-0 left-0 h-full w-80 max-w-[85vw] bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-16 border-b border-border">
              <img src={apsLogo.url} alt="APS Kimonos Store" width={120} height={34} className="h-8 w-auto object-contain" />

              <button onClick={() => setOpen(false)} className="p-2" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSearch} className="p-4 relative">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-surface pl-9 pr-3 py-2.5 text-sm rounded-md"
              />
            </form>
            <nav className="flex-1 overflow-y-auto px-2 pb-4">
              {NAV.map((n) => (
                <Link
                  key={n.label}
                  to={n.to}
                  search={n.search}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-base font-medium uppercase tracking-wide border-b border-border/60 hover:bg-surface"
                >
                  {n.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-base font-semibold uppercase tracking-wide text-brand"
                >
                  Painel Admin
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
