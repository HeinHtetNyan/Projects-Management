"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard, FolderOpen, Users, Key, FileCheck,
  Monitor, Server, Rocket, Lock, Globe, Plug, FileText,
  UserCog, ClipboardList, Search, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/tokens", label: "Tokens", icon: Key },
  { href: "/licenses", label: "Licenses", icon: FileCheck },
  { href: "/devices", label: "Devices", icon: Monitor },
  { href: "/servers", label: "Servers", icon: Server },
  { href: "/deployments", label: "Deployments", icon: Rocket },
  { href: "/secrets", label: "Secrets Vault", icon: Lock },
  { href: "/domains", label: "Domains", icon: Globe },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/users", label: "Users", icon: UserCog },
  { href: "/audit-logs", label: "Audit Logs", icon: ClipboardList },
  { href: "/search", label: "Search", icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 flex-shrink-0 h-screen flex flex-col bg-[#191c1e] border-r border-[#2a2f32]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#2a2f32]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Lock size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e0e3e5] leading-none">Saw Yun LLC</p>
            <p className="text-xs text-[#6b7680] mt-0.5">Control Center</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors",
                active
                  ? "bg-blue-600/15 text-blue-400 font-medium"
                  : "text-[#9aa3ab] hover:text-[#e0e3e5] hover:bg-[#2a2f32]"
              )}
            >
              <Icon size={16} className="flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-[#2a2f32]">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#e0e3e5] truncate">{user?.username}</p>
            <p className="text-xs text-[#6b7680] truncate">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-[#6b7680] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
