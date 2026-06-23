"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

const EMPTY = { project_id: "", environment: "production", version: "", deployed_by: "", status: "success", release_notes: "" };

export default function DeploymentsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState("");

  const { data: deployments = [], isLoading } = useQuery({ queryKey: ["deployments"], queryFn: () => api.get("/api/deployments").then((r) => r.data) });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => api.get("/api/projects").then((r) => r.data) });

  const createMut = useMutation({
    mutationFn: (body: typeof EMPTY) => api.post("/api/deployments", { ...body, project_id: body.project_id ? Number(body.project_id) : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deployments"] }); setShowCreate(false); setForm(EMPTY); },
    onError: (e) => setErr(getErrorMessage(e)),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/deployments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deployments"] }),
  });

  const F = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <Topbar title="Deployments" description={`${deployments.length} recorded`}
        action={<button onClick={() => { setForm(EMPTY); setErr(""); setShowCreate(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Record Deployment</button>}
      />
      <div className="p-6">
        <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2f32]">
                {["Project", "Environment", "Version", "Deployed By", "Status", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6b7680]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2f32]">
              {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6b7680]">Loading…</td></tr>
                : deployments.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6b7680]">No deployments yet.</td></tr>
                : deployments.map((d: any) => (
                  <tr key={d.id} className="hover:bg-[#22282b]">
                    <td className="px-4 py-3 text-[#9aa3ab]">{d.project?.name || "—"}</td>
                    <td className="px-4 py-3"><Badge value={d.environment} /></td>
                    <td className="px-4 py-3 text-[#e0e3e5] font-mono text-xs">{d.version || "—"}</td>
                    <td className="px-4 py-3 text-[#9aa3ab]">{d.deployed_by || "—"}</td>
                    <td className="px-4 py-3"><Badge value={d.status} /></td>
                    <td className="px-4 py-3 text-[#6b7680]">{format(new Date(d.deployed_at), "MMM d, yyyy HH:mm")}</td>
                    <td className="px-4 py-3"><button onClick={() => { if (confirm("Delete this record?")) deleteMut.mutate(d.id); }} className="btn-danger p-1.5"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title="Record Deployment" open={showCreate} onClose={() => setShowCreate(false)}>
        {err && <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Project</label>
              <select className="field" value={form.project_id} onChange={F("project_id")}>
                <option value="">None</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Environment</label>
              <select className="field" value={form.environment} onChange={F("environment")}>
                <option>production</option><option>staging</option><option>development</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Version</label><input className="field" value={form.version} onChange={F("version")} placeholder="v1.2.0" /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Deployed By</label><input className="field" value={form.deployed_by} onChange={F("deployed_by")} /></div>
          </div>
          <div><label className="block text-xs text-[#9aa3ab] mb-1">Status</label>
            <select className="field" value={form.status} onChange={F("status")}><option value="success">success</option><option value="failed">failed</option><option value="rollback">rollback</option></select>
          </div>
          <div><label className="block text-xs text-[#9aa3ab] mb-1">Release Notes</label><textarea className="field resize-none" rows={3} value={form.release_notes} onChange={F("release_notes")} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
            <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending} className="btn-primary">{createMut.isPending ? "Saving…" : "Record"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
