"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

const EMPTY = { service: "", account: "", project_id: "", related_secrets: "", notes: "" };

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState("");

  const { data: integrations = [], isLoading } = useQuery({ queryKey: ["integrations"], queryFn: () => api.get("/api/integrations").then((r) => r.data) });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => api.get("/api/projects").then((r) => r.data) });

  const createMut = useMutation({
    mutationFn: (body: typeof EMPTY) => api.post("/api/integrations", { ...body, project_id: body.project_id ? Number(body.project_id) : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["integrations"] }); setShowCreate(false); setForm(EMPTY); },
    onError: (e) => setErr(getErrorMessage(e)),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/integrations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const F = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <Topbar title="Integrations" description={`${integrations.length} integration${integrations.length !== 1 ? "s" : ""}`}
        action={<button onClick={() => { setForm(EMPTY); setErr(""); setShowCreate(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Integration</button>}
      />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading ? <div className="flex justify-center py-16 col-span-3"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
            : integrations.length === 0 ? <p className="text-[#6b7680] text-sm">No integrations yet.</p>
            : integrations.map((ig: any) => (
              <div key={ig.id} className="bg-[#1d2022] border border-[#2a2f32] rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-[#e0e3e5]">{ig.service}</p>
                    {ig.account && <p className="text-xs text-[#6b7680]">{ig.account}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge value={ig.status} />
                    <button onClick={() => { if (confirm(`Delete "${ig.service}" integration?`)) deleteMut.mutate(ig.id); }} className="p-1.5 text-[#6b7680] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {ig.project?.name && <p className="text-xs text-[#9aa3ab] mb-1">Project: {ig.project.name}</p>}
                {ig.related_secrets && <p className="text-xs text-[#6b7680]">Secrets: {ig.related_secrets}</p>}
                {ig.notes && <p className="text-xs text-[#6b7680] mt-2">{ig.notes}</p>}
                <p className="text-xs text-[#6b7680] mt-2">{format(new Date(ig.created_at), "MMM d, yyyy")}</p>
              </div>
            ))}
        </div>
      </div>

      <Modal title="Add Integration" open={showCreate} onClose={() => setShowCreate(false)}>
        {err && <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Service *</label><input className="field" value={form.service} onChange={F("service")} placeholder="Cloudflare, GitHub…" /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Account</label><input className="field" value={form.account} onChange={F("account")} /></div>
          </div>
          <div><label className="block text-xs text-[#9aa3ab] mb-1">Project</label>
            <select className="field" value={form.project_id} onChange={F("project_id")}><option value="">—</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <div><label className="block text-xs text-[#9aa3ab] mb-1">Related Secrets (comma-separated names)</label><input className="field" value={form.related_secrets} onChange={F("related_secrets")} /></div>
          <div><label className="block text-xs text-[#9aa3ab] mb-1">Notes</label><textarea className="field resize-none" rows={2} value={form.notes} onChange={F("notes")} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
            <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.service} className="btn-primary">{createMut.isPending ? "Adding…" : "Add Integration"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
