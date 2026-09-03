import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { MapPin, BadgeCheck, Clock, Phone, Building2, Mail } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Stars } from "@/components/stars";
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
  const { user, isEscalista } = useAuth();
  const queryClient = useQueryClient();
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
    enabled: !!user,
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
                </div>
              </div>

              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <p className="flex items-center gap-2">
                  <BadgeCheck className="size-4 text-primary" /> CRM {data.doctor.crm}/
                  {data.doctor.crm_state}
                  {data.doctor.has_rqe ? " · RQE" : ""}
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
