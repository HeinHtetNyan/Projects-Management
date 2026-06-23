"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { format } from "date-fns";

export default function SecretVersionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["secret-versions", id],
    queryFn: () => api.get(`/api/secrets/${id}/versions`).then((r) => r.data),
  });

  const restoreMut = useMutation({
    mutationFn: (vid: number) => api.post(`/api/secrets/${id}/versions/${vid}/restore`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["secrets"] }); router.push("/secrets"); },
  });

  return (
    <div>
      <Topbar title="Secret Version History"
        action={<button onClick={() => router.back()} className="btn-ghost flex items-center gap-1.5"><ArrowLeft size={15} /> Back</button>}
      />
      <div className="p-6">
        <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2f32]">
                {["Version", "Rotated By", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6b7680]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2f32]">
              {isLoading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[#6b7680]">Loading…</td></tr>
                : versions.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[#6b7680]">No version history yet.</td></tr>
                : versions.map((v: any, i: number) => (
                  <tr key={v.id} className="hover:bg-[#22282b]">
                    <td className="px-4 py-3 text-[#e0e3e5]">v{versions.length - i}</td>
                    <td className="px-4 py-3 text-[#9aa3ab]">{v.rotated_by || "—"}</td>
                    <td className="px-4 py-3 text-[#6b7680]">{format(new Date(v.created_at), "MMM d, yyyy HH:mm")}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { if (confirm("Restore this version? Current value will be saved to history.")) restoreMut.mutate(v.id); }} className="btn-ghost flex items-center gap-1.5 text-xs">
                        <RotateCcw size={13} /> Restore
                      </button>
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
