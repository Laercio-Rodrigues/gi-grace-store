import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Package,
  ShoppingBag,
  Tag,
  Store,
  Ticket,
  Image as ImageIcon,
  Receipt,
  Barcode,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cx } from "@/lib/format";

const TABS = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/faturamento", label: "Faturamento", icon: Receipt },
  { to: "/admin/boletos", label: "Boletos", icon: Barcode },
  { to: "/admin/categorias", label: "Categorias", icon: Tag },
  { to: "/admin/marcas", label: "Marcas", icon: Store },
  { to: "/admin/cupons", label: "Cupons", icon: Ticket },
  { to: "/admin/banners", label: "Banners", icon: ImageIcon },
  { to: "/admin/empresa", label: "Empresa", icon: Building2 },
  { to: "/admin/administradores", label: "Administradores", icon: ShieldCheck },
];


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel Admin — Kimono Store Pro" },
      { name: "description", content: "Painel administrativo da loja." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) {
    return <div className="container-app py-24 text-center text-muted-foreground">Carregando...</div>;
  }
  if (!isAdmin) {
    return (
      <div className="container-app py-24 text-center">
        <h1 className="text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você precisa ser administrador para ver esta página.
        </p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground">
          Voltar à loja
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-brand">Admin</div>
          <h1 className="text-display text-4xl md:text-5xl">Painel de controle</h1>
        </div>
      </div>
      <nav className="mb-8 flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.to : pathname === t.to || pathname.startsWith(t.to + "/");
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cx(
                "inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                active
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
