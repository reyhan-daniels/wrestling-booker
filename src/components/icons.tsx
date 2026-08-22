/** Line icons at a consistent weight. The unicode glyphs they replace were
 *  mismatched in size and stroke, which alone made the nav look unfinished. */

type Props = { className?: string };

const base = "h-full w-full";

function Svg({ children, className }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconToday({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M13 2 4.5 13.5H11l-1 8.5 9.5-11.5H13z" />
    </Svg>
  );
}

export function IconCalendar({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="3" y="5" width="18" height="16" rx="1.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}

export function IconRoster({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5M17.5 20a5.5 5.5 0 0 0-2-4.2" />
    </Svg>
  );
}

export function IconCompanies({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M3 21h18M5 21V7l7-4 7 4v14" />
      <path d="M9.5 21v-5h5v5M9.5 10h1.5M13 10h1.5M9.5 13h1.5M13 13h1.5" />
    </Svg>
  );
}

/** A championship belt: plate with side straps. */
export function IconTitles({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M2 9h4v6H2zM18 9h4v6h-4z" />
      <rect x="6" y="6.5" width="12" height="11" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  );
}

/** Three figures shoulder to shoulder: a unit, whatever its size. */
export function IconUnits({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="7" r="2.6" />
      <circle cx="5" cy="9.5" r="2.1" />
      <circle cx="19" cy="9.5" r="2.1" />
      <path d="M7.5 19v-3a4.5 4.5 0 0 1 9 0v3" />
      <path d="M1.5 19v-2a3.6 3.6 0 0 1 3.5-3.5M22.5 19v-2a3.6 3.6 0 0 0-3.5-3.5" />
    </Svg>
  );
}

/** A bracket narrowing to one. */
export function IconTournament({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M3 5h5v5H3zM3 14h5v5H3zM16 9.5h5v5h-5z" />
      <path d="M8 7.5h3.5v9H8M11.5 12H16" />
    </Svg>
  );
}

export function IconSettings({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </Svg>
  );
}
