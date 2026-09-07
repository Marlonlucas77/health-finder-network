import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function CrmVerification({ userId, crmVerified }: { userId: string; crmVerified: boolean }) {
  const queryClient = useQueryClient();
  const docRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const { data: latest } = useQuery({
    queryKey: ["verification-request", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("id, status, reviewer_note, created_at")
        .eq("doctor_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  function pickFile(kind: "doc" | "selfie", file: File | null) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Envie uma imagem (JPG/PNG/WEBP) ou PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("O arquivo precisa ter até 8MB.");
      return;
    }
    if (kind === "doc") setDocFile(file);
    else setSelfieFile(file);
  }

  async function submit() {
    if (!docFile || !selfieFile) {
      toast.error("Envie o documento do CRM e uma selfie.");
      return;
    }
    setSending(true);
    const docExt = docFile.name.split(".").pop() || "jpg";
    const selfieExt = selfieFile.name.split(".").pop() || "jpg";
    const docPath = `${userId}/document-${Date.now()}.${docExt}`;
    const selfiePath = `${userId}/selfie-${Date.now()}.${selfieExt}`;

    const [docUpload, selfieUpload] = await Promise.all([
      supabase.storage.from("identity-docs").upload(docPath, docFile),
      supabase.storage.from("identity-docs").upload(selfiePath, selfieFile),
    ]);
    if (docUpload.error || selfieUpload.error) {
      toast.error("Não foi possível enviar os arquivos.");
      setSending(false);
      return;
    }

    const { error } = await supabase.from("verification_requests").insert({
      doctor_id: userId,
      document_path: docPath,
      selfie_path: selfiePath,
    });
    setSending(false);
    if (error) {
      toast.error("Não foi possível enviar a solicitação.");
      return;
    }
    toast.success("Verificação enviada! Vamos analisar em breve.");
    setDocFile(null);
    setSelfieFile(null);
    queryClient.invalidateQueries({ queryKey: ["verification-request", userId] });
  }

  if (crmVerified) {
    return (
      <section className="card-surface p-6">
        <div className="flex items-center gap-2 text-primary">
          <BadgeCheck className="size-5" />
          <h2 className="text-lg font-semibold">CRM verificado</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu CRM foi verificado. Um selo aparece no seu perfil público.
        </p>
      </section>
    );
  }

  return (
    <section className="card-surface space-y-4 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Verificação de CRM</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Envie uma foto do seu documento do CRM e uma selfie para ganhar o selo de verificado no seu
        perfil. Os arquivos ficam privados, visíveis só para você e a equipe do EscalaMed.
      </p>

      {latest?.status === "pendente" ? (
        <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
          <Badge variant="secondary">Em análise</Badge>
          <p className="mt-2 text-muted-foreground">
            Sua verificação está sendo revisada. Isso costuma levar até 2 dias úteis.
          </p>
        </div>
      ) : (
        <>
          {latest?.status === "recusado" && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <Badge variant="destructive">Recusada</Badge>
              <p className="mt-2 text-muted-foreground">
                {latest.reviewer_note || "Sua última solicitação foi recusada. Tente novamente."}
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <input
                ref={docRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => pickFile("doc", e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => docRef.current?.click()}
              >
                <Upload className="size-4" />
                {docFile ? docFile.name : "Documento do CRM"}
              </Button>
            </div>
            <div>
              <input
                ref={selfieRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => pickFile("selfie", e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => selfieRef.current?.click()}
              >
                <Upload className="size-4" />
                {selfieFile ? selfieFile.name : "Selfie"}
              </Button>
            </div>
          </div>
          <Button onClick={submit} disabled={sending || !docFile || !selfieFile}>
            {sending ? "Enviando..." : "Enviar para verificação"}
          </Button>
        </>
      )}
    </section>
  );
}
