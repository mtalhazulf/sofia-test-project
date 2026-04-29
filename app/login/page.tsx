import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-firm-blue">AW Client Report Portal</CardTitle>
          <CardDescription>Sign in with your staff credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue="admin@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" defaultValue="admin1234" required />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
            {searchParams?.error ? (
              <p className="text-xs text-destructive">Invalid credentials.</p>
            ) : null}
            <p className="text-xs text-muted-foreground pt-2">
              Dev seed: admin@example.com / admin1234
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
