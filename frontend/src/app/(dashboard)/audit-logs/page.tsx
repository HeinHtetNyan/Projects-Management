"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import { format } from "date-fns";

export default function AuditLogsPage() {
  const [q, setQ] = useState("");
  const [resource, setResource] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", q, resource],
    queryFn: () => api.get("/api/audit-logs", { params: { q: q || undefined, resource: resource || undefined } }).then((r) => r.data),
  });

  return (
    <div>
      <Topbar title="Audit Logs" description={`${logs.length} event${logs.length !== 1 ? "s" : ""}`} />
      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <input className="field max-w-xs" placeholder="Search by user, action…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="field max-w-[160px]" value={resource} onChange={(e) => setResource(e.target.value)}>
            <option value="">All resources</option>
            {["project", "customer", "token", "license", "device", "server", "user", "secret", "domain", "integration", "note", "deployment"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2f32]">
                {["Time", "User", "Action", "Resource", "IP", "Details"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6b7680]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2f32]">
              {isLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#6b7680]">Loading…</td></tr>
                : logs.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#6b7680]">No logs match.</td></tr>
                : logs.map((l: any) => (
                  <tr key={l.id} className="hover:bg-[#22282b]">
                    <td className="px-4 py-3 text-[#6b7680] whitespace-nowrap">{format(new Date(l.created_at), "MMM d HH:mm:ss")}</td>
                    <td className="px-4 py-3 text-[#9aa3ab]">{l.actor_name || "system"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        l.action.includes("delete") || l.action.includes("revoke") || l.action.includes("deactivate") ? "text-red-400"
                        : l.action.includes("create") ? "text-green-400"
                        : "text-[#e0e3e5]"
                      }`}>{l.action}</span>
                    </td>
                    <td className="px-4 py-3">
                      {l.resource_type && (
                        <span className="text-xs text-[#9aa3ab]">{l.resource_type}{l.resource_name ? ` · ${l.resource_name}` : ""}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6b7680] font-mono text-xs">{l.ip_address || "—"}</td>
                    <td className="px-4 py-3">
                      {l.extra_data && (() => { try { const parsed = JSON.parse(l.extra_data); return Object.keys(parsed).length > 0 ? (
                        <details className="text-xs text-[#6b7680]">
                          <summary className="cursor-pointer hover:text-[#9aa3ab]">details</summary>
                          <pre className="mt-1 p-2 bg-[#101415] rounded text-xs overflow-auto max-w-xs">{JSON.stringify(parsed, null, 2)}</pre>
                        </details>
                      ) : null; } catch { return null; } })()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
