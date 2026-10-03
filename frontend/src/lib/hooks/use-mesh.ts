import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ToolAction, ApprovalSettings } from "@/lib/api/mesh";
import {
  fetchApprovalSettings,
  saveApprovalSettings,
  fetchPrecedents,
  forgetPrecedents,
  fetchTraces,
  fetchApprovals,
  fetchApprovalDetail,
  fetchHealth,
  resolveApproval,
  fetchOtelTraces,
  fetchTraceWhy,
  fetchTraceVerify,
  fetchSessions,
  fetchSessionEvents,
  fetchPolicies,
  fetchPolicyYaml,
  savePolicyYaml,
  fetchTools,
  fetchToolDecisions,
  setToolAction,
  fetchPendingPins,
  acceptPins,
  fetchMcpServers,
  fetchGrants,
  createGrant,
  revokeGrant,
  fetchHalts,
  createHalt,
  resumeHalt,
} from "@/lib/api/mesh";
import type { HaltScope } from "@/lib/api/mesh";

export function useHealth() {
  return useQuery({
    queryKey: ["mesh", "health"],
    queryFn: fetchHealth,
    refetchInterval: 10000,
  });
}

export function useTraces(opts?: {
  agent?: string;
  tool?: string;
  limit?: number;
  trace?: string;
}) {
  return useQuery({
    queryKey: ["mesh", "traces", opts],
    queryFn: () => fetchTraces(opts),
    refetchInterval: 5000,
  });
}

// The causal chain of one call. Fetched only when a trace is opened; the
// chain of a past call does not change, so no polling.
export function useTraceWhy(id: string | null) {
  return useQuery({
    queryKey: ["mesh", "trace-why", id],
    queryFn: () => fetchTraceWhy(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

// The chain check holds mesh7's writes for a few milliseconds: once a
// minute is plenty, and a mesh without the route is not retried.
export function useTraceVerify() {
  return useQuery({
    queryKey: ["mesh", "trace-verify"],
    queryFn: fetchTraceVerify,
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useOtelTraces(opts?: {
  agent?: string;
  tool?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["mesh", "otel-traces", opts],
    queryFn: () => fetchOtelTraces(opts),
    refetchInterval: 5000,
  });
}

export function useApprovals(opts?: { status?: string; tool?: string }) {
  return useQuery({
    queryKey: ["mesh", "approvals", opts],
    queryFn: () => fetchApprovals(opts),
    refetchInterval: 3000,
  });
}

export function useApprovalDetail(id: string | null) {
  return useQuery({
    queryKey: ["mesh", "approval", id],
    queryFn: () => fetchApprovalDetail(id!),
    enabled: !!id,
  });
}

export function useSessions(opts?: { limit?: number }) {
  return useQuery({
    queryKey: ["mesh", "sessions", opts],
    queryFn: () => fetchSessions(opts),
    refetchInterval: 10000,
  });
}

export function useSessionEvents(id: string | null, opts?: { limit?: number }) {
  return useQuery({
    queryKey: ["mesh", "session", id, opts],
    queryFn: () => fetchSessionEvents(id!, opts),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function usePolicies() {
  return useQuery({
    queryKey: ["mesh", "policies"],
    queryFn: fetchPolicies,
    staleTime: 30000,
  });
}

export function usePolicyYaml(name: string | null) {
  return useQuery({
    queryKey: ["mesh", "policy-yaml", name],
    queryFn: () => fetchPolicyYaml(name!),
    enabled: !!name,
    staleTime: Infinity,
  });
}

export function useSavePolicyYaml() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, content }: { name: string; content: string }) =>
      savePolicyYaml(name, content),
    onSuccess: (_data, { name }) => {
      qc.invalidateQueries({ queryKey: ["mesh", "policy-yaml", name] });
      qc.invalidateQueries({ queryKey: ["mesh", "policies"] });
    },
  });
}

export function useTools() {
  return useQuery({
    queryKey: ["mesh", "tools"],
    queryFn: fetchTools,
    staleTime: 30000,
  });
}

export function useToolDecisions(agent: string) {
  return useQuery({
    queryKey: ["mesh", "tool-decisions", agent],
    queryFn: () => fetchToolDecisions(agent),
    enabled: agent !== "",
    staleTime: 30000,
  });
}

export function useSetToolAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { agent: string; tool: string; action: ToolAction }) =>
      setToolAction(v.agent, v.tool, v.action),
    onSettled: (_d, _e, { agent }) => {
      qc.invalidateQueries({ queryKey: ["mesh", "tool-decisions", agent] });
      qc.invalidateQueries({ queryKey: ["mesh", "policies"] });
    },
  });
}

export function usePendingPins() {
  return useQuery({
    queryKey: ["mesh", "pins"],
    queryFn: fetchPendingPins,
    refetchInterval: 30000,
  });
}

export function useAcceptPins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target: { tools?: string[]; server?: string }) => acceptPins(target),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["mesh", "pins"] });
      qc.invalidateQueries({ queryKey: ["mesh", "tool-decisions"] });
    },
  });
}

export function useMcpServers() {
  return useQuery({
    queryKey: ["mesh", "mcp-servers"],
    queryFn: fetchMcpServers,
    refetchInterval: 15000,
  });
}

export function useGrants() {
  return useQuery({
    queryKey: ["mesh", "grants"],
    queryFn: fetchGrants,
    refetchInterval: 5000,
  });
}

export function useCreateGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { agent: string; tools: string; duration: string }) =>
      createGrant(opts),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mesh", "grants"] });
    },
  });
}

export function useRevokeGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeGrant(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mesh", "grants"] });
    },
  });
}

export function useResolveApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      reasoning,
    }: {
      id: string;
      decision: "approve" | "deny";
      reasoning?: string;
    }) => resolveApproval(id, decision, reasoning),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mesh", "approvals"] });
      qc.invalidateQueries({ queryKey: ["mesh", "traces"] });
    },
  });
}

export function usePrecedents() {
  return useQuery({ queryKey: ["mesh", "precedents"], queryFn: fetchPrecedents, refetchInterval: 10000, retry: false });
}

export function useForgetPrecedents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tool, agent }: { tool: string; agent: string }) => forgetPrecedents(tool, agent),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mesh", "precedents"] }),
  });
}

export function useApprovalSettings() {
  return useQuery({ queryKey: ["mesh", "approval-settings"], queryFn: fetchApprovalSettings, retry: false });
}

export function useSaveApprovalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: ApprovalSettings) => saveApprovalSettings(s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mesh", "approval-settings"] });
      qc.invalidateQueries({ queryKey: ["mesh", "precedents"] });
    },
  });
}

// Emergency stop. Polled often: a stop must show on every page within seconds,
// and so must its lifting.
export function useHalts() {
  return useQuery({
    queryKey: ["mesh", "halts"],
    queryFn: fetchHalts,
    refetchInterval: 3000,
  });
}

export function useCreateHalt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { scope: HaltScope; target?: string; reason?: string }) => createHalt(opts),
    onSuccess: () => {
      // a stop revokes grants and denies approvals: refresh those views too
      qc.invalidateQueries({ queryKey: ["mesh", "halts"] });
      qc.invalidateQueries({ queryKey: ["mesh", "grants"] });
      qc.invalidateQueries({ queryKey: ["mesh", "approvals"] });
    },
  });
}

export function useResumeHalt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resumeHalt(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mesh", "halts"] });
      qc.invalidateQueries({ queryKey: ["mesh", "grants"] });
    },
  });
}
