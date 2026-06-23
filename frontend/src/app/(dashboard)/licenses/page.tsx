"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import { PowerOff } from "lucide-react";
import { format } from "date-fns";

export default function LicensesPage() {
  const qc = useQueryClient();
  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["licenses"],
    queryFn: () => api.get("/api/licenses").then((r) => r.data),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/licenses/${id}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["licenses"] }),
  });

  return (
    <div>
      <Topbar title="Licenses" description={`${licenses.length} license${licenses.length !== 1 ? "s" : ""}`} />
      <div className="p-6">
        <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2f32]">
                {["License #", "Customer", "Project", "Computer ID", "Activated", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6b7680]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2f32]">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6b7680]">Loading…</td></tr>
              ) : licenses.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6b7680]">No licenses yet.</td></tr>
              ) : licenses.map((l: any) => (
                <tr key={l.id} className="hover:bg-[#22282b]">
                  <td className="px-4 py-3 text-[#e0e3e5] font-mono text-xs">{l.license_number}</td>
                  <td className="px-4 py-3 text-[#9aa3ab]">{l.customer?.name}</td>
                  <td className="px-4 py-3 text-[#9aa3ab]">{l.project?.name}</td>
                  <td className="px-4 py-3 text-[#6b7680] font-mono text-xs">{l.computer_id}</td>
                  <td className="px-4 py-3 text-[#6b7680]">{format(new Date(l.activated_at), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3"><Badge value={l.is_active ? "active" : "inactive"} /></td>
                  <td className="px-4 py-3">
                    {l.is_active && (
                      <button onClick={() => { if (confirm("Deactivate this license?")) deactivateMut.mutate(l.id); }} className="btn-danger flex items-center gap-1.5 text-xs">
                        <PowerOff size={13} /> Deactivate
                      </button>
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
