"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  successMessage?: string;
}

export function CopyButton({
  text,
  label,
  className = "",
  successMessage = "Copied!",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? successMessage : `Copy '${text}'`}
      className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 border transition-all ${
        copied
          ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold scale-105"
          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>{label ? `${label} (Copied!)` : successMessage}</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{label || text}</span>
        </>
      )}
    </button>
  );
}
