import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Monogram } from "@/components/ui/monogram";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { from?: string; error?: string };
}) {
  async function login(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    await signIn("credentials", {
      email,
      password,
      redirectTo: searchParams?.from || "/clients",
    });
  }

  return (
    <main className="min-h-[100dvh] grid place-items-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[380px] animate-fade-up">
        <div className="flex items-center gap-2.5 mb-10">
          <Monogram size={32} />
          <div className="flex flex-col leading-tight">
            <span className="text-[1rem] font-semibold text-ink tracking-[-0.01em]">
              Windbrook
            </span>
            <span className="text-[0.6875rem] text-ink-mute">Client Reporting</span>
          </div>
        </div>

        <div className="space-y-1.5 mb-8">
          <h1 className="text-[1.5rem] font-semibold text-ink tracking-[-0.018em] leading-tight">
            Sign in
          </h1>
          <p className="text-[0.875rem] text-ink-mute">
            Use your staff credentials to continue.
          </p>
        </div>

        <form action={login} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue="admin@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              defaultValue="admin1234"
              required
              autoComplete="current-password"
            />
          </div>

          {searchParams?.error ? (
            <div className="bg-brand-wash border border-brand/20 rounded-md px-3 py-2 text-[0.8125rem] text-brand">
              Invalid credentials. Please try again.
            </div>
          ) : null}

          <Button type="submit" variant="primary" className="w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-8 pt-5 border-t border-line">
          <div className="eyebrow mb-1">Development credentials</div>
          <div className="num text-[0.75rem] text-ink-mute">
            admin@example.com&nbsp;&nbsp;·&nbsp;&nbsp;admin1234
          </div>
        </div>
      </div>
    </main>
  );
}
