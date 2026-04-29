import { auth } from "@/auth";
import { PortalShell } from "@/components/portal-shell";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  return <PortalShell email={session.user.email}>{children}</PortalShell>;
}
