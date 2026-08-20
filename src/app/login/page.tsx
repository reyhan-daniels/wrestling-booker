import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, checkPassword, createSessionToken } from "@/lib/auth";

export const metadata = { title: "Sign in — Wrestling Booker" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const failed = params.error === "1";

  async function signIn(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    const target = String(formData.get("next") ?? "/");
    // Only ever redirect inside the app.
    const safeTarget = target.startsWith("/") && !target.startsWith("//") ? target : "/";

    if (!checkPassword(password)) {
      redirect(`/login?error=1&next=${encodeURIComponent(safeTarget)}`);
    }

    const store = await cookies();
    store.set(SESSION_COOKIE, createSessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    redirect(safeTarget);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight">Wrestling Booker</h1>
        <p className="mt-1 text-sm text-ink-400">Your universe, on every device.</p>

        <form action={signIn} className="card mt-6 space-y-4 p-5">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className="field"
            />
          </div>
          {failed && <p className="text-sm text-danger-400">That password did not match.</p>}
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
