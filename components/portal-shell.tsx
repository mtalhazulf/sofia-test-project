"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/clients", label: "Clients" },
];

export function PortalShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/clients" className="font-semibold tracking-tight text-firm-blue">
            AW Client Report Portal
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  pathname.startsWith(n.href) && "text-firm-blue font-medium",
                )}
              >
                {n.label}
              </Link>
            ))}
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{email}</span>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="text-muted-foreground hover:text-foreground">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="container py-8 flex-1">{children}</main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        V1 skeleton · Confidential — Windbrook Solutions
      </footer>
    </div>
  );
}
