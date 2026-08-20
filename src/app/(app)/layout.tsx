import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NavLink } from "@/components/nav-link";
import { PeekProvider } from "@/components/peek/peek-provider";
import { SESSION_COOKIE } from "@/lib/auth";
import { getActiveWorld } from "@/lib/world";

const NAV = [
  { href: "/", label: "Today", icon: "◆" },
  { href: "/calendar", label: "Calendar", icon: "▦" },
  { href: "/roster", label: "Roster", icon: "☰" },
  { href: "/companies", label: "Companies", icon: "⌂" },
  { href: "/titles", label: "Titles", icon: "★" },
] as const;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const world = await getActiveWorld();

  async function signOut() {
    "use server";
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    redirect("/login");
  }

  return (
    <PeekProvider>
      <div className="flex min-h-dvh flex-col lg:flex-row">
        {/* Desktop rail. The extra width is used for navigation so the phone
            layout never has to spend vertical space on it. */}
        <aside className="hidden w-56 shrink-0 border-r border-ink-800 bg-ink-900 lg:block">
          <div className="sticky top-0 flex h-dvh flex-col p-4">
            <Link href="/" className="mb-6 block">
              <span className="text-sm font-bold tracking-tight">Wrestling Booker</span>
            </Link>
            <Link href="/settings" className="mb-4 block truncate text-xs text-ink-500 hover:text-ink-300">
              {world.name} ·  settings
            </Link>
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
                  <span aria-hidden className="w-4 text-center text-ink-500">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <form action={signOut} className="mt-auto">
              <button type="submit" className="text-xs text-ink-500 hover:text-ink-300">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/90 pt-safe backdrop-blur lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/" className="text-sm font-bold tracking-tight">
                Wrestling Booker
              </Link>
              <Link href="/settings" className="truncate text-xs text-ink-500">
                {world.name} · settings
              </Link>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 pt-4 pb-28 lg:px-8 lg:pt-10 lg:pb-16">
            <div className="mx-auto w-full max-w-5xl">{children}</div>
          </main>

          {/* Thumb-reachable tabs. */}
          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-ink-900/95 pb-safe backdrop-blur lg:hidden">
            <div className="grid grid-cols-5">
              {NAV.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium"
                >
                  <span aria-hidden className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </PeekProvider>
  );
}
