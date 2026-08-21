import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MapPin, Search, BadgeCheck, Clock, Heart } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/medicos/")({
  head: () => ({
    meta: [
      { title: "Buscar médicos por especialidade e cidade | EscalaMed" },
      {
        name: "description",
        content:
          "Encontre médicos cadastrados por especialidade, cidade, UF, disponibilidade e avaliação dos escalistas.",
      },
      { property: "og:title", content: "Buscar médicos | EscalaMed" },
      { property: "og:description", content: "Filtre médicos por especialidade, cidade e nota." },
    ],
  }),
  component: DoctorsPage,
});

type DoctorRow = {
  user_id: string;
  crm: string;
  crm_state: string;
  years_experience: number;
  hourly_rate: number | null;
  available: boolean;
  accepts_urgent: boolean;
  has_rqe: boolean;
};

function DoctorsPage() {
  const { user, isEscalista } = useAuth();
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [city, setCity] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const [state, setState] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [onlyRqe, setOnlyRqe] = useState(false);
  const [minExp, setMinExp] = useState("0");
  const [maxRate, setMaxRate] = useState("0");
  const [sort, setSort] = useState("rating");
  const [minRating, setMinRating] = useState("0");

  const { data: specialties } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      const { data } = await supabase.from("specialties").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["doctors"],
    enabled: !!user,
    queryFn: async () => {
      const [doctors, profiles, links, reviews] = await Promise.all([
        supabase.from("doctor_profiles").select("*"),
        supabase.from("profiles").select("id, full_name, city, state, avatar_url, bio"),
        supabase.from("doctor_specialties").select("doctor_id, specialty_id"),
        supabase.from("reviews").select("doctor_id, rating"),
      ]);
      return {
        doctors: (doctors.data ?? []) as DoctorRow[],
        profiles: profiles.data ?? [],
        links: links.data ?? [],
        reviews: reviews.data ?? [],
      };
    },
  });

  const { data: favorites } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user && isEscalista,
    queryFn: async () =>
      (await supabase.from("favorites").select("id, doctor_id")).data ?? [],
  });

  async function toggleFavorite(doctorId: string) {
    const existing = (favorites ?? []).find((f) => f.doctor_id === doctorId);
    if (existing) {
      const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
      if (error) {
        toast.error("Não foi possível remover");
        return;
      }
      toast.success("Removido dos favoritos");
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ scheduler_id: user!.id, doctor_id: doctorId });
      if (error) {
        toast.error("Não foi possível favoritar");
        return;
      }
      toast.success("Adicionado aos favoritos");
    }
    void qc.invalidateQueries({ queryKey: ["favorites"] });
  }

  const list = useMemo(() => {
    if (!data) return [];
    const profileById = new Map(data.profiles.map((p) => [p.id, p]));
    const specsByDoctor = new Map<string, string[]>();
    for (const l of data.links) {
      specsByDoctor.set(l.doctor_id, [...(specsByDoctor.get(l.doctor_id) ?? []), l.specialty_id]);
    }
    const ratingByDoctor = new Map<string, { avg: number; count: number }>();
    for (const r of data.reviews) {
      const cur = ratingByDoctor.get(r.doctor_id) ?? { avg: 0, count: 0 };
      const count = cur.count + 1;
      ratingByDoctor.set(r.doctor_id, { avg: (cur.avg * cur.count + r.rating) / count, count });
    }
    const specName = new Map((specialties ?? []).map((s) => [s.id, s.name]));

    return data.doctors
      .map((d) => {
        const p = profileById.get(d.user_id);
        const rating = ratingByDoctor.get(d.user_id) ?? { avg: 0, count: 0 };
        const specIds = specsByDoctor.get(d.user_id) ?? [];
        return {
          ...d,
          name: p?.full_name || "Médico(a)",
          city: p?.city ?? "",
          state: p?.state ?? "",
          bio: p?.bio ?? "",
          specIds,
          specNames: specIds.map((id) => specName.get(id) ?? "").filter(Boolean),
          rating,
        };
      })
      .filter((d) => {
        if (term) {
          const t = term.toLowerCase();
          const hit =
            d.name.toLowerCase().includes(t) ||
            d.city.toLowerCase().includes(t) ||
            d.specNames.some((s) => s.toLowerCase().includes(t));
          if (!hit) return false;
        }
        if (specialty !== "all" && !d.specIds.includes(specialty)) return false;
        if (state !== "all" && d.state !== state) return false;
        if (city !== "all" && d.city !== city) return false;
        if (onlyAvailable && !d.available) return false;
        if (onlyUrgent && !d.accepts_urgent) return false;
        if (onlyRqe && !d.has_rqe) return false;
        if (Number(minExp) > 0 && d.years_experience < Number(minExp)) return false;
        if (Number(maxRate) > 0 && (d.hourly_rate == null || Number(d.hourly_rate) > Number(maxRate)))
          return false;
        if (Number(minRating) > 0 && d.rating.avg < Number(minRating)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "experiencia") return b.years_experience - a.years_experience;
        if (sort === "avaliacoes") return b.rating.count - a.rating.count;
        if (sort === "preco_asc")
          return (a.hourly_rate ?? Infinity) - (b.hourly_rate ?? Infinity);
        if (sort === "nome") return a.name.localeCompare(b.name, "pt-BR");
        return b.rating.avg - a.rating.avg || b.years_experience - a.years_experience;
      });
  }, [
    data,
    specialties,
    term,
    specialty,
    state,
    city,
    onlyAvailable,
    onlyUrgent,
    onlyRqe,
    minExp,
    maxRate,
    minRating,
    sort,
  ]);

  const states = useMemo(
    () => Array.from(new Set((data?.profiles ?? []).map((p) => p.state).filter(Boolean))).sort(),
    [data],
  );

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          (data?.profiles ?? [])
            .filter((p) => state === "all" || p.state === state)
            .map((p) => p.city)
            .filter(Boolean),
        ),
      ).sort(),
    [data, state],
  );

  function clearFilters() {
    setTerm("");
    setSpecialty("all");
    setState("all");
    setCity("all");
    setOnlyAvailable(false);
    setOnlyUrgent(false);
    setOnlyRqe(false);
    setMinExp("0");
    setMaxRate("0");
    setMinRating("0");
    setSort("rating");
  }


  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Médicos cadastrados</h1>
        <p className="mt-2 text-muted-foreground">
          Filtre por especialidade, região, disponibilidade e reputação.
        </p>

        {!user ? (
          <div className="card-surface mt-8 p-8 text-center">
            <h2 className="text-lg font-semibold">Entre para ver os perfis</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Os dados dos médicos ficam visíveis apenas para usuários autenticados.
            </p>
            <Button asChild className="mt-5">
              <Link to="/auth" search={{ mode: "login" }}>Entrar ou criar conta</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="card-surface mt-8 grid gap-4 p-5 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Nome, cidade ou especialidade"
                  value={term}
                  maxLength={80}
                  onChange={(e) => setTerm(e.target.value)}
                />
              </div>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as especialidades</SelectItem>
                  {(specialties ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={state}
                onValueChange={(v) => {
                  setState(v);
                  setCity("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s} value={s!}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c!}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={minExp} onValueChange={setMinExp}>
                <SelectTrigger>
                  <SelectValue placeholder="Experiência" />
                </SelectTrigger>
                <SelectContent>
                  {["0", "2", "5", "10", "15", "20"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v === "0" ? "Qualquer experiência" : `${v}+ anos`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={maxRate} onValueChange={setMaxRate}>
                <SelectTrigger>
                  <SelectValue placeholder="Valor/hora" />
                </SelectTrigger>
                <SelectContent>
                  {["0", "100", "150", "200", "300", "500"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v === "0" ? "Qualquer valor/hora" : `Até R$ ${v}/h`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Nota mínima" />
                </SelectTrigger>
                <SelectContent>
                  {["0", "3", "4", "4.5"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v === "0" ? "Qualquer nota" : `Nota ${v}+`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Melhor avaliados</SelectItem>
                  <SelectItem value="experiencia">Mais experientes</SelectItem>
                  <SelectItem value="avaliacoes">Mais avaliações</SelectItem>
                  <SelectItem value="preco_asc">Menor valor/hora</SelectItem>
                  <SelectItem value="nome">Nome (A-Z)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-5 md:col-span-3">
                <div className="flex items-center gap-2">
                  <Switch id="avail" checked={onlyAvailable} onCheckedChange={setOnlyAvailable} />
                  <Label htmlFor="avail">Disponíveis</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="urg" checked={onlyUrgent} onCheckedChange={setOnlyUrgent} />
                  <Label htmlFor="urg">Aceita urgência</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="rqe" checked={onlyRqe} onCheckedChange={setOnlyRqe} />
                  <Label htmlFor="rqe">Com RQE</Label>
                </div>
              </div>
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>

            {!isLoading && (
              <p className="mt-4 text-sm text-muted-foreground">
                {list.length} médico(s) encontrado(s)
              </p>
            )}


            {isLoading ? (
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <p className="mt-10 text-center text-muted-foreground">
                Nenhum médico encontrado com esses filtros.
              </p>
            ) : (
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {list.map((d) => (
                  <div key={d.user_id} className="relative">
                  {isEscalista && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-3 z-10"
                      aria-label="Favoritar médico"
                      onClick={() => void toggleFavorite(d.user_id)}
                    >
                      <Heart
                        className={
                          (favorites ?? []).some((f) => f.doctor_id === d.user_id)
                            ? "size-4 fill-primary text-primary"
                            : "size-4"
                        }
                      />
                    </Button>
                  )}
                  <Link
                    to="/medicos/$id"
                    params={{ id: d.user_id }}
                    className="card-surface block p-5 transition-shadow hover:shadow-lift"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-semibold">{d.name}</h2>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" />
                          {d.city || "Cidade não informada"}
                          {d.state ? ` · ${d.state}` : ""}
                        </p>
                      </div>
                      <div className={isEscalista ? "mr-10 text-right" : "text-right"}>
                        <Stars value={d.rating.avg} />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {d.rating.count > 0
                            ? `${d.rating.avg.toFixed(1)} · ${d.rating.count} avaliação(ões)`
                            : "Sem avaliações"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {d.specNames.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="rounded-full text-xs">
                          {s}
                        </Badge>
                      ))}
                      {d.specNames.length > 3 && (
                        <Badge variant="outline" className="rounded-full text-xs">
                          +{d.specNames.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BadgeCheck className="size-3.5" /> CRM {d.crm}/{d.crm_state}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" /> {d.years_experience} anos
                      </span>
                      {d.hourly_rate ? <span>R$ {Number(d.hourly_rate).toFixed(0)}/h</span> : null}
                      <span className={d.available ? "text-accent-foreground" : ""}>
                        {d.available ? "Disponível" : "Indisponível"}
                      </span>
                    </div>
                  </Link>
                  </div>
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
