"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FileText, BarChart3, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/ui/monogram";

const NAV = [
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Reports", icon: FileText, disabled: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, disabled: true },
];

export function PortalShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initial = email.charAt(0).toUpperCase();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  const sidebar = (
    <>
      <div className="px-5 py-5 border-b border-line flex items-center justify-between">
        <Link href="/clients" className="flex items-center gap-2.5 group">
          <Monogram size={28} />
          <div className="flex flex-col leading-tight">
            <span className="text-[0.9375rem] font-semibold text-ink tracking-[-0.01em]">
              Windbrook
            </span>
            <span className="text-[0.6875rem] text-ink-mute">Client Reporting</span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden h-8 w-8 grid place-items-center rounded-md text-ink-mute hover:bg-elevated hover:text-ink focus-ring"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="eyebrow px-2 mb-2">Workspace</div>
        <ul className="space-y-0.5">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = !n.disabled && pathname.startsWith(n.href);
            return (
              <li key={n.href}>
                {n.disabled ? (
                  <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[0.875rem] text-ink-faint cursor-not-allowed">
                    <Icon className="h-4 w-4" />
                    <span>{n.label}</span>
                    <span className="ml-auto text-[0.625rem] uppercase tracking-wider text-ink-faint">
                      Soon
                    </span>
                  </div>
                ) : (
                  <Link
                    href={n.href}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[0.875rem] transition-colors",
                      active
                        ? "bg-brand-tint text-brand font-medium"
                        : "text-ink-soft hover:bg-elevated",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{n.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-line">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="h-7 w-7 rounded-full bg-brand-wash text-brand grid place-items-center text-[0.75rem] font-semibold shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[0.8125rem] font-medium text-ink truncate">
              {email}
            </div>
            <div className="text-[0.6875rem] text-ink-mute">Administrator</div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="h-7 w-7 grid place-items-center rounded-md text-ink-mute hover:bg-elevated hover:text-ink transition-colors focus-ring"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-[100dvh] flex bg-canvas overflow-hidden">
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-line bg-surface flex-col h-full">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
          />
          <aside className="relative w-[78%] max-w-[280px] bg-surface border-r border-line flex flex-col h-full animate-fade-up">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-line bg-surface shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="h-9 w-9 grid place-items-center rounded-md text-ink-mute hover:bg-elevated hover:text-ink focus-ring -ml-1.5"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/clients" className="flex items-center gap-2 min-w-0">
            <Monogram size={22} />
            <span className="text-[0.9375rem] font-semibold text-ink tracking-[-0.01em] truncate">
              Windbrook
            </span>
          </Link>
          <div className="ml-auto h-7 w-7 rounded-full bg-brand-wash text-brand grid place-items-center text-[0.75rem] font-semibold shrink-0">
            {initial}
          </div>
        </header>

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-[1280px] w-full">
            {children}
          </main>
          <footer className="px-4 sm:px-6 lg:px-8 py-3 border-t border-line text-[0.75rem] text-ink-mute flex items-center justify-between gap-3">
            <span className="truncate">© Windbrook Solutions, LLC · Confidential</span>
            <span className="num shrink-0">v1.0</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
