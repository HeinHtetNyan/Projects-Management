"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import { FolderOpen, Users, Key, FileCheck, Monitor, Server } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#e0e3e5]">{value}</p>
        <p className="text-sm text-[#6b7680]">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/api/dashboard").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const d = data;

  return (
    <div>
      <Topbar title="Dashboard" description="Overview of Saw Yun LLC operations" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Projects" value={d?.total_projects ?? 0} icon={FolderOpen} color="bg-blue-600" />
          <StatCard label="Customers" value={d?.total_customers ?? 0} icon={Users} color="bg-violet-600" />
          <StatCard label="Pending Tokens" value={d?.pending_tokens ?? 0} icon={Key} color="bg-yellow-600" />
          <StatCard label="Active Licenses" value={d?.active_licenses ?? 0} icon={FileCheck} color="bg-green-600" />
          <StatCard label="Devices" value={d?.total_devices ?? 0} icon={Monitor} color="bg-cyan-600" />
          <StatCard label="Servers Online" value={d?.online_servers ?? 0} icon={Server} color="bg-emerald-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tokens */}
          <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2f32]">
              <h2 className="text-sm font-semibold text-[#e0e3e5]">Recent Tokens</h2>
            </div>
            <div className="divide-y divide-[#2a2f32]">
              {(d?.recent_tokens ?? []).map((t: any) => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#22282b]">
                  <div>
                    <p className="text-sm text-[#e0e3e5]">{t.license_number}</p>
                    <p className="text-xs text-[#6b7680]">{t.project?.name} · {t.customer?.name}</p>
                  </div>
                  <Badge value={t.status} />
                </div>
              ))}
              {!d?.recent_tokens?.length && (
                <p className="px-5 py-4 text-sm text-[#6b7680]">No tokens yet</p>
              )}
            </div>
          </div>

          {/* Recent Licenses */}
          <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2f32]">
              <h2 className="text-sm font-semibold text-[#e0e3e5]">Recent Activations</h2>
            </div>
            <div className="divide-y divide-[#2a2f32]">
              {(d?.recent_licenses ?? []).map((l: any) => (
                <div key={l.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#22282b]">
                  <div>
                    <p className="text-sm text-[#e0e3e5]">{l.license_number}</p>
                    <p className="text-xs text-[#6b7680]">{l.customer?.name} · {l.computer_id}</p>
                  </div>
                  <Badge value={l.is_active ? "active" : "inactive"} />
                </div>
              ))}
              {!d?.recent_licenses?.length && (
                <p className="px-5 py-4 text-sm text-[#6b7680]">No activations yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2a2f32]">
            <h2 className="text-sm font-semibold text-[#e0e3e5]">Recent Activity</h2>
          </div>
          <div className="divide-y divide-[#2a2f32]">
            {(d?.recent_audit ?? []).map((a: any) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#22282b]">
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-[#2a2f32] text-[#9aa3ab] px-2 py-0.5 rounded font-mono">{a.action}</span>
                  <p className="text-sm text-[#9aa3ab]">{a.resource_name || a.resource_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#6b7680]">{a.actor_name}</p>
                  <p className="text-xs text-[#6b7680]">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
            {!d?.recent_audit?.length && (
              <p className="px-5 py-4 text-sm text-[#6b7680]">No activity yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
