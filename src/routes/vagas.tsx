import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { CalendarClock, MapPin, Plus, Search, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/vagas")({
  head: () => ({
    meta: [
      { title: "Vagas de plantão abertas | EscalaMed" },
      {
        name: "description",
        content: "Plantões publicados por escalistas: hospital, especialidade, data, horário e valor.",
      },
      { property: "og:title", content: "Vagas de plantão | EscalaMed" },
      { property: "og:description", content: "Encontre e candidate-se a plantões médicos abertos." },
    ],
  }),
  component: ShiftsPage,
});

const schema = z.object({
  hospital_id: z.string().uuid("Selecione um hospital"),
  specialty_id: z.string().uuid("Selecione a especialidade"),
  shift_date: z.string().min(10, "Informe a data"),
  start_time: z.string().min(4),
  end_time: z.string().min(4),
  payment: z.string().max(12).optional(),
  slots: z.string().max(3).optional(),
  notes: z.string().trim().max(600).optional(),
});

function ShiftsPage() {
  const { user, isEscalista, isMedico } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [fSpecialty, setFSpecialty] = useState("all");
  const [fState, setFState] = useState("all");
  const [fStatus, setFStatus] = useState("abertas");
  const [form, setForm] = useState({
    hospital_id: "",
    specialty_id: "",
    shift_date: "",
    start_time: "07:00",
    end_time: "19:00",
    payment: "",
    slots: "1",
    notes: "",
  });

  const { data: hospitals } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => (await supabase.from("hospitals").select("id, name, city, state").order("name")).data ?? [],
  });
  const { data: specialties } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => (await supabase.from("specialties").select("id, name").order("name")).data ?? [],
  });

  const { data } = useQuery({
    queryKey: ["shifts"],
    enabled: !!user,
    queryFn: async () => {
      const [shifts, apps] = await Promise.all([
        supabase
          .from("shifts")
          .select("*, hospitals(name, city, state), specialties(name)")
          .order("shift_date", { ascending: true }),
        supabase.from("shift_applications").select("id, shift_id, doctor_id, status"),
      ]);
      return { shifts: shifts.data ?? [], apps: apps.data ?? [] };
    },
  });

  const ufs = useMemo(
    () =>
      Array.from(
        new Set(
          (data?.shifts ?? [])
            .map((s) => (s.hospitals as { state?: string } | null)?.state)
            .filter((v): v is string => !!v),
        ),
      ).sort(),
    [data],
  );

  const visibleShifts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (data?.shifts ?? []).filter((s) => {
      const h = s.hospitals as { name?: string; city?: string; state?: string } | null;
      const sp = s.specialties as { name?: string } | null;
      if (term) {
        const t = term.toLowerCase();
        const hit = [h?.name, h?.city, sp?.name].some((v) => (v ?? "").toLowerCase().includes(t));
        if (!hit) return false;
      }
      if (fSpecialty !== "all" && s.specialty_id !== fSpecialty) return false;
      if (fState !== "all" && h?.state !== fState) return false;
      if (fStatus === "abertas" && s.status !== "aberta") return false;
      if (fStatus === "futuras" && String(s.shift_date) < today) return false;
      return true;
    });
  }, [data, term, fSpecialty, fState, fStatus]);

  async function createShift() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const { error } = await supabase.from("shifts").insert({
      created_by: user!.id,
      hospital_id: parsed.data.hospital_id,
      specialty_id: parsed.data.specialty_id,
      shift_date: parsed.data.shift_date,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      payment: parsed.data.payment ? Number(parsed.data.payment) : null,
      slots: Number(parsed.data.slots || 1),
      notes: parsed.data.notes || null,
    });
    if (error) {
      toast.error("Não foi possível publicar a vaga");
      return;
    }
    toast.success("Vaga publicada");
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["shifts"] });
  }

  async function apply(shiftId: string) {
    const { error } = await supabase
      .from("shift_applications")
      .insert({ shift_id: shiftId, doctor_id: user!.id });
    if (error) {
      toast.error("Você já se candidatou ou não tem perfil médico");
      return;
    }
    toast.success("Candidatura enviada!");
    queryClient.invalidateQueries({ queryKey: ["shifts"] });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Vagas de plantão</h1>
            <p className="mt-2 text-muted-foreground">
              Escalistas publicam plantões; médicos se candidatam com um clique.
            </p>
          </div>
          {isEscalista && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" /> Publicar vaga
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova vaga de plantão</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Hospital</Label>
                    <Select
                      value={form.hospital_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, hospital_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {(hospitals ?? []).map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.name} — {h.city}/{h.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(hospitals ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Cadastre um hospital primeiro em{" "}
                        <Link to="/hospitais" className="text-primary underline">
                          Hospitais
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Especialidade</Label>
                    <Select
                      value={form.specialty_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, specialty_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {(specialties ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="date">Data</Label>
                      <Input
                        id="date"
                        type="date"
                        value={form.shift_date}
                        onChange={(e) => setForm((f) => ({ ...f, shift_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start">Início</Label>
                      <Input
                        id="start"
                        type="time"
                        value={form.start_time}
                        onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end">Fim</Label>
                      <Input
                        id="end"
                        type="time"
                        value={form.end_time}
                        onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pay">Valor (R$)</Label>
                      <Input
                        id="pay"
                        type="number"
                        min={0}
                        value={form.payment}
                        onChange={(e) => setForm((f) => ({ ...f, payment: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slots">Vagas</Label>
                      <Input
                        id="slots"
                        type="number"
                        min={1}
                        value={form.slots}
                        onChange={(e) => setForm((f) => ({ ...f, slots: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      maxLength={600}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                  <Button className="w-full" onClick={createShift}>
                    Publicar vaga
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {!user ? (
          <div className="card-surface mt-8 p-8 text-center">
            <h2 className="text-lg font-semibold">Entre para ver as vagas</h2>
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
                  placeholder="Hospital, cidade ou especialidade"
                  value={term}
                  maxLength={80}
                  onChange={(e) => setTerm(e.target.value)}
                />
              </div>
              <Select value={fSpecialty} onValueChange={setFSpecialty}>
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
              <Select value={fState} onValueChange={setFState}>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {ufs.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abertas">Somente abertas</SelectItem>
                  <SelectItem value="futuras">A partir de hoje</SelectItem>
                  <SelectItem value="all">Todas as vagas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {visibleShifts.length === 0 ? (
              <p className="mt-10 text-center text-muted-foreground">
                Nenhuma vaga encontrada com esses filtros.
              </p>
            ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {visibleShifts.map((s) => {
              const apps = (data?.apps ?? []).filter((a) => a.shift_id === s.id);
              const applied = apps.some((a) => a.doctor_id === user.id);
              return (
                <article key={s.id} className="card-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold">{s.specialties?.name}</h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="size-3.5" /> {s.hospitals?.name} — {s.hospitals?.city}/
                        {s.hospitals?.state}
                      </p>
                    </div>
                    <Badge variant={s.status === "aberta" ? "default" : "outline"}>{s.status}</Badge>
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-sm">
                    <CalendarClock className="size-4 text-primary" />
                    {new Date(`${s.shift_date}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
                    {String(s.start_time).slice(0, 5)} às {String(s.end_time).slice(0, 5)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {s.payment ? <span>R$ {Number(s.payment).toFixed(2)}</span> : null}
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" /> {apps.length}/{s.slots} candidatura(s)
                    </span>
                  </div>
                  {s.notes ? <p className="mt-3 text-sm">{s.notes}</p> : null}
                  {isMedico && (
                    <Button
                      className="mt-4"
                      variant={applied ? "outline" : "default"}
                      disabled={applied}
                      onClick={() => apply(s.id)}
                    >
                      {applied ? "Candidatura enviada" : "Candidatar-me"}
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
