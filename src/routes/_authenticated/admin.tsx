import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Administração | EscalaMed" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Administração</h1>
        {loading ? null : !isAdmin ? (
          <div className="card-surface mt-8 flex flex-col items-center gap-2 p-10 text-center">
            <ShieldAlert className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              Esta área é restrita a administradores da plataforma.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="hospitais" className="mt-8">
            <TabsList>
              <TabsTrigger value="hospitais">Hospitais pendentes</TabsTrigger>
              <TabsTrigger value="crm">Verificações de CRM</TabsTrigger>
            </TabsList>
            <TabsContent value="hospitais" className="mt-6">
              <PendingHospitals />
            </TabsContent>
            <TabsContent value="crm" className="mt-6">
              <PendingVerifications />
            </TabsContent>
          </Tabs>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function PendingHospitals() {
  const queryClient = useQueryClient();
  const { data: hospitals } = useQuery({
    queryKey: ["admin-pending-hospitals"],
    queryFn: async () =>
      (
        await supabase
          .from("hospitals")
          .select("id, name, city, state, type, created_at")
          .eq("status", "pendente")
          .order("created_at", { ascending: true })
      ).data ?? [],
  });

  async function decide(id: string, approve: boolean) {
    const { error } = await supabase
      .from("hospitals")
      .update({ status: approve ? "aprovado" : "recusado" })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar.");
      return;
    }
    toast.success(approve ? "Hospital aprovado" : "Hospital recusado");
    queryClient.invalidateQueries({ queryKey: ["admin-pending-hospitals"] });
  }

  if ((hospitals ?? []).length === 0) {
    return <p className="text-muted-foreground">Nenhum hospital pendente. 🎉</p>;
  }

  return (
    <div className="space-y-3">
      {hospitals!.map((h) => (
        <div
          key={h.id}
          className="card-surface flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div>
            <p className="font-medium">{h.name}</p>
            <p className="text-sm text-muted-foreground">
              {h.city}/{h.state} · {h.type}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => decide(h.id, false)}>
              Recusar
            </Button>
            <Button size="sm" onClick={() => decide(h.id, true)}>
              Aprovar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingVerifications() {
  const queryClient = useQueryClient();
  const { data: requests } = useQuery({
    queryKey: ["admin-pending-verifications"],
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from("verification_requests")
        .select("id, doctor_id, document_path, selfie_path, created_at")
        .eq("status", "pendente")
        .order("created_at", { ascending: true });
      const list = reqs ?? [];
      const doctorIds = list.map((r) => r.doctor_id);
      if (doctorIds.length === 0) return [];
      const [{ data: profiles }, { data: doctorProfiles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", doctorIds),
        supabase.from("doctor_profiles").select("user_id, crm, crm_state").in("user_id", doctorIds),
      ]);
      return list.map((r) => ({
        ...r,
        full_name: profiles?.find((p) => p.id === r.doctor_id)?.full_name ?? "Médico(a)",
        crm: doctorProfiles?.find((d) => d.user_id === r.doctor_id)?.crm ?? "",
        crm_state: doctorProfiles?.find((d) => d.user_id === r.doctor_id)?.crm_state ?? "",
      }));
    },
  });

  async function decide(id: string, approve: boolean) {
    const { error } = await supabase.rpc("review_verification_request", {
      _request_id: id,
      _approve: approve,
      ...(approve ? {} : { _note: "Documentos ilegíveis ou inconsistentes. Envie novamente." }),
    });
    if (error) {
      toast.error("Não foi possível registrar a decisão.");
      return;
    }
    toast.success(approve ? "CRM verificado" : "Verificação recusada");
    queryClient.invalidateQueries({ queryKey: ["admin-pending-verifications"] });
  }

  if ((requests ?? []).length === 0) {
    return <p className="text-muted-foreground">Nenhuma verificação pendente. 🎉</p>;
  }

  return (
    <div className="space-y-4">
      {requests!.map((r) => (
        <div key={r.id} className="card-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{r.full_name}</p>
              <p className="text-sm text-muted-foreground">
                CRM {r.crm}/{r.crm_state}
              </p>
            </div>
            <Badge variant="secondary">Pendente</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SignedThumb path={r.document_path} label="Documento" />
            <SignedThumb path={r.selfie_path} label="Selfie" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => decide(r.id, false)}>
              Recusar
            </Button>
            <Button size="sm" onClick={() => decide(r.id, true)}>
              Aprovar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SignedThumb({ path, label }: { path: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.storage
      .from("identity-docs")
      .createSignedUrl(path, 300)
      .then(({ data }) => {
        if (active && data) setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-lg border border-border bg-secondary/40"
    >
      {url ? (
        <img src={url} alt={label} className="aspect-video w-full object-cover" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center text-xs text-muted-foreground">
          Carregando...
        </div>
      )}
      <p className="p-2 text-center text-xs text-muted-foreground">{label}</p>
    </a>
  );
}
