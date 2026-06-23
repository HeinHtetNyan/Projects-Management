"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, getErrorMessage } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import Modal from "@/components/ui/Modal";
import { Plus, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";

const EMPTY = { title: "", content: "", project_id: "", tags: "" };

export default function NotesPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", q],
    queryFn: () => api.get("/api/notes", { params: { q } }).then((r) => r.data),
  });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => api.get("/api/projects").then((r) => r.data) });

  const createMut = useMutation({
    mutationFn: (body: typeof EMPTY) => api.post("/api/notes", { ...body, project_id: body.project_id ? Number(body.project_id) : null }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["notes"] }); setShowCreate(false); router.push(`/notes/${res.data.id}`); },
    onError: (e) => setErr(getErrorMessage(e)),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  const F = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <Topbar title="Notes"
        action={<button onClick={() => { setForm(EMPTY); setErr(""); setShowCreate(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} /> New Note</button>}
      />
      <div className="p-6 space-y-4">
        <input className="field max-w-sm" placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} />

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {notes.length === 0 ? <p className="text-[#6b7680] text-sm col-span-3">No notes yet.</p>
              : notes.map((n: any) => (
                <div key={n.id} className="bg-[#1d2022] border border-[#2a2f32] rounded-xl p-5 cursor-pointer hover:border-[#3a4147] group transition-colors" onClick={() => router.push(`/notes/${n.id}`)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-[#6b7680] flex-shrink-0" />
                      <p className="font-medium text-[#e0e3e5] line-clamp-1">{n.title}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${n.title}"?`)) deleteMut.mutate(n.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 text-[#6b7680] hover:text-red-400 hover:bg-red-500/10 rounded transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {n.content && <p className="text-sm text-[#9aa3ab] line-clamp-3 mb-3">{n.content}</p>}
                  <div className="flex items-center justify-between text-xs text-[#6b7680]">
                    <span>{n.project?.name || "No project"}</span>
                    <span>{format(new Date(n.updated_at), "MMM d, yyyy")}</span>
                  </div>
                  {n.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {n.tags.split(",").map((t: string) => (
                        <span key={t} className="text-xs bg-[#2a2f32] text-[#9aa3ab] px-2 py-0.5 rounded-full">{t.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      <Modal title="New Note" open={showCreate} onClose={() => setShowCreate(false)}>
        {err && <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="space-y-4">
          <div><label className="block text-xs text-[#9aa3ab] mb-1">Title *</label><input className="field" value={form.title} onChange={F("title")} /></div>
          <div><label className="block text-xs text-[#9aa3ab] mb-1">Project</label>
            <select className="field" value={form.project_id} onChange={F("project_id")}><option value="">—</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <div><label className="block text-xs text-[#9aa3ab] mb-1">Tags (comma-separated)</label><input className="field" value={form.tags} onChange={F("tags")} placeholder="deployment, config" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
            <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.title} className="btn-primary">{createMut.isPending ? "Creating…" : "Create Note"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
