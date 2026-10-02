import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  MapPin,
  BadgeCheck,
  Clock,
  Phone,
  Building2,
  Mail,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";
import { SiteHeader } from "@/components/site-header";
import { Stars } from "@/components/stars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/components/avatar-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/medicos/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do médico | EscalaMed" },
      {
        name: "description",
        content: "Veja especialidades, CRM, hospitais, experiência e avaliações do profissional.",
      },
      { property: "og:title", content: "Perfil do médico | EscalaMed" },
      { property: "og:description", content: "Especialidades, hospitais e avaliações do médico." },
    ],
  }),
  component: DoctorDetail,
});

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  punctuality: z.number().min(1).max(5),
  technical: z.number().min(1).max(5),
  relationship: z.number().min(1).max(5),
  comment: z.string().trim().max(1000, "Comentário muito longo").optional(),
});

function DoctorDetail() {
  const { id } = Route.useParams();
  const { user, isMedico, isEscalista, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // A médico-only account may still preview their own public profile, but
  // has no business reason to browse other médicos' profiles — that's the
  // escalista directory's job.
  const blocked = !!user && isMedico && !isEscalista && !isAdmin && user.id !== id;
  const [scores, setScores] = useState({
    rating: 5,
    punctuality: 5,
    technical: 5,
    relationship: 5,
  });
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["doctor", id],
    enabled: !!user && !blocked,
    queryFn: async () => {
      const [profile, doctor, specs, hospitals, reviews] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("doctor_profiles").select("*").eq("user_id", id).maybeSingle(),
        supabase
          .from("doctor_specialties")
          .select("specialty_id, specialties(name)")
          .eq("doctor_id", id),
        supabase
          .from("doctor_hospitals")
          .select("hospital_id, hospitals(name, city, state)")
          .eq("doctor_id", id),
        supabase
          .from("reviews")
          .select("*")
          .eq("doctor_id", id)
          .order("created_at", { ascending: false }),
      ]);
      // Only fetch names for the people who actually reviewed this doctor.
      const reviewerIds = Array.from(new Set((reviews.data ?? []).map((r) => r.reviewer_id)));
      const reviewerProfiles =
        reviewerIds.length > 0
          ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
          : { data: [] };
      return {
        profile: profile.data,
        doctor: doctor.data,
        specs: specs.data ?? [],
        hospitals: hospitals.data ?? [],
        reviews: reviews.data ?? [],
        names: new Map((reviewerProfiles.data ?? []).map((p) => [p.id, p.full_name])),
      };
    },
  });

  const reviews = data?.reviews ?? [];
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const myReview = reviews.find((r) => r.reviewer_id === user?.id);

  async function submitReview() {
    const parsed = reviewSchema.safeParse({ ...scores, comment });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("reviews").upsert(
      {
        doctor_id: id,
        reviewer_id: user!.id,
        ...scores,
        comment: comment.trim() || null,
      },
      { onConflict: "doctor_id,reviewer_id" },
    );
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar a avaliação");
      return;
    }
    toast.success("Avaliação registrada");
    setComment("");
    queryClient.invalidateQueries({ queryKey: ["doctor", id] });
    queryClient.invalidateQueries({ queryKey: ["doctors"] });
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Entre para ver este perfil</h1>
          <Button asChild className="mt-6">
            <Link to="/auth" search={{ mode: "login" }}>
              Entrar
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Esta área é para escalistas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Perfis de outros médicos são visíveis para escalistas, que buscam e avaliam
            profissionais.
          </p>
          <Button asChild className="mt-6">
            <Link to="/painel">Ir para meu painel</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        {isLoading ? (
          <Skeleton className="h-60 rounded-xl" />
        ) : !data?.doctor || !data.profile ? (
          <p className="text-center text-muted-foreground">Perfil não encontrado.</p>
        ) : (
          <>
            <section className="card-surface p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Avatar className="size-16 shrink-0 sm:size-20">
                    <AvatarImage
                      src={data.profile.avatar_url ?? undefined}
                      alt={data.profile.full_name || "Médico(a)"}
                    />
                    <AvatarFallback className="text-xl font-semibold text-primary">
                      {initials(data.profile.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-3xl font-semibold">
                      {data.profile.full_name || "Médico(a)"}
                    </h1>
                    <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-4" />
                      {data.profile.city || "Cidade não informada"}
                      {data.profile.state ? ` · ${data.profile.state}` : ""}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {data.specs.map((s) => (
                        <Badge key={s.specialty_id} variant="secondary" className="rounded-full">
                          {s.specialties?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Stars value={avg} size={20} />
                  <p className="mt-1 text-sm text-muted-foreground">
                    {reviews.length
                      ? `${avg.toFixed(1)} de 5 · ${reviews.length} avaliações`
                      : "Sem avaliações"}
                  </p>
                  <Badge className="mt-3" variant={data.doctor.available ? "default" : "outline"}>
                    {data.doctor.available ? "Disponível para plantões" : "Indisponível"}
                  </Badge>
                  {user.id !== id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 flex w-full items-center gap-2"
                      onClick={() => navigate({ to: "/mensagens", search: { with: id } })}
                    >
                      <MessageCircle className="size-4" /> Enviar mensagem
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <p className="flex flex-wrap items-center gap-2">
                  <BadgeCheck className="size-4 text-primary" /> CRM {data.doctor.crm}/
                  {data.doctor.crm_state}
                  {data.doctor.has_rqe ? " · RQE" : ""}
                  {data.doctor.crm_verified && (
                    <Badge variant="default" className="gap-1 rounded-full text-[11px]">
                      <ShieldCheck className="size-3" /> Verificado
                    </Badge>
                  )}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" /> {data.doctor.years_experience} anos de
                  experiência
                </p>
                {data.doctor.hourly_rate ? (
                  <p className="flex items-center gap-2">
                    <span className="text-primary">R$</span>{" "}
                    {Number(data.doctor.hourly_rate).toFixed(2)} por hora
                  </p>
                ) : null}
                {data.profile.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="size-4 text-primary" /> {data.profile.phone}
                    {whatsappLink(data.profile.phone) && (
                      <a
                        href={whatsappLink(data.profile.phone)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/10 px-2 py-0.5 text-xs font-medium text-[#1f9c52] transition-colors hover:bg-[#25D366]/20"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="size-3.5 fill-current"
                          aria-hidden="true"
                        >
                          <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.45 1.27 4.9L2 22l5.25-1.38a9.94 9.94 0 0 0 4.79 1.22h.01c5.52 0 10-4.48 10-10s-4.48-10-10.01-10zm.01 18.15h-.01a8.1 8.1 0 0 1-4.14-1.14l-.3-.18-3.12.82.83-3.04-.19-.31a8.13 8.13 0 0 1-1.25-4.3c0-4.49 3.66-8.15 8.16-8.15 2.18 0 4.22.85 5.77 2.39a8.1 8.1 0 0 1 2.39 5.77c0 4.5-3.66 8.14-8.14 8.14zm4.47-6.1c-.24-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.78.96-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z" />
                        </svg>
                        WhatsApp
                      </a>
                    )}
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-4" /> Contato não informado
                  </p>
                )}
                {data.doctor.accepts_urgent ? <p>Aceita chamados de urgência</p> : null}
              </div>

              {data.profile.bio ? (
                <p className="mt-6 whitespace-pre-line text-sm text-muted-foreground">
                  {data.profile.bio}
                </p>
              ) : null}

              {data.hospitals.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Hospitais onde atua
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.hospitals.map((h) => (
                      <li key={h.hospital_id} className="flex items-center gap-2">
                        <Building2 className="size-4 text-primary" />
                        {h.hospitals?.name} — {h.hospitals?.city}/{h.hospitals?.state}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {isEscalista && user.id !== id && (
              <section className="card-surface mt-6 p-6">
                <h2 className="text-lg font-semibold">
                  {myReview ? "Atualizar minha avaliação" : "Avaliar este médico"}
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["rating", "Nota geral"],
                      ["punctuality", "Pontualidade"],
                      ["technical", "Técnica"],
                      ["relationship", "Relacionamento"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <Stars
                        value={scores[key]}
                        size={22}
                        onChange={(v) => setScores((s) => ({ ...s, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="comment">Comentário</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    maxLength={1000}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Como foi a atuação do profissional no plantão?"
                  />
                </div>
                <Button className="mt-4" onClick={submitReview} disabled={saving}>
                  Salvar avaliação
                </Button>
              </section>
            )}

            <section className="mt-6">
              <h2 className="text-xl font-semibold">Avaliações</h2>
              {reviews.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Este médico ainda não recebeu avaliações.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {reviews.map((r) => (
                    <article key={r.id} className="card-surface p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">
                          {data.names.get(r.reviewer_id) || "Escalista"}
                        </p>
                        <Stars value={r.rating} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Pontualidade {r.punctuality ?? "-"} · Técnica {r.technical ?? "-"} ·
                        Relacionamento {r.relationship ?? "-"}
                      </p>
                      {r.comment ? <p className="mt-3 text-sm">{r.comment}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
