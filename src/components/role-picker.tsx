import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    key: "medico" as const,
    label: "Sou médico",
    text: "Vou montar meu perfil com CRM, especialidades e candidatar-me a plantões.",
    icon: Stethoscope,
  },
  {
    key: "escalista" as const,
    label: "Sou escalista",
    text: "Vou buscar médicos, publicar vagas de plantão e avaliar profissionais.",
    icon: CalendarClock,
  },
];

/**
 * Contas criadas por e-mail/senha já chegam com um papel (medico/escalista)
 * escolhido no cadastro. Contas criadas via OAuth (ex.: Google) não passam
 * por essa etapa, então precisam escolher o papel aqui no painel antes de
 * usar qualquer funcionalidade da plataforma.
 */
export function RolePicker() {
  const { user, refreshRoles } = useAuth();
  const [saving, setSaving] = useState<"medico" | "escalista" | null>(null);

  async function choose(role: "medico" | "escalista") {
    if (!user) return;
    setSaving(role);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role });
    setSaving(null);
    if (error) {
      toast.error("Não foi possível salvar seu perfil. Tente novamente.");
      return;
    }
    toast.success(role === "medico" ? "Perfil de médico ativado" : "Perfil de escalista ativado");
    await refreshRoles();
  }

  return (
    <div className="card-surface mt-8 p-6 sm:p-8">
      <h2 className="text-lg font-semibold">Como você vai usar o EscalaMed?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Escolha um perfil para liberar as funcionalidades da plataforma.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            disabled={saving !== null}
            onClick={() => void choose(opt.key)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              "border-border hover:border-primary/60 disabled:opacity-60",
            )}
          >
            <opt.icon className="size-5 text-primary" />
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-xs text-muted-foreground">{opt.text}</span>
          </button>
        ))}
      </div>
      {saving ? <p className="mt-3 text-xs text-muted-foreground">Salvando...</p> : null}
    </div>
  );
}
