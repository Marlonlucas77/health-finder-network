import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Stethoscope, ClipboardList, Star, Building2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona a EscalaMed | Médicos e escalistas" },
      {
        name: "description",
        content:
          "Passo a passo para médicos e escalistas: cadastro, especialidades, hospitais, publicação de plantões, candidaturas e avaliações.",
      },
      { property: "og:title", content: "Como funciona a EscalaMed" },
      {
        property: "og:description",
        content: "Entenda o fluxo completo da plataforma para médicos e escalistas.",
      },
    ],
  }),
  component: HowItWorks,
});

const doctorSteps = [
  "Crie sua conta escolhendo o perfil Médico.",
  "Preencha CRM, UF, RQE, anos de experiência e valor por hora.",
  "Marque suas especialidades e os hospitais onde já atuou.",
  "Ative a disponibilidade para aparecer nas buscas dos escalistas.",
  "Candidate-se às vagas de plantão e acompanhe o status no painel.",
];

const schedulerSteps = [
  "Crie sua conta escolhendo o perfil Escalista.",
  "Informe o hospital ou grupo em que você monta escalas.",
  "Busque médicos por especialidade, cidade, UF, nota e disponibilidade.",
  "Publique plantões com data, horário, valor e número de vagas.",
  "Aprove candidaturas e avalie o médico depois do plantão.",
];

const faq = [
  {
    q: "A plataforma é gratuita?",
    a: "O cadastro de médicos, escalistas, hospitais e vagas de plantão está disponível sem custo na plataforma.",
  },
  {
    q: "Quem consegue ver meus dados de contato?",
    a: "Telefone e dados profissionais aparecem apenas para usuários autenticados na plataforma. Visitantes não autenticados não acessam perfis.",
  },
  {
    q: "Quem pode avaliar um médico?",
    a: "Somente contas com perfil de escalista podem registrar avaliações, com notas de pontualidade, técnica e relacionamento, além de um comentário.",
  },
  {
    q: "Posso ter os dois perfis?",
    a: "Cada conta é criada com um perfil principal. Se precisar dos dois, use contas separadas para manter as avaliações independentes.",
  },
  {
    q: "Como funciona a candidatura a um plantão?",
    a: "O médico se candidata com um clique. O escalista responsável pela vaga aprova ou recusa e acompanha quantas vagas ainda estão abertas.",
  },
];

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="max-w-3xl text-3xl font-semibold sm:text-4xl">
            Como funciona a EscalaMed
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Uma plataforma única para o cadastro de médicos, a busca por escalistas, a publicação de
            plantões e as avaliações após cada turno.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="card-surface p-6 sm:p-8">
              <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <Stethoscope className="size-5" />
              </span>
              <h2 className="mt-4 text-xl font-semibold">Para médicos</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {doctorSteps.map((s) => (
                  <li key={s} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Criar perfil médico
                </Link>
              </Button>
            </article>

            <article className="card-surface p-6 sm:p-8">
              <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <ClipboardList className="size-5" />
              </span>
              <h2 className="mt-4 text-xl font-semibold">Para escalistas</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {schedulerSteps.map((s) => (
                  <li key={s} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Começar a buscar médicos
                </Link>
              </Button>
            </article>
          </div>
        </section>

        <section className="border-y border-border bg-card/60 py-12 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3">
            {[
              {
                icon: Building2,
                title: "Hospitais compartilhados",
                text: "A base de hospitais é colaborativa: cadastre uma unidade e ela fica disponível para vagas e perfis.",
              },
              {
                icon: Star,
                title: "Reputação transparente",
                text: "As médias de pontualidade, técnica e relacionamento aparecem no perfil e nos resultados de busca.",
              },
              {
                icon: ClipboardList,
                title: "Escala sob controle",
                text: "Cada vaga mostra candidaturas recebidas, vagas restantes e o status atual do plantão.",
              },
            ].map((c) => (
              <article key={c.title} className="card-surface p-6">
                <c.icon className="size-5 text-primary" />
                <h2 className="mt-3 text-lg font-semibold">{c.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <h2 className="text-2xl font-semibold">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="mt-6">
            {faq.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
