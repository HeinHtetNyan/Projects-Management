"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Plus, ToggleLeft, Key } from "lucide-react";
import { format } from "date-fns";

const EMPTY = { username: "", email: "", password: "", role: "operator" };

export default function UsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState("");

  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: () => api.get("/api/users").then((r) => r.data) });

  const createMut = useMutation({
    mutationFn: (body: typeof EMPTY) => api.post("/api/users", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setShowCreate(false); setForm(EMPTY); },
    onError: (e) => setErr(getErrorMessage(e)),
  });
  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => api.patch(`/api/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
  const toggleMut = useMutation({
    mutationFn: (id: number) => api.patch(`/api/users/${id}/toggle-status`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
  const resetMut = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => api.patch(`/api/users/${id}/reset-password`, { password }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setResetUser(null); setNewPassword(""); },
    onError: (e) => setErr(getErrorMessage(e)),
  });

  const F = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <Topbar title="Users" description={`${users.length} user${users.length !== 1 ? "s" : ""}`}
        action={<button onClick={() => { setForm(EMPTY); setErr(""); setShowCreate(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add User</button>}
      />
      <div className="p-6">
        <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2f32]">
                {["Username", "Email", "Role", "Status", "Created", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6b7680]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2f32]">
              {isLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#6b7680]">Loading…</td></tr>
                : users.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#6b7680]">No users.</td></tr>
                : users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-[#22282b]">
                    <td className="px-4 py-3 font-medium text-[#e0e3e5]">
                      {u.username}{u.id === me?.id && <span className="ml-2 text-xs text-blue-400">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-[#9aa3ab]">{u.email || "—"}</td>
                    <td className="px-4 py-3">
                      {u.id === me?.id ? <Badge value={u.role} /> : (
                        <select className="field text-xs py-1" value={u.role} onChange={(e) => roleMut.mutate({ id: u.id, role: e.target.value })}>
                          <option value="admin">admin</option><option value="operator">operator</option><option value="viewer">viewer</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge value={u.status} /></td>
                    <td className="px-4 py-3 text-[#6b7680] text-xs">{format(new Date(u.created_at), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3">
                      {u.id !== me?.id && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setErr(""); setResetUser(u); setNewPassword(""); }} className="btn-ghost p-1.5" title="Reset password"><Key size={14} /></button>
                          <button onClick={() => { if (confirm(`${u.status === "active" ? "Suspend" : "Activate"} "${u.username}"?`)) toggleMut.mutate(u.id); }} className="btn-ghost p-1.5" title="Toggle status">
                            <ToggleLeft size={14} className={u.status === "active" ? "text-green-400" : "text-[#6b7680]"} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal title="Add User" open={showCreate} onClose={() => setShowCreate(false)}>
        {err && <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Username *</label><input className="field" value={form.username} onChange={F("username")} /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Email</label><input className="field" type="email" value={form.email} onChange={F("email")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Password *</label><input className="field" type="password" value={form.password} onChange={F("password")} /></div>
            <div><label className="block text-xs text-[#9aa3ab] mb-1">Role</label>
              <select className="field" value={form.role} onChange={F("role")}><option value="admin">admin</option><option value="operator">operator</option><option value="viewer">viewer</option></select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
            <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.username || !form.password} className="btn-primary">{createMut.isPending ? "Creating…" : "Create User"}</button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal title={`Reset password — ${resetUser?.username}`} open={!!resetUser} onClose={() => setResetUser(null)}>
        {err && <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="space-y-4">
          <div><label className="block text-xs text-[#9aa3ab] mb-1">New Password *</label><input className="field" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setResetUser(null)} className="btn-ghost">Cancel</button>
            <button onClick={() => resetUser && resetMut.mutate({ id: resetUser.id, password: newPassword })} disabled={resetMut.isPending || !newPassword.trim()} className="btn-primary">{resetMut.isPending ? "Resetting…" : "Reset Password"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
