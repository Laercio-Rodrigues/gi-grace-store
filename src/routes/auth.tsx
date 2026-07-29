import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { cx } from "@/lib/format";

const search = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Entrar — Kimono Store Pro" },
      { name: "description", content: "Faça login ou crie sua conta na Kimono Store Pro." },
      { property: "og:title", content: "Entrar — Kimono Store Pro" },
      { property: "og:description", content: "Faça login ou crie sua conta." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: (redirect as "/") ?? "/" });
  }, [user, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: name },
        },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Conta criada! Você já está logado.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (r.error) toast.error("Falha no login com Google");
  };

  return (
    <div className="container-app py-12 md:py-20 max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-display text-3xl md:text-4xl">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {mode === "login" ? "Bem-vindo de volta ao tatame." : "Junte-se à Kimono Store Pro."}
        </p>
      </div>

      <button
        onClick={google}
        className="w-full flex items-center justify-center gap-3 h-12 border border-border rounded-md font-semibold hover:bg-surface transition-colors"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6.2c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.6c2.1-1.9 3.5-4.8 3.5-8.2z"/>
          <path fill="#34A853" d="M12 23c3.1 0 5.7-1 7.6-2.8l-3.6-2.8c-1 .7-2.3 1.1-4 1.1-3.1 0-5.6-2-6.6-4.8H1.7v2.9C3.7 20.6 7.5 23 12 23z"/>
          <path fill="#FBBC05" d="M5.4 13.7c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V6.4H1.7C.9 8 .5 9.9.5 11.5s.4 3.5 1.2 5.1l3.7-2.9z"/>
          <path fill="#EA4335" d="M12 4.4c1.7 0 3.3.6 4.5 1.7l3.2-3.2C17.7 1.1 15.1 0 12 0 7.5 0 3.7 2.4 1.7 6.4l3.7 2.9c1-2.8 3.5-4.9 6.6-4.9z"/>
        </svg>
        Continuar com Google
      </button>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-widest">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-widest">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full bg-surface border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-bold uppercase tracking-widest">E-mail</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full bg-surface border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest">Senha</label>
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full bg-surface border border-border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <button
          disabled={loading}
          className={cx(
            "w-full h-12 rounded-md font-bold uppercase tracking-widest text-sm transition-colors",
            "bg-primary text-primary-foreground hover:bg-brand disabled:opacity-50",
          )}
        >
          {loading ? "..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        {mode === "login" ? (
          <>
            Não tem conta?{" "}
            <button onClick={() => setMode("signup")} className="font-bold text-brand hover:underline">
              Criar conta
            </button>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <button onClick={() => setMode("login")} className="font-bold text-brand hover:underline">
              Entrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
