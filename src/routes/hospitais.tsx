import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Building2, MapPin, Plus, Search, Globe, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/hospitais")({
  head: () => ({
    meta: [
      { title: "Hospitais cadastrados | EscalaMed" },
      {
        name: "description",
        content: "Consulte e cadastre hospitais, prontos-socorros e clínicas por cidade e estado.",
      },
      { property: "og:title", content: "Hospitais cadastrados | EscalaMed" },
      { property: "og:description", content: "Rede de hospitais e unidades de saúde do EscalaMed." },
    ],
  }),
  component: HospitalsPage,
});

const TYPES = ["Hospital Geral", "Pronto-Socorro", "UPA", "Maternidade", "Clínica", "Hospital Universitário"];

const schema = z.object({
  name: z.string().trim().min(3, "Informe o nome do hospital").max(140),
  city: z.string().trim().min(2, "Informe a cidade").max(80),
  state: z.string().trim().length(2, "Use a sigla do estado (ex: SP)"),
  type: z.string().trim().max(60),
  phone: z.string().trim().max(20).optional(),
  website: z.string().trim().max(200).optional(),
  address: z.string().trim().max(200).optional(),
});

function HospitalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    state: "",
    type: TYPES[0]!,
    phone: "",
    website: "",
    address: "",
  });

  const { data: hospitals } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => {
      const { data } = await supabase.from("hospitals").select("*").order("name");
      return data ?? [];
    },
  });

  const list = useMemo(() => {
    const t = term.toLowerCase().trim();
    if (!t) return hospitals ?? [];
    return (hospitals ?? []).filter(
      (h) =>
        h.name.toLowerCase().includes(t) ||
        h.city.toLowerCase().includes(t) ||
        h.state.toLowerCase().includes(t),
    );
  }, [hospitals, term]);

  async function create() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const { error } = await supabase.from("hospitals").insert({
      ...parsed.data,
      state: parsed.data.state.toUpperCase(),
      phone: parsed.data.phone || null,
      website: parsed.data.website || null,
      address: parsed.data.address || null,
      created_by: user!.id,
    });
    if (error) {
      toast.error("Não foi possível cadastrar o hospital");
      return;
    }
    toast.success("Hospital cadastrado");
    setOpen(false);
    setForm({ name: "", city: "", state: "", type: TYPES[0]!, phone: "", website: "", address: "" });
    queryClient.invalidateQueries({ queryKey: ["hospitals"] });
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Hospitais e unidades</h1>
            <p className="mt-2 text-muted-foreground">
              Base compartilhada de hospitais usada nos perfis médicos e nas vagas de plantão.
            </p>
          </div>
          {user && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" /> Cadastrar hospital
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo hospital</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="h-name">Nome</Label>
                    <Input id="h-name" value={form.name} onChange={set("name")} maxLength={140} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="h-city">Cidade</Label>
                      <Input id="h-city" value={form.city} onChange={set("city")} maxLength={80} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="h-state">UF</Label>
                      <Input id="h-state" value={form.state} onChange={set("state")} maxLength={2} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="h-address">Endereço</Label>
                    <Input id="h-address" value={form.address} onChange={set("address")} maxLength={200} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="h-phone">Telefone</Label>
                      <Input id="h-phone" value={form.phone} onChange={set("phone")} maxLength={20} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="h-site">Site</Label>
                      <Input id="h-site" value={form.website} onChange={set("website")} maxLength={200} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={create}>
                    Salvar hospital
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="relative mt-8 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, cidade ou UF"
            value={term}
            maxLength={80}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>

        {list.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">
            Nenhum hospital cadastrado ainda.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((h) => (
              <article key={h.id} className="card-surface p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Building2 className="size-5" />
                </span>
                <h2 className="mt-4 font-display text-base font-semibold">{h.name}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" /> {h.city}/{h.state}
                </p>
                <Badge variant="secondary" className="mt-3 rounded-full text-xs">
                  {h.type}
                </Badge>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {h.phone ? (
                    <p className="flex items-center gap-1">
                      <Phone className="size-3.5" /> {h.phone}
                    </p>
                  ) : null}
                  {h.website ? (
                    <p className="flex items-center gap-1 truncate">
                      <Globe className="size-3.5" /> {h.website}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
