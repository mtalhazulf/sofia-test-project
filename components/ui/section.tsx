import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="space-y-3 animate-fade-up">
      {breadcrumb ? (
        <div className="text-[0.8125rem] text-ink-mute overflow-x-auto whitespace-nowrap">
          {breadcrumb}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-[1.375rem] sm:text-[1.5rem] font-semibold text-ink tracking-[-0.018em] leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="text-[0.875rem] text-ink-mute mt-1.5 max-w-2xl">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div className="shrink-0 flex flex-wrap items-center gap-2">{action}</div>
        ) : null}
      </div>
    </header>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 border border-line rounded-md bg-surface overflow-hidden animate-fade-up">
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-r border-b border-line last:border-r-0 [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r md:[&:nth-child(4n)]:border-r-0">
      <div className="eyebrow">{label}</div>
      <div className="num text-[1.375rem] text-ink mt-1.5 leading-none">{value}</div>
      {hint ? <div className="text-[0.75rem] text-ink-mute mt-1.5">{hint}</div> : null}
    </div>
  );
}

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3 animate-fade-up", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-[1rem] font-semibold text-ink tracking-[-0.012em]">{title}</h2>
          {description ? (
            <p className="text-[0.8125rem] text-ink-mute mt-0.5">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function DataRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-2.5 border-b border-line-soft last:border-b-0",
        className,
      )}
    >
      <span className="text-[0.8125rem] text-ink-mute">{label}</span>
      <span className="num text-[0.875rem] text-ink">{value}</span>
    </div>
  );
}
