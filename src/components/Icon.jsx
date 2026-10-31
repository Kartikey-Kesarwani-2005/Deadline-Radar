/**
 * One line-icon set for the whole app.
 * Emoji are charming in copy, but UI controls need a single stroke weight and
 * a single ink colour — that is what makes the paper dashboard feel designed
 * instead of assembled. Everything here inherits `currentColor`.
 */
const PATHS = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  keyboard: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h.01M11 14h6" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 3.6 1 5.1 2 6.2H4C5 14.1 6 12.6 6 9Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  bellOff: (
    <>
      <path d="M6 9a6 6 0 0 1 9.2-5.1M18 9c0 3.6 1 5.1 2 6.2H9" />
      <path d="M10 19a2 2 0 0 0 4 0" />
      <path d="m4 4 16 16" />
    </>
  ),
  wifiOff: (
    <>
      <path d="m3 3 18 18" />
      <path d="M8.6 8.7a9 9 0 0 1 9.9 1.3" />
      <path d="M5 11.4a13 13 0 0 1 2.4-1.5" />
      <path d="M8.7 15.2a5 5 0 0 1 6.6 0" />
      <path d="M12 19h.01" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v11" />
      <path d="m7.5 10 4.5 4.5L16.5 10" />
      <path d="M4 20h16" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 20h16" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  chart: (
    <>
      <path d="M5 20v-6M12 20V8M19 20V4" />
      <path d="M3 20h18" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.5" />
    </>
  ),
  share: (
    <>
      <path d="M12 16V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />,
  skip: (
    <>
      <path d="M5 6.5 13 12l-8 5.5v-11Z" fill="currentColor" stroke="none" />
      <path d="M18 5v14" />
    </>
  ),
  sort: (
    <>
      <path d="M8 4v16M8 20l-3-3M8 4l3 3" />
      <path d="M16 20V4M16 4l-3 3M16 20l3-3" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  x: <path d="m6 6 12 12M18 6 6 18" />,
  alert: (
    <>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 9V7a2 2 0 0 1 2-2h12" />
      <path d="m15 2 3 3-3 3" />
      <path d="M20 15v2a2 2 0 0 1-2 2H6" />
      <path d="m9 22-3-3 3-3" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  flame: (
    <path d="M12 3c1 3 5 4 5 8a5 5 0 0 1-10 0c0-2 1-3.4 2-4.4.5 1.2 1.2 2 2.2 2.2C11 6.6 11 4.6 12 3Z" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  cloudSun: (
    <>
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 2.6v1.6M2.6 8h1.6M4.2 4.2l1.1 1.1M11.8 4.2 10.7 5.3" />
      <path d="M7 19h10.5a3.5 3.5 0 0 0 .4-7 5.5 5.5 0 0 0-10.4-1.2A3.6 3.6 0 0 0 7 19Z" />
    </>
  ),
  rain: (
    <>
      <path d="M7 16h10.5a3.5 3.5 0 0 0 .4-7 5.5 5.5 0 0 0-10.4-1.2A3.6 3.6 0 0 0 7 16Z" />
      <path d="M8 19.5 7.2 21M12 19.5 11.2 21M16 19.5 15.2 21" />
    </>
  ),
  storm: (
    <>
      <path d="M7 15h10.5a3.5 3.5 0 0 0 .4-7 5.5 5.5 0 0 0-10.4-1.2A3.6 3.6 0 0 0 7 15Z" />
      <path d="m12.5 16-2 4h3l-1.5 3.2" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="5" width="14" height="16" rx="2" />
      <path d="M9 3h6v4H9z" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3M8 21h8" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M17 9a4 4 0 0 1 0 6" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" />
      <path d="m6 6 2.2 2.2M15.8 15.8 18 18M18 6l-2.2 2.2M8.2 15.8 6 18" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5H6a2 2 0 0 0-2 2v9" />
    </>
  ),
  check: <path d="m5 12 4.5 4.5L19 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  square: <rect x="4.5" y="4.5" width="15" height="15" rx="2" />,
  list: (
    <>
      <path d="M8.5 6h11M8.5 12h11M8.5 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  calendarPlus: (
    <>
      <path d="M8 2.5v3M16 2.5v3M4 9.5h16" />
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M12 13v5M9.5 15.5h5" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 11.5 12 4l8.5 7.5" />
      <path d="M5.5 10.2V20h13v-9.8" />
      <path d="M10 20v-5.2h4V20" />
    </>
  ),
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  printer: (
    <>
      <path d="M7 8V3h10v5" />
      <rect x="4" y="8" width="16" height="8" rx="1.5" />
      <path d="M7 13h10v8H7z" />
      <path d="M17 11h.01" />
    </>
  ),
}

export default function Icon({ name, size = 15, className = '', strokeWidth = 1.6, title }) {
  const body = PATHS[name]
  if (!body) return null
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {body}
    </svg>
  )
}
