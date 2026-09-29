import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSup7Status, fetchSup7Config, fetchSup7Decisions, setSup7Paused,
  fetchSup7Files, fetchSup7File, saveSup7File,
  fetchBenchSets, fetchBenchRuns, fetchBenchRun, fetchBenchEstimate, fetchBenchProgress, startBenchRun,
} from "@/lib/api/sup7";

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

export function useSup7Files() {
  return useQuery({ queryKey: ["sup7", "files"], queryFn: fetchSup7Files, retry: false });
}

export function useSup7File(id: string | null) {
  return useQuery({
    queryKey: ["sup7", "file", id],
    queryFn: () => fetchSup7File(id as string),
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false, // never replace a draft under the user's hands
  });
}

export function useSaveSup7File() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text, sha }: { id: string; text: string; sha: string }) => saveSup7File(id, text, sha),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ["sup7", "file", id] });
      qc.invalidateQueries({ queryKey: ["sup7", "files"] });
      qc.invalidateQueries({ queryKey: ["sup7", "config"] });
    },
  });
}

export function useBenchSets() {
  return useQuery({ queryKey: ["sup7", "bench", "sets"], queryFn: fetchBenchSets, retry: false });
}

export function useBenchRuns(poll: boolean) {
  return useQuery({
    queryKey: ["sup7", "bench", "runs"],
    queryFn: fetchBenchRuns,
    refetchInterval: poll ? 1500 : false,
    retry: false,
  });
}

export function useBenchRun(id: string | null) {
  return useQuery({ queryKey: ["sup7", "bench", "run", id], queryFn: () => fetchBenchRun(id as string), enabled: !!id, retry: false });
}

export function useBenchEstimate(set: string | null) {
  return useQuery({
    queryKey: ["sup7", "bench", "estimate", set],
    queryFn: () => fetchBenchEstimate(set as string),
    enabled: !!set,
    retry: false,
  });
}

export function useBenchProgress(poll: boolean) {
  return useQuery({ queryKey: ["sup7", "bench", "progress"], queryFn: fetchBenchProgress, refetchInterval: poll ? 1000 : false, retry: false });
}

export function useStartBenchRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ set, mode }: { set: string; mode: "recompute" | "replay" }) => startBenchRun(set, mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sup7", "bench"] });
    },
  });
}
