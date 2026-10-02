import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadMessagesCount() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["unread-messages-count", user?.id],
    enabled: !!user,
    refetchInterval: 20_000,
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return data ?? 0;
}
