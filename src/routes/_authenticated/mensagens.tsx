import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/components/avatar-upload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  with: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/mensagens")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Mensagens | EscalaMed" },
      {
        name: "description",
        content: "Converse diretamente com médicos e escalistas pela plataforma.",
      },
    ],
  }),
  component: Mensagens,
});

type MessageRow = {
  id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  sender_id: string;
  recipient_id: string;
  shift_id: string | null;
};

type PartnerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

function Mensagens() {
  const { user } = useAuth();
  const { with: withId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [activePartner, setActivePartner] = useState<string | null>(withId ?? null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (withId) setActivePartner(withId);
  }, [withId]);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", user?.id],
    enabled: !!user,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const rows = (messages ?? []) as MessageRow[];
      const partnerIds = Array.from(
        new Set(rows.map((m) => (m.sender_id === user!.id ? m.recipient_id : m.sender_id))),
      );

      const { data: profiles } = partnerIds.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", partnerIds)
        : { data: [] as PartnerProfile[] };

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as PartnerProfile]));

      const conversations = new Map<string, MessageRow[]>();
      for (const m of rows) {
        const partnerId = m.sender_id === user!.id ? m.recipient_id : m.sender_id;
        if (!conversations.has(partnerId)) conversations.set(partnerId, []);
        conversations.get(partnerId)!.push(m);
      }

      return { conversations, profileMap };
    },
  });

  const conversationList = useMemo(() => {
    if (!data) return [];
    return Array.from(data.conversations.entries())
      .map(([partnerId, msgs]) => ({
        partnerId,
        partner: data.profileMap.get(partnerId),
        lastMessage: msgs[msgs.length - 1]!,
        unread: msgs.filter((m) => m.recipient_id === user?.id && !m.read_at).length,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime(),
      );
  }, [data, user?.id]);

  const activeMessages = useMemo(() => {
    if (!data || !activePartner) return [];
    return data.conversations.get(activePartner) ?? [];
  }, [data, activePartner]);

  const activePartnerProfile = activePartner ? data?.profileMap.get(activePartner) : undefined;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [activeMessages.length, activePartner]);

  // Mark unread messages in the open thread as read.
  useEffect(() => {
    if (!activePartner || !user) return;
    const unreadIds = activeMessages
      .filter((m) => m.recipient_id === user.id && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["messages", user.id] });
        queryClient.invalidateQueries({ queryKey: ["unread-messages-count", user.id] });
      });
  }, [activePartner, activeMessages, user, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const body = draft.trim();
      if (!body || !activePartner || !user) return;
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: activePartner,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", user!.id] });
    },
    onError: () => {
      toast.error("Não foi possível enviar a mensagem");
    },
  });

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">Mensagens</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Converse diretamente com médicos e escalistas.
        </p>

        <div className="mt-6 grid overflow-hidden rounded-xl border border-border md:grid-cols-[280px_1fr]">
          <aside className="border-b border-border md:border-b-0 md:border-r">
            {isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : conversationList.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nenhuma conversa ainda. Visite o perfil de um médico para iniciar.
              </p>
            ) : (
              <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
                {conversationList.map((c) => (
                  <li key={c.partnerId}>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePartner(c.partnerId);
                        navigate({ search: { with: c.partnerId } });
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted",
                        activePartner === c.partnerId && "bg-muted",
                      )}
                    >
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage src={c.partner?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-sm font-semibold text-primary">
                          {initials(c.partner?.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {c.partner?.full_name || "Usuário"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.lastMessage.body}
                        </p>
                      </div>
                      {c.unread > 0 && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="flex min-h-[70vh] flex-col">
            {!activePartner ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                Selecione uma conversa para começar.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border p-3">
                  <Avatar className="size-9">
                    <AvatarImage src={activePartnerProfile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs font-semibold text-primary">
                      {initials(activePartnerProfile?.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium">
                    {activePartnerProfile?.full_name || "Usuário"}
                  </p>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                  {activeMessages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        m.sender_id === user.id ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                          m.sender_id === user.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        <p className="whitespace-pre-line">{m.body}</p>
                        <p
                          className={cn(
                            "mt-1 text-[10px] opacity-70",
                            m.sender_id === user.id
                              ? "text-primary-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  className="flex items-end gap-2 border-t border-border p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage.mutate();
                  }}
                >
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage.mutate();
                      }
                    }}
                    placeholder="Escreva uma mensagem..."
                    className="min-h-[44px] flex-1 resize-none"
                    rows={1}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!draft.trim() || sendMessage.isPending}
                  >
                    <Send className="size-4" />
                  </Button>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
