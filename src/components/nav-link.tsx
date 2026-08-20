"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`${className} transition-colors ${
        active ? "bg-ink-800 text-ink-100 lg:bg-ink-800" : "text-ink-400 hover:text-ink-100"
      }`}
    >
      {children}
    </Link>
  );
}
