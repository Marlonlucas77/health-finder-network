import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Stethoscope, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "signup" ? ("signup" as const) : ("login" as const),
  }),
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta | EscalaMed" },
      {
        name: "description",
        content:
          "Acesse o EscalaMed como médico ou escalista para encontrar plantões e profissionais.",
      },
      { property: "og:title", content: "Entrar ou criar conta | EscalaMed" },
      { property: "og:description", content: "Cadastro gratuito para médicos e escalistas." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "A senha precisa ter no mínimo 8 caracteres").max(72),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(2, "Use a sigla do estado, ex: SP").optional(),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState(mode);
  const [role, setRole] = useState<"medico" | "escalista">("medico");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    city: "",
    state: "",
  });

  useEffect(() => {
    if (user) navigate({ to: "/painel" });
  }, [user, navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.fullName,
          role,
          city: parsed.data.city ?? "",
          state: (parsed.data.state ?? "").toUpperCase(),
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Conta criada! Confirme seu e-mail para acessar.");
      return;
    }
    toast.success("Bem-vindo ao EscalaMed!");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setLoading(false);
    if (error) {
      toast.error("E-mail ou senha incorretos");
      return;
    }
    toast.success("Login realizado");
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com Google");
      return;
    }
    if (result.redirected) return;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
        <section className="hidden flex-col justify-center lg:flex">
          <h1 className="text-4xl font-semibold">A rede que organiza a escala médica</h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Médicos criam um perfil com CRM, especialidades e hospitais onde atuam. Escalistas
            buscam, filtram, entram em contato e avaliam quem plantonou.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              "Busca por especialidade, cidade, hospital e nota",
              "Avaliações com pontualidade, técnica e relacionamento",
              "Publicação de vagas de plantão com candidaturas",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="size-1.5 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section className="card-surface p-6 sm:p-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={form.password}
                    onChange={set("password")}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { key: "medico", label: "Sou médico", icon: Stethoscope },
                    { key: "escalista", label: "Sou escalista", icon: CalendarClock },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRole(opt.key)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                      role === opt.key
                        ? "border-primary bg-secondary"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <opt.icon className="size-5 text-primary" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={form.fullName}
                    onChange={set("fullName")}
                    maxLength={120}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={set("password")}
                    minLength={8}
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" value={form.city} onChange={set("city")} maxLength={80} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">UF</Label>
                    <Input id="state" value={form.state} onChange={set("state")} maxLength={2} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continuar com Google
          </Button>
        </section>
      </main>
    </div>
  );
}
