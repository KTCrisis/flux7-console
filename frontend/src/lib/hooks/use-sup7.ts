import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSup7Status, fetchSup7Config, fetchSup7Decisions, setSup7Paused } from "@/lib/api/sup7";

export function useSup7Status() {
  return useQuery({ queryKey: ["sup7", "status"], queryFn: fetchSup7Status, refetchInterval: 5000, retry: false });
}

export function useSup7Config() {
  return useQuery({ queryKey: ["sup7", "config"], queryFn: fetchSup7Config, refetchInterval: 30000, retry: false });
}

export function useSup7Decisions(limit = 30) {
  return useQuery({
    queryKey: ["sup7", "decisions", limit],
    queryFn: () => fetchSup7Decisions(limit),
    refetchInterval: 5000,
    retry: false,
  });
}

export function useSetSup7Paused() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paused: boolean) => setSup7Paused(paused),
    onSuccess: (status) => qc.setQueryData(["sup7", "status"], status),
  });
}
