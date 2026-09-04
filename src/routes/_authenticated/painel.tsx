import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RolePicker } from "@/components/role-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Meu painel | EscalaMed" },
      {
        name: "description",
        content:
          "Gerencie seu perfil de médico ou escalista, especialidades, hospitais e candidaturas.",
      },
      { property: "og:title", content: "Meu painel | EscalaMed" },
      { property: "og:description", content: "Perfil, especialidades, hospitais e candidaturas." },
    ],
  }),
  component: Painel,
});

const profileSchema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo").max(120),
  phone: z.string().trim().max(20).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(2).optional(),
  bio: z.string().trim().max(1200, "Bio muito longa").optional(),
});

const doctorSchema = z.object({
  crm: z.string().trim().min(3, "Informe o CRM").max(20),
  crm_state: z.string().trim().length(2, "UF do CRM (ex: SP)"),
  years_experience: z.number().min(0).max(70),
  hourly_rate: z.number().min(0).max(100000).nullable(),
});

function Painel() {
  const { user, roles, isMedico, isEscalista } = useAuth();
  const queryClient = useQueryClient();
  const uid = user!.id;

  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    city: "",
    state: "",
    bio: "",
  });
  const [doctor, setDoctor] = useState({
    crm: "",
    crm_state: "",
    years_experience: "0",
    hourly_rate: "",
    available: true,
    accepts_urgent: false,
    has_rqe: false,
  });
  const [scheduler, setScheduler] = useState({ organization: "", job_title: "", hospital_id: "" });

  const { data } = useQuery({
    queryKey: ["painel", uid],
    queryFn: async () => {
      const [p, d, s, mySpecs, myHosps, apps] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("doctor_profiles").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("scheduler_profiles").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("doctor_specialties").select("specialty_id").eq("doctor_id", uid),
        supabase.from("doctor_hospitals").select("hospital_id").eq("doctor_id", uid),
        supabase
          .from("shift_applications")
          .select(
            "id, status, shift_id, doctor_id, shifts(shift_date, hospitals(name), specialties(name), created_by)",
          )
          .eq("doctor_id", uid),
      ]);
      return {
        profile: p.data,
        doctor: d.data,
        scheduler: s.data,
        specIds: (mySpecs.data ?? []).map((r) => r.specialty_id),
        hospIds: (myHosps.data ?? []).map((r) => r.hospital_id),
        apps: apps.data ?? [],
      };
    },
  });

  const { data: specialties } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () =>
      (await supabase.from("specialties").select("id, name").order("name")).data ?? [],
  });
  const { data: hospitals } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () =>
      (await supabase.from("hospitals").select("id, name, city, state").order("name")).data ?? [],
  });

  useEffect(() => {
    if (!data) return;
    if (data.profile) {
      setProfile({
        full_name: data.profile.full_name ?? "",
        phone: data.profile.phone ?? "",
        city: data.profile.city ?? "",
        state: data.profile.state ?? "",
        bio: data.profile.bio ?? "",
      });
    }
    if (data.doctor) {
      setDoctor({
        crm: data.doctor.crm,
        crm_state: data.doctor.crm_state,
        years_experience: String(data.doctor.years_experience),
        hourly_rate: data.doctor.hourly_rate ? String(data.doctor.hourly_rate) : "",
        available: data.doctor.available,
        accepts_urgent: data.doctor.accepts_urgent,
        has_rqe: data.doctor.has_rqe,
      });
    }
    if (data.scheduler) {
      setScheduler({
        organization: data.scheduler.organization,
        job_title: data.scheduler.job_title ?? "",
        hospital_id: data.scheduler.hospital_id ?? "",
      });
    }
  }, [data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["painel", uid] });

  const { data: myShifts } = useQuery({
    queryKey: ["my-shifts", uid],
    enabled: isEscalista,
    queryFn: async () =>
      (
        await supabase
          .from("shifts")
          .select(
            "id, shift_date, start_time, end_time, slots, status, hospitals(name), specialties(name), shift_applications(id, doctor_id, status)",
          )
          .eq("created_by", uid)
          .order("shift_date", { ascending: true })
      ).data ?? [],
  });

  // Only the doctors who actually applied to one of this scheduler's shifts —
  // avoids pulling every user's profile from the database.
  const applicantIds = useMemo(
    () =>
      Array.from(
        new Set(
          (myShifts ?? []).flatMap((s) => (s.shift_applications ?? []).map((a) => a.doctor_id)),
        ),
      ),
    [myShifts],
  );

  const { data: doctorNamesData } = useQuery({
    queryKey: ["doctor-names", applicantIds],
    enabled: isEscalista && applicantIds.length > 0,
    queryFn: async () =>
      (await supabase.from("profiles").select("id, full_name").in("id", applicantIds)).data ?? [],
  });
  const doctorNames = useMemo(
    () => new Map((doctorNamesData ?? []).map((p) => [p.id, p.full_name ?? "Médico(a)"])),
    [doctorNamesData],
  );

  async function setAppStatus(id: string, status: "aprovada" | "recusada") {
    const { error } = await supabase.from("shift_applications").update({ status }).eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar a candidatura");
      return;
    }
    toast.success(status === "aprovada" ? "Candidatura aprovada" : "Candidatura recusada");
    void queryClient.invalidateQueries({ queryKey: ["my-shifts", uid] });
  }

  async function saveProfile() {
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      id: uid,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      state: (parsed.data.state || "").toUpperCase() || null,
      bio: parsed.data.bio || null,
    });
    if (error) toast.error("Erro ao salvar perfil");
    else {
      toast.success("Perfil atualizado");
      refresh();
    }
  }

  async function saveDoctor() {
    const parsed = doctorSchema.safeParse({
      crm: doctor.crm,
      crm_state: doctor.crm_state,
      years_experience: Number(doctor.years_experience || 0),
      hourly_rate: doctor.hourly_rate ? Number(doctor.hourly_rate) : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const { error } = await supabase.from("doctor_profiles").upsert({
      user_id: uid,
      crm: parsed.data.crm,
      crm_state: parsed.data.crm_state.toUpperCase(),
      years_experience: parsed.data.years_experience,
      hourly_rate: parsed.data.hourly_rate,
      available: doctor.available,
      accepts_urgent: doctor.accepts_urgent,
      has_rqe: doctor.has_rqe,
    });
    if (error) toast.error("Erro ao salvar dados médicos");
    else {
      toast.success("Dados médicos salvos");
      refresh();
    }
  }

  async function saveScheduler() {
    if (scheduler.organization.trim().length < 2) {
      toast.error("Informe o hospital ou grupo onde você monta escalas");
      return;
    }
    const { error } = await supabase.from("scheduler_profiles").upsert({
      user_id: uid,
      organization: scheduler.organization.trim().slice(0, 140),
      job_title: scheduler.job_title.trim().slice(0, 80) || null,
      hospital_id: scheduler.hospital_id || null,
    });
    if (error) toast.error("Erro ao salvar dados de escalista");
    else {
      toast.success("Dados de escalista salvos");
      refresh();
    }
  }

  async function toggleSpecialty(specialtyId: string, on: boolean) {
    const q = on
      ? supabase.from("doctor_specialties").insert({ doctor_id: uid, specialty_id: specialtyId })
      : supabase
          .from("doctor_specialties")
          .delete()
          .eq("doctor_id", uid)
          .eq("specialty_id", specialtyId);
    const { error } = await q;
    if (error) toast.error("Erro ao atualizar especialidades");
    else refresh();
  }

  async function toggleHospital(hospitalId: string, on: boolean) {
    const q = on
      ? supabase.from("doctor_hospitals").insert({ doctor_id: uid, hospital_id: hospitalId })
      : supabase
          .from("doctor_hospitals")
          .delete()
          .eq("doctor_id", uid)
          .eq("hospital_id", hospitalId);
    const { error } = await q;
    if (error) toast.error("Erro ao atualizar hospitais");
    else refresh();
  }

  const specIds = data?.specIds ?? [];
  const hospIds = data?.hospIds ?? [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">Meu painel</h1>
          {roles.map((r) => (
            <Badge key={r} variant="secondary" className="rounded-full capitalize">
              {r}
            </Badge>
          ))}
        </div>

        {roles.length === 0 && <RolePicker />}

        <Tabs defaultValue="perfil" className="mt-8">
          <TabsList>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            {isMedico && <TabsTrigger value="medico">Dados médicos</TabsTrigger>}
            {isEscalista && <TabsTrigger value="escalista">Escalista</TabsTrigger>}
            <TabsTrigger value="candidaturas">Candidaturas</TabsTrigger>
            {isEscalista && <TabsTrigger value="minhas-vagas">Minhas vagas</TabsTrigger>}
          </TabsList>

          <TabsContent value="perfil" className="card-surface mt-6 space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="p-name">Nome completo</Label>
              <Input
                id="p-name"
                value={profile.full_name}
                maxLength={120}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="p-phone">Telefone</Label>
                <Input
                  id="p-phone"
                  value={profile.phone}
                  maxLength={20}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-city">Cidade</Label>
                <Input
                  id="p-city"
                  value={profile.city}
                  maxLength={80}
                  onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-state">UF</Label>
                <Input
                  id="p-state"
                  value={profile.state}
                  maxLength={2}
                  onChange={(e) => setProfile((p) => ({ ...p, state: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-bio">Apresentação</Label>
              <Textarea
                id="p-bio"
                value={profile.bio}
                maxLength={1200}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              />
            </div>
            <Button onClick={saveProfile}>Salvar perfil</Button>
          </TabsContent>

          {isMedico && (
            <TabsContent value="medico" className="mt-6 space-y-6">
              <section className="card-surface space-y-4 p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="crm">CRM</Label>
                    <Input
                      id="crm"
                      value={doctor.crm}
                      maxLength={20}
                      onChange={(e) => setDoctor((d) => ({ ...d, crm: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crm-uf">UF do CRM</Label>
                    <Input
                      id="crm-uf"
                      value={doctor.crm_state}
                      maxLength={2}
                      onChange={(e) => setDoctor((d) => ({ ...d, crm_state: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="years">Anos de experiência</Label>
                    <Input
                      id="years"
                      type="number"
                      min={0}
                      value={doctor.years_experience}
                      onChange={(e) =>
                        setDoctor((d) => ({ ...d, years_experience: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate">Valor por hora (R$)</Label>
                    <Input
                      id="rate"
                      type="number"
                      min={0}
                      value={doctor.hourly_rate}
                      onChange={(e) => setDoctor((d) => ({ ...d, hourly_rate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  {(
                    [
                      ["available", "Disponível para plantões"],
                      ["accepts_urgent", "Aceito urgências"],
                      ["has_rqe", "Possuo RQE"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        id={key}
                        checked={doctor[key]}
                        onCheckedChange={(v) => setDoctor((d) => ({ ...d, [key]: v }))}
                      />
                      <Label htmlFor={key}>{label}</Label>
                    </div>
                  ))}
                </div>
                <Button onClick={saveDoctor}>Salvar dados médicos</Button>
              </section>

              <section className="card-surface p-6">
                <h2 className="text-lg font-semibold">Minhas especialidades</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Clique para adicionar ou remover. Salve seus dados médicos antes.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(specialties ?? []).map((s) => {
                    const on = specIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSpecialty(s.id, !on)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-colors",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/60",
                        )}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="card-surface p-6">
                <h2 className="text-lg font-semibold">Hospitais onde atuo</h2>
                {(hospitals ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhum hospital cadastrado.{" "}
                    <Link to="/hospitais" className="text-primary underline">
                      Cadastrar agora
                    </Link>
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(hospitals ?? []).map((h) => {
                      const on = hospIds.includes(h.id);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => toggleHospital(h.id, !on)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs transition-colors",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/60",
                          )}
                        >
                          {h.name} · {h.city}/{h.state}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </TabsContent>
          )}

          {isEscalista && (
            <TabsContent value="escalista" className="card-surface mt-6 space-y-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="org">Hospital ou grupo</Label>
                <Input
                  id="org"
                  value={scheduler.organization}
                  maxLength={140}
                  onChange={(e) => setScheduler((s) => ({ ...s, organization: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job">Cargo</Label>
                <Input
                  id="job"
                  value={scheduler.job_title}
                  maxLength={80}
                  onChange={(e) => setScheduler((s) => ({ ...s, job_title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hospital vinculado</Label>
                <Select
                  value={scheduler.hospital_id}
                  onValueChange={(v) => setScheduler((s) => ({ ...s, hospital_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {(hospitals ?? []).map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name} — {h.city}/{h.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveScheduler}>Salvar dados de escalista</Button>
              <p className="text-sm text-muted-foreground">
                Depois, vá em{" "}
                <Link to="/medicos" className="text-primary underline">
                  Médicos
                </Link>{" "}
                para buscar e avaliar profissionais.
              </p>
            </TabsContent>
          )}

          <TabsContent value="candidaturas" className="mt-6">
            {(data?.apps ?? []).length === 0 ? (
              <p className="text-muted-foreground">
                Nenhuma candidatura ainda.{" "}
                <Link to="/vagas" className="text-primary underline">
                  Ver vagas abertas
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {(data?.apps ?? []).map((a) => (
                  <article
                    key={a.id}
                    className="card-surface flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="font-medium">{a.shifts?.specialties?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {a.shifts?.hospitals?.name} ·{" "}
                        {a.shifts?.shift_date
                          ? new Date(`${a.shifts.shift_date}T00:00:00`).toLocaleDateString("pt-BR")
                          : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {a.status}
                    </Badge>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          {isEscalista && (
            <TabsContent value="minhas-vagas" className="mt-6 space-y-4">
              {(myShifts ?? []).length === 0 ? (
                <p className="text-muted-foreground">
                  Você ainda não publicou vagas.{" "}
                  <Link to="/vagas" className="text-primary underline">
                    Publicar uma vaga
                  </Link>
                </p>
              ) : (
                (myShifts ?? []).map((s) => {
                  const apps = s.shift_applications ?? [];
                  const approved = apps.filter((a) => a.status === "aprovada").length;
                  return (
                    <article key={s.id} className="card-surface p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display text-lg font-semibold">
                            {s.specialties?.name}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {s.hospitals?.name} ·{" "}
                            {new Date(`${s.shift_date}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
                            {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {approved}/{s.slots} vaga(s) preenchida(s)
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-3">
                        {apps.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma candidatura recebida.
                          </p>
                        ) : (
                          apps.map((a) => (
                            <div
                              key={a.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                            >
                              <div>
                                <Link
                                  to="/medicos/$id"
                                  params={{ id: a.doctor_id }}
                                  className="text-sm font-medium hover:text-primary"
                                >
                                  {doctorNames.get(a.doctor_id) ?? "Médico(a)"}
                                </Link>
                                <p className="text-xs capitalize text-muted-foreground">
                                  {a.status}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={a.status === "aprovada"}
                                  onClick={() => void setAppStatus(a.id, "aprovada")}
                                >
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={a.status === "recusada"}
                                  onClick={() => void setAppStatus(a.id, "recusada")}
                                >
                                  Recusar
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}
