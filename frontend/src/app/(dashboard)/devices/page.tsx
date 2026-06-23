"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import { format } from "date-fns";

export default function DevicesPage() {
  const qc = useQueryClient();
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get("/api/devices").then((r) => r.data),
  });

  const blockMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/devices/${id}/block`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
  const unblockMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/devices/${id}/unblock`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });

  return (
    <div>
      <Topbar title="Devices" description={`${devices.length} registered device${devices.length !== 1 ? "s" : ""}`} />
      <div className="p-6">
        <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2f32]">
                {["Fingerprint", "Hostname", "OS", "Version", "Customer", "Last Seen", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6b7680]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2f32]">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6b7680]">Loading…</td></tr>
              ) : devices.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6b7680]">No devices registered.</td></tr>
              ) : devices.map((d: any) => (
                <tr key={d.id} className="hover:bg-[#22282b]">
                  <td className="px-4 py-3 font-mono text-xs text-[#9aa3ab]">{d.fingerprint.slice(0, 16)}…</td>
                  <td className="px-4 py-3 text-[#e0e3e5]">{d.hostname || "—"}</td>
                  <td className="px-4 py-3 text-[#9aa3ab]">{d.os || "—"}</td>
                  <td className="px-4 py-3 text-[#9aa3ab]">{d.app_version || "—"}</td>
                  <td className="px-4 py-3 text-[#9aa3ab]">{d.customer?.name || "—"}</td>
                  <td className="px-4 py-3 text-[#6b7680]">{d.last_seen ? format(new Date(d.last_seen), "MMM d, HH:mm") : "—"}</td>
                  <td className="px-4 py-3"><Badge value={d.status} /></td>
                  <td className="px-4 py-3">
                    {d.status === "blocked" ? (
                      <button onClick={() => unblockMut.mutate(d.id)} className="btn-ghost text-xs">Unblock</button>
                    ) : (
                      <button onClick={() => { if (confirm("Block this device?")) blockMut.mutate(d.id); }} className="btn-danger text-xs">Block</button>
                    )}
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
