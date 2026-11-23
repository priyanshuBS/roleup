import Link from 'next/link';

/** Brand mark: two stacked "up" chevrons on a flat vermilion tile. Mirrors app/icon.svg. */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#D9480F" />
      <path
        d="M10 15.5 16 9.5l6 6"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 22.5 16 16.5l6 6"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.55"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="RoleUp home">
      <LogoMark />
      <span className="text-[1.0625rem] font-semibold tracking-[-0.03em]">RoleUp</span>
    </Link>
  );
}
