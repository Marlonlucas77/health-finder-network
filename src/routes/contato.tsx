import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { HelpCircle, MessageSquareWarning, PartyPopper, Lightbulb, Mail } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Fale conosco | EscalaMed" },
      {
        name: "description",
        content: "Envie dúvidas, reclamações, sugestões ou elogios para a equipe do EscalaMed.",
      },
      { property: "og:title", content: "Fale conosco | EscalaMed" },
      {
        property: "og:description",
        content: "Canal de contato do EscalaMed para dúvidas, reclamações, sugestões e elogios.",
      },
    ],
  }),
  component: ContactPage,
});

const CATEGORIES = [
  { value: "duvida", label: "Dúvida", icon: HelpCircle },
  { value: "reclamacao", label: "Reclamação", icon: MessageSquareWarning },
  { value: "elogio", label: "Elogio", icon: PartyPopper },
  { value: "sugestao", label: "Sugestão", icon: Lightbulb },
  { value: "outro", label: "Outro", icon: Mail },
] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("Informe um e-mail válido").max(160),
  category: z.enum(["duvida", "reclamacao", "elogio", "sugestao", "outro"]),
  message: z.string().trim().min(10, "Conte um pouco mais (mínimo 10 caracteres)").max(2000),
});

function ContactPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: (user?.user_metadata?.["full_name"] as string | undefined) ?? "",
    email: user?.email ?? "",
    category: "duvida" as (typeof CATEGORIES)[number]["value"],
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Confira os dados do formulário");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("feedback").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      category: parsed.data.category,
      message: parsed.data.message,
      user_id: user?.id ?? null,
    });
    setSending(false);
    if (error) {
      toast.error("Não foi possível enviar sua mensagem. Tente novamente em instantes.");
      return;
    }
    setSent(true);
    toast.success("Mensagem enviada! Obrigado pelo contato.");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Fale conosco</h1>
        <p className="mt-2 text-muted-foreground">
          Dúvidas, reclamações, sugestões ou elogios: escolha uma categoria e conte pra gente. A
          equipe do EscalaMed lê todas as mensagens.
        </p>

        <div className="card-surface mt-8 p-6 sm:p-8">
          {sent ? (
            <div className="py-6 text-center">
              <PartyPopper className="mx-auto size-8 text-primary" />
              <h2 className="mt-3 font-display text-lg font-semibold">Mensagem enviada</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Recebemos seu contato e vamos responder pelo e-mail informado assim que possível.
              </p>
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => {
                  setSent(false);
                  setForm((f) => ({ ...f, message: "" }));
                }}
              >
                Enviar outra mensagem
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>O que você quer nos dizer?</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors ${
                        form.category === c.value
                          ? "border-primary bg-secondary text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <c.icon className="size-4" />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="c-name">Nome</Label>
                  <Input
                    id="c-name"
                    value={form.name}
                    maxLength={120}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-email">E-mail</Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={form.email}
                    maxLength={160}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c-message">Mensagem</Label>
                <Textarea
                  id="c-message"
                  rows={6}
                  maxLength={2000}
                  placeholder="Escreva aqui os detalhes..."
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                />
              </div>

              <Button className="w-full" onClick={submit} disabled={sending}>
                {sending ? "Enviando..." : "Enviar mensagem"}
              </Button>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
