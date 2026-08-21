import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NavLink } from "@/components/nav-link";
import {
  IconCalendar,
  IconCompanies,
  IconRoster,
  IconSettings,
  IconTitles,
  IconToday,
  IconUnits,
} from "@/components/icons";
import { PeekProvider } from "@/components/peek/peek-provider";
import { SESSION_COOKIE } from "@/lib/auth";
import { getActiveWorld } from "@/lib/world";

const NAV = [
  { href: "/", label: "Today", Icon: IconToday },
  { href: "/calendar", label: "Calendar", Icon: IconCalendar },
  { href: "/roster", label: "Roster", Icon: IconRoster },
  { href: "/groups", label: "Units", Icon: IconUnits },
  { href: "/companies", label: "Companies", Icon: IconCompanies },
  { href: "/titles", label: "Titles", Icon: IconTitles },
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
        <aside className="hidden w-56 shrink-0 border-r border-ink-800 bg-ink-900 lg:block 2xl:w-64">
          <div className="sticky top-0 flex h-dvh flex-col p-4">
            <Link href="/" className="mb-5 block">
              <span className="display block text-lg font-bold tracking-wide text-ink-100">
                Wrestling
                <span className="text-played-400"> Booker</span>
              </span>
            </Link>
            <Link
              href="/settings"
              className="mb-5 flex items-center gap-2 rounded-[3px] border border-ink-800 bg-ink-850 px-2.5 py-2 text-ink-400 hover:border-ink-700 hover:text-ink-200"
            >
              <IconSettings className="size-3.5" />
              <span className="display truncate text-[11px] tracking-widest">{world.name}</span>
            </Link>
            <nav className="flex flex-col gap-1">
              {NAV.map(({ href, label, Icon }) => (
                <NavLink
                  key={href}
                  href={href}
                  className="display flex items-center gap-3 rounded-[3px] border-l-2 border-transparent px-3 py-2.5 text-[13px] tracking-widest"
                >
                  <Icon className="size-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <form action={signOut} className="mt-auto">
              <button type="submit" className="display text-[11px] tracking-widest text-ink-500 hover:text-ink-300">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/90 pt-safe backdrop-blur lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/" className="display text-base font-bold tracking-wide">
                Wrestling<span className="text-played-400"> Booker</span>
              </Link>
              <Link href="/settings" className="flex items-center gap-1.5 text-ink-500">
                <IconSettings className="size-3.5" />
                <span className="display truncate text-[11px] tracking-widest">{world.name}</span>
              </Link>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 pt-4 pb-28 lg:px-10 lg:pt-10 lg:pb-16 2xl:px-14">
            <div className="mx-auto w-full max-w-[1700px]">{children}</div>
          </main>

          {/* Thumb-reachable tabs. */}
          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-ink-900/95 pb-safe backdrop-blur lg:hidden">
            <div className="grid grid-cols-6">
              {NAV.map(({ href, label, Icon }) => (
                <NavLink
                  key={href}
                  href={href}
                  className="display flex flex-col items-center gap-1 border-t-2 border-transparent px-1 py-2.5 text-[10px] tracking-widest"
                >
                  <Icon className="size-5" />
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </PeekProvider>
  );
}
