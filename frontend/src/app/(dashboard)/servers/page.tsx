"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Plus, Trash2 } from "lucide-react";

const EMPTY = { name: "", provider: "", ip_address: "", cpu: "", ram: "", storage: "", operating_system: "", purpose: "", status: "running", notes: "" };

export default function ServersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState("");

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ["servers"],
    queryFn: () => api.get("/api/servers").then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (body: typeof EMPTY) => api.post("/api/servers", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["servers"] }); setShowCreate(false); setForm(EMPTY); },
    onError: (e) => setErr(getErrorMessage(e)),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/api/servers/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servers"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/servers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servers"] }),
  });

  const F = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <Topbar title="Servers" description={`${servers.length} server${servers.length !== 1 ? "s" : ""}`}
        action={<button onClick={() => { setForm(EMPTY); setErr(""); setShowCreate(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Server</button>}
      />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="flex justify-center py-16 col-span-3"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : servers.length === 0 ? (
            <p className="text-[#6b7680] text-sm">No servers yet.</p>
          ) : servers.map((s: any) => (
            <div key={s.id} className="bg-[#1d2022] border border-[#2a2f32] rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-[#e0e3e5]">{s.name}</p>
                  <p className="text-xs text-[#6b7680] font-mono">{s.ip_address || "No IP"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge value={s.status} />
                  <button onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteMut.mutate(s.id); }} className="p-1.5 text-[#6b7680] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-xs text-[#9aa3ab] mb-4">
                {s.provider && <p>Provider: {s.provider}</p>}
                {s.cpu && <p>CPU: {s.cpu}</p>}
                {s.ram && <p>RAM: {s.ram}</p>}
                {s.purpose && <p>Purpose: {s.purpose}</p>}
              </div>
              <select
                className="field text-xs"
                value={s.status}
                onChange={(e) => updateStatusMut.mutate({ id: s.id, status: e.target.value })}
              >
                <option value="running">running</option>
                <option value="stopped">stopped</option>
                <option value="maintenance">maintenance</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <Modal title="Add Server" open={showCreate} onClose={() => setShowCreate(false)}>
        {err && <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Name *</label><input className="field" value={form.name} onChange={F("name")} /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Provider</label><input className="field" value={form.provider} onChange={F("provider")} placeholder="Hetzner, AWS…" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">IP Address</label><input className="field font-mono" value={form.ip_address} onChange={F("ip_address")} /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Status</label>
              <select className="field" value={form.status} onChange={F("status")}><option value="running">running</option><option value="stopped">stopped</option><option value="maintenance">maintenance</option></select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">CPU</label><input className="field" value={form.cpu} onChange={F("cpu")} placeholder="4 vCPU" /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">RAM</label><input className="field" value={form.ram} onChange={F("ram")} placeholder="8 GB" /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Storage</label><input className="field" value={form.storage} onChange={F("storage")} placeholder="80 GB SSD" /></div>
          </div>
          <div><label className="block text-xs text-[#9aa3ab] mb-1">Purpose</label><input className="field" value={form.purpose} onChange={F("purpose")} placeholder="License activation server" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
            <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.name} className="btn-primary">{createMut.isPending ? "Adding…" : "Add Server"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
