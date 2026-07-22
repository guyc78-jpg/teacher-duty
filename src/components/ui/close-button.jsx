import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CloseButton({ className, label = "סגירה", ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn("inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", className)}
      {...props}
    >
      <X className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}