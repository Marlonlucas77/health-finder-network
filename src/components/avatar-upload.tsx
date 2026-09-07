import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function AvatarUpload({
  userId,
  fullName,
  avatarUrl,
  onUploaded,
  size = "size-24",
}: {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  onUploaded: (url: string) => void;
  size?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("A imagem precisa ter até 5MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (uploadError) {
      toast.error("Não foi possível enviar a imagem.");
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new image shows immediately, since the path is stable.
    const url = `${pub.publicUrl}?t=${Date.now()}`;
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", userId);
    setUploading(false);
    if (dbError) {
      toast.error("Imagem enviada, mas não foi possível salvar no perfil.");
      return;
    }
    toast.success("Foto atualizada!");
    onUploaded(url);
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn("group relative rounded-full", size)}
        aria-label="Alterar foto de perfil"
      >
        <Avatar className={cn(size)}>
          <AvatarImage src={avatarUrl ?? undefined} alt={fullName} />
          <AvatarFallback className="text-lg font-semibold text-primary">
            {initials(fullName || "?")}
          </AvatarFallback>
        </Avatar>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
          <Camera className="size-5" />
        </span>
      </button>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
        >
          {uploading ? "Enviando..." : "Alterar foto"}
        </button>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP, até 5MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
