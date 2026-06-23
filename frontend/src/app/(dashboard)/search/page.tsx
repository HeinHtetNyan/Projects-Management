"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Topbar from "@/components/layout/Topbar";
import { Search } from "lucide-react";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => api.get("/api/search", { params: { q: submitted } }).then((r) => r.data),
    enabled: submitted.length > 1,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length > 1) setSubmitted(q.trim());
  }

  const NAV_MAP: Record<string, string> = {
    projects: "/projects",
    customers: "/customers",
    tokens: "/tokens",
    licenses: "/licenses",
    devices: "/devices",
    servers: "/servers",
    notes: "/notes",
  };

  const total = data ? Object.values(data).flat().length : 0;

  return (
    <div>
      <Topbar title="Search" />
      <div className="p-6 space-y-6">
        <form onSubmit={handleSearch} className="flex gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7680]" />
            <input
              className="field pl-9"
              placeholder="Search across all resources…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary">Search</button>
        </form>

        {isLoading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}

        {data && (
          <>
            <p className="text-sm text-[#9aa3ab]">{total} result{total !== 1 ? "s" : ""} for <span className="text-[#e0e3e5]">"{submitted}"</span></p>

            {Object.entries(data as Record<string, any[]>).filter(([, items]) => items.length > 0).map(([type, items]) => (
              <div key={type}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b7680] mb-2">{type} ({items.length})</h3>
                <div className="bg-[#1d2022] border border-[#2a2f32] rounded-xl divide-y divide-[#2a2f32]">
                  {items.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => NAV_MAP[type] && router.push(`${NAV_MAP[type]}/${item.id}`)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#22282b] transition-colors group"
                    >
                      <div>
                        <p className="text-sm text-[#e0e3e5] group-hover:text-white">{item.name || item.username || item.domain || item.title || item.license_number || item.fingerprint || `#${item.id}`}</p>
                        {item.description && <p className="text-xs text-[#6b7680]">{item.description}</p>}
                      </div>
                      {NAV_MAP[type] && <span className="text-xs text-[#6b7680] group-hover:text-blue-400">View →</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {total === 0 && <p className="text-[#6b7680] text-sm">No results found.</p>}
          </>
        )}
      </div>
    </div>
  );
}
