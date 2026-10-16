import { useQuery } from "@tanstack/react-query";
import { fetchAssayRun, fetchAssayRuns } from "@/lib/api/assay";

export function useAssayRuns() {
  return useQuery({ queryKey: ["assay", "runs"], queryFn: fetchAssayRuns, refetchInterval: 10000 });
}

export function useAssayRun(id: string | null) {
  return useQuery({
    queryKey: ["assay", "run", id],
    queryFn: () => fetchAssayRun(id as string),
    enabled: !!id,
    staleTime: Infinity, // a report never changes once written
  });
}
