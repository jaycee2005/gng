import Link from "next/link";

export interface FilterPillOption {
  value: string;
  label: string;
  count?: number;
}

export function FilterPills({
  basePath,
  paramName = "status",
  current,
  options,
  allLabel = "All",
}: {
  basePath: string;
  paramName?: string;
  current?: string;
  options: FilterPillOption[];
  allLabel?: string;
}) {
  return (
    <nav aria-label="Filter list" className="flex flex-wrap items-center gap-1.5">
      <Link
        href={basePath}
        className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
          !current
            ? "bg-[var(--color-primary)] text-white"
            : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        }`}
      >
        {allLabel}
      </Link>
      {options.map((opt) => {
        const active = current === opt.value;
        return (
          <Link
            key={opt.value}
            href={`${basePath}?${paramName}=${encodeURIComponent(opt.value)}`}
            className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
              active
                ? "bg-[var(--color-primary)] text-white"
                : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-[var(--color-muted)] text-[var(--color-secondary)]"
                }`}
              >
                {opt.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

