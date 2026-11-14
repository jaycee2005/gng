"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function Flash() {
  const params = useSearchParams();
  const ok = params.get("ok");
  const error = params.get("error");

  if (!ok && !error) return null;

  return (
    <div className="mb-6 space-y-2" role="status" aria-live="polite">
      {ok && (
        <div className="flex items-start gap-2.5 rounded-md border border-[#C9E2D8] bg-[#E3F1EC] px-4 py-3 text-sm text-[#1F6F54]">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{ok}</span>
        </div>
      )}
      {error && (
        <div
          className="flex items-start gap-2.5 rounded-md border border-[#E2C2C2] bg-[#F6E6E6] px-4 py-3 text-sm text-[#8E2B2B]"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
