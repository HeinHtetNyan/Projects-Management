"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { format } from "date-fns";

const EMPTY = { registrar: "", dns_provider: "", expiry_date: "", auto_renew: false, notes: "", status: "active" };

export default function DomainsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editDomain, setEditDomain] = useState<any>(null);
  const [newDomain, setNewDomain] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState("");

  const { data: domains = [], isLoading } = useQuery({ queryKey: ["domains"], queryFn: () => api.get("/api/domains").then((r) => r.data) });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => api.get("/api/projects").then((r) => r.data) });

  const createMut = useMutation({
    mutationFn: () => api.post("/api/domains", {
      domain: newDomain.trim().toLowerCase(),
      project_id: newProjectId ? Number(newProjectId) : null,
      ...form,
      expiry_date: form.expiry_date || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["domains"] }); setShowCreate(false); setNewDomain(""); setNewProjectId(""); setForm(EMPTY); },
    onError: (e) => setErr(getErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: () => api.put(`/api/domains/${editDomain.id}`, { ...form, expiry_date: form.expiry_date || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["domains"] }); setEditDomain(null); },
    onError: (e) => setErr(getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/domains/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domains"] }),
  });

  function openEdit(d: any) {
    setForm({ registrar: d.registrar || "", dns_provider: d.dns_provider || "", expiry_date: d.expiry_date || "", auto_renew: d.auto_renew, notes: d.notes || "", status: d.status });
    setErr(""); setEditDomain(d);
  }

  const F = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: k === "auto_renew" ? (e.target as HTMLInputElement).checked : e.target.value }));

  return (
    <div>
      <Topbar title="Domains" description={`${domains.length} domain${domains.length !== 1 ? "s" : ""}`}
        action={<button onClick={() => { setForm(EMPTY); setNewDomain(""); setNewProjectId(""); setErr(""); setShowCreate(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Domain</button>}
      />
      <div className="p-6">
        <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2f32]">
                {["Domain", "Project", "Registrar", "Expiry", "Auto-Renew", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6b7680]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2f32]">
              {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6b7680]">Loading…</td></tr>
                : domains.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6b7680]">No domains yet.</td></tr>
                : domains.map((d: any) => (
                  <tr key={d.id} className="hover:bg-[#22282b]">
                    <td className="px-4 py-3 font-medium text-[#e0e3e5]">{d.domain}</td>
                    <td className="px-4 py-3 text-[#9aa3ab]">{d.project?.name || "—"}</td>
                    <td className="px-4 py-3 text-[#9aa3ab]">{d.registrar || "—"}</td>
                    <td className="px-4 py-3">
                      {d.expiry_date ? (
                        <span className={d.days_until_expiry !== null && d.days_until_expiry < 30 ? "text-red-400" : "text-[#9aa3ab]"}>
                          {format(new Date(d.expiry_date), "MMM d, yyyy")}
                          {d.days_until_expiry !== null && d.days_until_expiry < 30 && ` (${d.days_until_expiry}d)`}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">{d.auto_renew ? "✓" : "—"}</td>
                    <td className="px-4 py-3"><Badge value={d.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(d)} className="btn-ghost p-1.5"><Edit3 size={14} /></button>
                        <button onClick={() => { if (confirm(`Delete "${d.domain}"?`)) deleteMut.mutate(d.id); }} className="btn-danger p-1.5"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal title="Add Domain" open={showCreate} onClose={() => setShowCreate(false)}>
        {err && <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Domain *</label><input className="field font-mono" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="sawyuntech.com" /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Project</label>
              <select className="field" value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}><option value="">—</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Registrar</label><input className="field" value={form.registrar} onChange={F("registrar")} /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">DNS Provider</label><input className="field" value={form.dns_provider} onChange={F("dns_provider")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Expiry Date</label><input className="field" type="date" value={form.expiry_date} onChange={F("expiry_date")} /></div>
            <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm text-[#e0e3e5] cursor-pointer"><input type="checkbox" checked={form.auto_renew as boolean} onChange={F("auto_renew")} className="accent-blue-600" /> Auto Renew</label></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
            <button onClick={() => createMut.mutate()} disabled={createMut.isPending || !newDomain.trim()} className="btn-primary">{createMut.isPending ? "Adding…" : "Add Domain"}</button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal title="Edit Domain" open={!!editDomain} onClose={() => setEditDomain(null)}>
        {err && <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Registrar</label><input className="field" value={form.registrar} onChange={F("registrar")} /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">DNS Provider</label><input className="field" value={form.dns_provider} onChange={F("dns_provider")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Expiry Date</label><input className="field" type="date" value={form.expiry_date} onChange={F("expiry_date")} /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Status</label>
              <select className="field" value={form.status} onChange={F("status")}><option value="active">active</option><option value="expired">expired</option><option value="transferred">transferred</option></select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ar" checked={form.auto_renew as boolean} onChange={F("auto_renew")} className="accent-blue-600" />
            <label htmlFor="ar" className="text-sm text-[#e0e3e5]">Auto Renew</label>
          </div>
          <div><label className="block text-xs text-[#9aa3ab] mb-1">Notes</label><textarea className="field resize-none" rows={2} value={form.notes} onChange={F("notes")} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditDomain(null)} className="btn-ghost">Cancel</button>
            <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="btn-primary">{updateMut.isPending ? "Saving…" : "Save Changes"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
