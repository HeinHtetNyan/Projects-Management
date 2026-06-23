"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import { ArrowLeft, Save } from "lucide-react";

export default function NoteEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: note, isLoading } = useQuery({
    queryKey: ["note", id],
    queryFn: () => api.get(`/api/notes/${id}`).then((r) => r.data),
  });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => api.get("/api/projects").then((r) => r.data) });

  const [form, setForm] = useState({ title: "", content: "", project_id: "", tags: "" });

  useEffect(() => {
    if (note) setForm({ title: note.title, content: note.content || "", project_id: note.project_id ? String(note.project_id) : "", tags: note.tags || "" });
  }, [note]);

  const updateMut = useMutation({
    mutationFn: () => api.put(`/api/notes/${id}`, { ...form, project_id: form.project_id ? Number(form.project_id) : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["note", id] }); qc.invalidateQueries({ queryKey: ["notes"] }); },
  });

  if (isLoading) return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <Topbar
        title={form.title || "Untitled Note"}
        action={
          <div className="flex gap-2">
            <button onClick={() => router.back()} className="btn-ghost flex items-center gap-1.5"><ArrowLeft size={15} /> Back</button>
            <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="btn-primary flex items-center gap-1.5">
              <Save size={15} /> {updateMut.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        }
      />
      <div className="p-6 space-y-4 max-w-3xl">
        <input className="field text-lg font-semibold" placeholder="Note title…" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#9aa3ab] mb-1">Project</label>
            <select className="field" value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}>
              <option value="">—</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#9aa3ab] mb-1">Tags (comma-separated)</label>
            <input className="field" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          </div>
        </div>
        <textarea
          className="field resize-none w-full min-h-[400px] font-mono text-sm"
          placeholder="Write your note here…"
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
        />
        {updateMut.isSuccess && <p className="text-sm text-green-400">Saved successfully.</p>}
      </div>
    </div>
  );
}
