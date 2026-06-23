"use client";

import { X } from "lucide-react";

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, open, onClose, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-[#1d2022] border border-[#2a2f32] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2f32]">
          <h2 className="text-base font-semibold text-[#e0e3e5]">{title}</h2>
          <button onClick={onClose} className="text-[#6b7680] hover:text-[#e0e3e5] p-1 rounded">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
