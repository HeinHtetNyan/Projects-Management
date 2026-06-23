"use client";

import Link from "next/link";
import { Search } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function Topbar({ title, description, action }: Props) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2f32] bg-[#101415] sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-[#e0e3e5]">{title}</h1>
        {description && <p className="text-sm text-[#6b7680]">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/search"
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#6b7680] border border-[#2a2f32] rounded-lg hover:border-[#3a4147] hover:text-[#9aa3ab] transition-colors"
        >
          <Search size={14} />
          Search
          <span className="text-xs bg-[#2a2f32] px-1.5 rounded">⌘K</span>
        </Link>
        {action}
      </div>
    </div>
  );
}
