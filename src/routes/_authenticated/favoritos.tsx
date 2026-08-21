import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { HeartOff, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/favoritos")({
  head: () => ({
    meta: [
      { title: "Médicos favoritos | EscalaMed" },
      {
        name: "description",
        content: "Sua lista de médicos favoritos com anotações privadas para montar escalas rápido.",
      },
      { property: "og:title", content: "Médicos favoritos | EscalaMed" },
      { property: "og:description", content: "Salve médicos de confiança e monte escalas mais rápido." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user, isEscalista } = useAuth();
  const qc = useQueryClient();
  const [term, setTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: favs } = await supabase
        .from("favorites")
        .select("id, doctor_id, note, created_at")
        .order("created_at", { ascending: false });
      const ids = (favs ?? []).map((f) => f.doctor_id);
      if (ids.length === 0) return { favs: favs ?? [], profiles: [], docs: [], reviews: [] };
      const [profiles, docs, reviews] = await Promise.all([
        supabase.from("profiles").select("id, full_name, city, state").in("id", ids),
        supabase.from("doctor_profiles").select("user_id, crm, crm_state, available").in("user_id", ids),
        supabase.from("reviews").select("doctor_id, rating").in("doctor_id", ids),
      ]);
      return {
        favs: favs ?? [],
        profiles: profiles.data ?? [],
        docs: docs.data ?? [],
        reviews: reviews.data ?? [],
      };
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("favorites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido dos favoritos");
      void qc.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => toast.error("Não foi possível remover agora"),
  });

  const saveNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase.from("favorites").update({ note: note.slice(0, 500) }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anotação salva");
      void qc.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => toast.error("Não foi possível salvar a anotação"),
  });

  const items = (data?.favs ?? []).map((f) => {
    const p = data?.profiles.find((x) => x.id === f.doctor_id);
    const d = data?.docs.find((x) => x.user_id === f.doctor_id);
    const rs = (data?.reviews ?? []).filter((r) => r.doctor_id === f.doctor_id);
    const avg = rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : 0;
    return {
      ...f,
      name: p?.full_name || "Médico(a)",
      city: p?.city ?? "",
      state: p?.state ?? "",
      crm: d ? `${d.crm}/${d.crm_state}` : "",
      available: d?.available ?? false,
      avg,
      count: rs.length,
    };
  }).filter((i) => !term || i.name.toLowerCase().includes(term.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Médicos favoritos</h1>
        <p className="mt-2 text-muted-foreground">
          Sua lista privada de profissionais de confiança, com anotações visíveis só para você.
        </p>

        {!isEscalista ? (
          <div className="card-surface mt-8 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Os favoritos são um recurso do perfil de escalista.
            </p>
            <Button asChild className="mt-5">
              <Link to="/medicos">Ver médicos cadastrados</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="relative mt-8">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Filtrar pelo nome"
                value={term}
                maxLength={80}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="mt-6 space-y-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="card-surface mt-6 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum favorito ainda. Use o coração na busca de médicos para salvar profissionais.
                </p>
                <Button asChild className="mt-5">
                  <Link to="/medicos">Buscar médicos</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {items.map((f) => (
                  <article key={f.id} className="card-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          to="/medicos/$id"
                          params={{ id: f.doctor_id }}
                          className="font-display text-lg font-semibold hover:text-primary"
                        >
                          {f.name}
                        </Link>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" />
                          {f.city || "Cidade não informada"}
                          {f.state ? ` · ${f.state}` : ""}
                          {f.crm ? ` · CRM ${f.crm}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Stars value={f.avg} />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {f.count > 0 ? `${f.avg.toFixed(1)} · ${f.count}` : "Sem avaliações"}
                          </p>
                        </div>
                        <Badge variant={f.available ? "secondary" : "outline"} className="rounded-full">
                          {f.available ? "Disponível" : "Indisponível"}
                        </Badge>
                      </div>
                    </div>

                    <NoteEditor
                      initial={f.note ?? ""}
                      onSave={(note) => saveNote.mutate({ id: f.id, note })}
                      onRemove={() => remove.mutate(f.id)}
                    />
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function NoteEditor({
  initial,
  onSave,
  onRemove,
}: {
  initial: string;
  onSave: (note: string) => void;
  onRemove: () => void;
}) {
  const [note, setNote] = useState(initial);
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
      <Input
        value={note}
        maxLength={500}
        placeholder="Anotação: turnos preferidos, contato, observações…"
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => onSave(note)}>
          Salvar nota
        </Button>
        <Button variant="ghost" onClick={onRemove} aria-label="Remover dos favoritos">
          <HeartOff className="size-4" />
        </Button>
      </div>
    </div>
  );
}
