import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck, Star, CalendarClock, Building2, Stethoscope } from "lucide-react";
import heroImage from "@/assets/hero-hospital.jpg";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EscalaMed | Médicos e escalistas conectados" },
      {
        name: "description",
        content:
          "Médicos criam perfil com CRM e especialidades; escalistas encontram, contratam e avaliam. Hospitais e vagas de plantão em um só lugar.",
      },
      { property: "og:title", content: "EscalaMed | Médicos e escalistas conectados" },
      {
        property: "og:description",
        content: "Busque médicos por especialidade, cidade e avaliação. Publique vagas de plantão.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: specialties } = useQuery({
    queryKey: ["specialties", "home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("specialties")
        .select("id, name, slug")
        .order("name")
        .limit(14);
      return data ?? [];
    },
  });

  const { data: hospitalCount } = useQuery({
    queryKey: ["hospital-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("hospitals")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <img
            src={heroImage}
            alt="Corredor de hospital moderno com equipe médica"
            width={1920}
            height={1080}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-hero-gradient opacity-90" />
          <div className="relative mx-auto max-w-6xl px-4 py-24 text-primary-foreground lg:py-32">
            <Badge className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/20">
              Para médicos e escalistas
            </Badge>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Encontre o médico certo para cada plantão
            </h1>
            <p className="mt-5 max-w-xl text-base text-primary-foreground/85 sm:text-lg">
              Médicos cadastram CRM, especialidades e hospitais onde atuam. Escalistas buscam por
              cidade, especialidade e reputação — e avaliam depois do plantão.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Criar minha conta
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/medicos">Buscar médicos</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Stethoscope,
                title: "Perfil médico completo",
                text: "CRM, RQE, especialidades, hospitais, experiência, valor/hora e disponibilidade.",
              },
              {
                icon: Search,
                title: "Busca inteligente",
                text: "Filtre por especialidade, cidade, UF, hospital, disponibilidade e nota mínima.",
              },
              {
                icon: Star,
                title: "Avaliações reais",
                text: "Escalistas avaliam pontualidade, técnica e relacionamento com comentários.",
              },
            ].map((f) => (
              <article key={f.title} className="card-surface p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <f.icon className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card/60 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-semibold">Especialidades cadastradas</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Mais de 40 especialidades disponíveis para o perfil médico e para as vagas de plantão.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {(specialties ?? []).map((s) => (
                <Badge key={s.id} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {s.name}
                </Badge>
              ))}
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="card-surface p-5">
                <Building2 className="size-5 text-primary" />
                <p className="mt-3 text-2xl font-semibold">{hospitalCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">hospitais cadastrados</p>
              </div>
              <div className="card-surface p-5">
                <CalendarClock className="size-5 text-primary" />
                <p className="mt-3 text-2xl font-semibold">Vagas abertas</p>
                <p className="text-sm text-muted-foreground">
                  <Link to="/vagas" className="text-primary underline-offset-4 hover:underline">
                    ver plantões disponíveis
                  </Link>
                </p>
              </div>
              <div className="card-surface p-5">
                <ShieldCheck className="size-5 text-primary" />
                <p className="mt-3 text-2xl font-semibold">Dados protegidos</p>
                <p className="text-sm text-muted-foreground">
                  Contatos visíveis apenas para usuários autenticados.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card-surface p-8">
              <h2 className="text-xl font-semibold">Sou médico</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Monte seu perfil, marque as especialidades, indique hospitais onde já atuou e
                candidate-se às vagas de plantão publicadas pelos escalistas.
              </p>
              <Button asChild className="mt-6">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Cadastrar meu perfil
                </Link>
              </Button>
            </div>
            <div className="card-surface p-8">
              <h2 className="text-xl font-semibold">Sou escalista</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Informe seu hospital ou grupo, busque médicos por região e especialidade, publique
                plantões e avalie os profissionais depois.
              </p>
              <Button asChild className="mt-6" variant="outline">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Começar a buscar
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} EscalaMed</p>
          <p>Conectando médicos e escalistas em todo o Brasil.</p>
        </div>
      </footer>
    </div>
  );
}
