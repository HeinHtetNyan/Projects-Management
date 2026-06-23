"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import { ArrowLeft, Copy, Check, Ban } from "lucide-react";
import { format } from "date-fns";

export default function TokenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: token, isLoading } = useQuery({
    queryKey: ["token", id],
    queryFn: () => api.get(`/api/tokens/${id}`).then((r) => r.data),
  });

  const revokeMut = useMutation({
    mutationFn: () => api.post(`/api/tokens/${id}/revoke`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["token", id] }),
  });

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (isLoading) return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!token) return <p className="p-6 text-[#9aa3ab]">Token not found.</p>;

  return (
    <div>
      <Topbar
        title={token.license_number}
        description={`${token.project?.name} · ${token.customer?.name}`}
        action={
          <div className="flex gap-2">
            <button onClick={() => router.back()} className="btn-ghost flex items-center gap-1.5"><ArrowLeft size={15} /> Back</button>
            {token.status === "pending" && (
              <button onClick={() => { if (confirm("Revoke this token?")) revokeMut.mutate(); }} className="btn-danger flex items-center gap-1.5">
                <Ban size={14} /> Revoke
              </button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Status banner */}
        {token.status === "pending" && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-4">
            <p className="text-sm text-yellow-400 font-medium">This token is ready to be sent to the customer.</p>
            <p className="text-xs text-yellow-300/70 mt-1">Once used, it cannot be reused. Share the activation URL below.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Token Info */}
          <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#e0e3e5]">Token Details</h2>
            <Row label="Status" value={<Badge value={token.status} />} />
            <Row label="License Type" value={<Badge value={token.license_type} />} />
            <Row label="Project" value={token.project?.name} />
            <Row label="Customer" value={token.customer?.name} />
            <Row label="Created" value={format(new Date(token.created_at), "MMM d, yyyy HH:mm")} />
            <Row label="Expires" value={token.expires_at ? format(new Date(token.expires_at), "MMM d, yyyy") : "Never"} />
            {token.used_at && <Row label="Used at" value={format(new Date(token.used_at), "MMM d, yyyy HH:mm")} />}
          </div>

          {/* Activation URL */}
          <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#e0e3e5]">Activation URL</h2>
            <p className="text-xs text-[#9aa3ab]">Send this URL to the customer. When they open it in a browser, it will launch the app and activate it automatically.</p>
            <div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-blue-400 bg-[#101415] border border-[#2a2f32] rounded-lg px-3 py-2.5 break-all">{token.activation_url}</code>
                <button onClick={() => copy(token.activation_url, "url")} className="flex-shrink-0 p-2 text-[#6b7680] hover:text-[#e0e3e5]">
                  {copied === "url" ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#6b7680] mb-2">Raw token value</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-[#9aa3ab] bg-[#101415] border border-[#2a2f32] rounded-lg px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap">{token.token}</code>
                <button onClick={() => copy(token.token, "token")} className="flex-shrink-0 p-2 text-[#6b7680] hover:text-[#e0e3e5]">
                  {copied === "token" ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#6b7680]">{label}</span>
      <span className="text-sm text-[#e0e3e5]">{value}</span>
    </div>
  );
}
