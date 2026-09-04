import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Supabase/PostgREST projects cap a single request at a max row count
 * (commonly 1000), regardless of an explicit .limit() in the client. As the
 * hospitals table grew past that (thousands of seeded CNES records), naive
 * `.select(...)` calls were silently truncated — some hospitals would just
 * never show up, with no error. These helpers fetch every row by paging
 * through with `.range()` until a page comes back short of the page size.
 */

const PAGE_SIZE = 1000;

/** Full hospital rows, e.g. for the /hospitais listing page. */
export async function fetchAllHospitals(): Promise<Tables<"hospitals">[]> {
  const all: Tables<"hospitals">[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("hospitals")
      .select("*")
      .order("name")
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export type HospitalOption = Pick<Tables<"hospitals">, "id" | "name" | "city" | "state">;

/** Lightweight hospital rows for pickers/selects (id, name, city, state). */
export async function fetchAllHospitalOptions(): Promise<HospitalOption[]> {
  const all: HospitalOption[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("hospitals")
      .select("id, name, city, state")
      .order("name")
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}
