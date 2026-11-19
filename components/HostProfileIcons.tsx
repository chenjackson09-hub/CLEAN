// Small inline line-icon set for the host profile card, matching the
// stakeholder mockup's minimal icon style. Deliberately hand-drawn/simple
// rather than pulling in an icon library for a handful of one-page icons.

function Stroke({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      {children}
    </svg>
  );
}

export function HouseIcon({ className }: { className?: string }) {
  return (
    <Stroke className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </Stroke>
  );
}

export function PinIcon({ className }: { className?: string }) {
  return (
    <Stroke className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.5 7-11.5A7 7 0 1 0 5 9.5C5 14.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.2" />
    </Stroke>
  );
}

export function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M9.05 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.539 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.366 2.446c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.355 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
    </svg>
  );
}

export function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <circle cx="7" cy="9.5" r="2" />
      <circle cx="12" cy="6.5" r="2" />
      <circle cx="17" cy="9.5" r="2" />
      <path d="M12 12c-3.2 0-5.8 2-5.8 4.6S8.6 20 12 20s5.8-1 5.8-3.4S15.2 12 12 12Z" />
    </svg>
  );
}

export function BedIcon({ className }: { className?: string }) {
  return (
    <Stroke className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v2M21 18v2M3 13V7a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v3" />
    </Stroke>
  );
}

export function BathIcon({ className }: { className?: string }) {
  return (
    <Stroke className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3s5 5.5 5 9.5a5 5 0 0 1-10 0C7 8.5 12 3 12 3Z" />
    </Stroke>
  );
}

export function FloorsIcon({ className }: { className?: string }) {
  return (
    <Stroke className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4v-4h4v-4h4v-4h4" />
    </Stroke>
  );
}

export function SizeIcon({ className }: { className?: string }) {
  return (
    <Stroke className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6M4 4v6M4 4l6 6M20 20h-6M20 20v-6M20 20l-6-6" />
    </Stroke>
  );
}

export function PeopleIcon({ className }: { className?: string }) {
  return (
    <Stroke className={className}>
      <circle cx="9" cy="8" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 14a4.5 4.5 0 0 1 4.5 4.5" />
    </Stroke>
  );
}

export function SparkleIcon({ className }: { className?: string }) {
  return (
    <Stroke className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m18 14 .6 1.8L20 16l-1.4.6L18 18l-.6-1.4L16 16l1.4-.6L18 14Z" />
    </Stroke>
  );
}

export function DocIcon({ className }: { className?: string }) {
  return (
    <Stroke className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M9 13h6M9 17h6" />
    </Stroke>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <Stroke className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </Stroke>
  );
}

// Icons for each "The home" row label — falls back to a plain bullet dot
// when a label doesn't have a dedicated icon.
export const HOME_FIELD_ICONS: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  Bedrooms: BedIcon,
  Rooms: BedIcon,
  Bathrooms: BathIcon,
  Floor: FloorsIcon,
  Floors: FloorsIcon,
  Size: SizeIcon,
  People: PeopleIcon,
  "Kids under 15": PeopleIcon,
};
