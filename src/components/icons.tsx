// Our own simple line icons (24x24, currentColor). No third-party icon set.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const MenuIcon = (p: P) => (
  <Svg {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Svg>
);
export const SearchIcon = (p: P) => (
  <Svg {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></Svg>
);
export const CloseIcon = (p: P) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);
export const BackIcon = (p: P) => (
  <Svg {...p}><path d="M20 12H5M11 5l-7 7 7 7" /></Svg>
);
export const ChevronLeft = (p: P) => (
  <Svg {...p}><path d="m15 5-7 7 7 7" /></Svg>
);
export const ChevronRight = (p: P) => (
  <Svg {...p}><path d="m9 5 7 7-7 7" /></Svg>
);
export const ChevronDown = (p: P) => (
  <Svg {...p}><path d="m5 9 7 7 7-7" /></Svg>
);
export const SunIcon = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>
);
export const MoonIcon = (p: P) => (
  <Svg {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /></Svg>
);
export const SparkIcon = (p: P) => (
  <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" /></Svg>
);
export const MusicIcon = (p: P) => (
  <Svg {...p}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></Svg>
);
export const SoundIcon = (p: P) => (
  <Svg {...p}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></Svg>
);
export const FontIcon = (p: P) => (
  <Svg {...p}><path d="M4 19 9 5h1l5 14M6 14h7" /><path d="M17 12.5c.6-.6 1.4-1 2.3-1 1.5 0 2.2.9 2.2 2.3V19m0-3.5c-2.8 0-4.5.5-4.5 2 0 1 .8 1.7 1.9 1.7 1.4 0 2.6-1 2.6-2.4" /></Svg>
);
export const ShapesIcon = (p: P) => (
  <Svg {...p}><rect x="3" y="13" width="8" height="8" rx="1.5" /><circle cx="17" cy="7" r="4" /><path d="M14 21h7l-3.5-6L14 21Z" /><path d="M3 5h8M7 3v8" /></Svg>
);
export const TuneIcon = (p: P) => (
  <Svg {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></Svg>
);
export const PlayIcon = (p: P) => (
  <Svg {...p}><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" stroke="none" /></Svg>
);
export const FolderIcon = (p: P) => (
  <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></Svg>
);
export const DownloadIcon = (p: P) => (
  <Svg {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Svg>
);
export const ExternalIcon = (p: P) => (
  <Svg {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Svg>
);
export const LinkIcon = (p: P) => (
  <Svg {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Svg>
);
export const CheckIcon = (p: P) => (
  <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
);
export const MoreIcon = (p: P) => (
  <Svg {...p}><circle cx="12" cy="5" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="19" r="1.3" fill="currentColor" /></Svg>
);
export const ShieldIcon = (p: P) => (
  <Svg {...p}><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" /></Svg>
);
export const LogoutIcon = (p: P) => (
  <Svg {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10" /></Svg>
);
export const LockIcon = (p: P) => (
  <Svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
);
/** Brand mark: a safe with a red dial and a red shield. Outlines follow the
 *  text colour and fills follow the theme, so it works in dark and light. */
export const VaultLogo = ({ size = 32, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={className}>
    <g stroke="var(--fg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="12" y="50" width="10" height="8" rx="2" fill="var(--fg)" />
      <rect x="36" y="50" width="10" height="8" rx="2" fill="var(--fg)" />
      <rect x="5" y="5" width="50" height="47" rx="10" fill="var(--bg-elev)" />
      <rect x="11.5" y="11.5" width="37" height="34" rx="5" fill="var(--bg)" />
      <circle cx="23.5" cy="28.5" r="8.5" fill="var(--brand)" />
      <path d="M23.5 20v17M15 28.5h17M17.5 22.5l12 12M29.5 22.5l-12 12" strokeWidth="2" />
      <circle cx="23.5" cy="28.5" r="2.6" fill="var(--bg)" strokeWidth="2" />
      <circle cx="40" cy="24" r="3.2" fill="var(--fg)" />
      <path d="M40 27v9" />
      <path d="M50 33.5l10 4v7.5c0 6.2-4.3 10.6-10 12.6-5.7-2-10-6.4-10-12.6v-7.5z" fill="var(--brand)" />
      <path d="M45.6 46.2l3 3 5.8-6" stroke="#fff" strokeWidth="3" fill="none" />
    </g>
  </svg>
);
export const MailIcon = (p: P) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></Svg>
);
export const EyeIcon = (p: P) => (
  <Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const EyeOffIcon = (p: P) => (
  <Svg {...p}><path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.9 0 3.5-.6 4.9-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></Svg>
);
export const KeyIcon = (p: P) => (
  <Svg {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M14 9l2 2" /></Svg>
);
export const ArrowRightIcon = (p: P) => (
  <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);
export const AutoplayIcon = (p: P) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4-2.5-4-2.5Z" fill="currentColor" stroke="none" /></Svg>
);

export const SECTION_ICONS = {
  effect: SparkIcon,
  music: MusicIcon,
  sound: SoundIcon,
  font: FontIcon,
  text: ShapesIcon,
} as const;
