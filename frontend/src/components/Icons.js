import React from 'react';

// One consistent line-icon set (24px grid, round strokes).
// Usage: <Icon name="heart" />  or  <Icon name="heart" size={18} />
const PATHS = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h5v-6h4v6h5V9.5" /></>,
  health: <><path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.1 8.8 10.9 8.8 10.9s8.8-5.8 8.8-10.9Z" /><path d="M3.5 12h4l2-3 3 6 2-3h6" /></>,
  nutrition: <><path d="M12 7c-1.5-2.5-6-2.6-7 1.5-.9 3.8 1.6 10 4.6 11.3 1 .4 1.6-.3 2.4-.3s1.4.7 2.4.3c3-1.3 5.5-7.5 4.6-11.3-1-4.1-5.5-4-7-1.5Z" /><path d="M12 7c0-2 1-3.5 3-4" /></>,
  academic: <><path d="M2 9 12 4l10 5-10 5-10-5Z" /><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" /><path d="M22 9v6" /></>,
  documents: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></>,
  twin: <><circle cx="12" cy="12" r="2.5" /><circle cx="5" cy="6" r="1.8" /><circle cx="19" cy="6" r="1.8" /><circle cx="5" cy="18" r="1.8" /><circle cx="19" cy="18" r="1.8" /><path d="m6.5 7.3 3.6 3.1M17.5 7.3l-3.6 3.1M6.5 16.7l3.6-3.1M17.5 16.7l-3.6-3.1" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17 5 12l5-5" /><path d="M5 12h11" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></>,
  sleep: <><path d="M17 13.5A6.5 6.5 0 1 1 10.5 7 5 5 0 0 0 17 13.5Z" /><path d="M15 3h4l-4 4h4" /></>,
  steps: <><path d="M8 3.5c1.7 0 2.6 2.2 2.4 4.6-.2 2.6-1.3 4.4-2.9 4.4S5.2 10.6 5.4 8c.2-2.4 1-4.5 2.6-4.5Z" /><path d="M5.6 15.2l4.6.6-.3 2.4a2.3 2.3 0 0 1-4.6-.6l.3-2.4Z" /><path d="M16 7.5c1.6 0 2.4 2.1 2.6 4.5.2 2.6-.9 4.5-2.5 4.5s-2.7-1.8-2.9-4.4c-.2-2.4.7-4.6 2.8-4.6Z" /><path d="M18.4 19.2l-4.6.6.3 1.5" /></>,
  water: <><path d="M12 2.8s6.5 7 6.5 11.7a6.5 6.5 0 0 1-13 0C5.5 9.8 12 2.8 12 2.8Z" /><path d="M9 15a3 3 0 0 0 3 3" /></>,
  heart: <><path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.1 8.8 10.9 8.8 10.9s8.8-5.8 8.8-10.9Z" /></>,
  weight: <><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M8.5 10a3.5 3.5 0 0 1 7 0" /><path d="m12 10 1.5-2" /></>,
  flame: <><path d="M12 22c4 0 7-2.8 7-6.8 0-4.5-4-6.7-4.5-11.2-2.6 1.6-4 4.2-3.8 7-1-.5-1.8-1.6-2-3C6.6 9.6 5 12.2 5 15.2 5 19.2 8 22 12 22Z" /></>,
  protein: <><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></>,
  grain: <><path d="M12 22V8" /><path d="M12 13c-2.5 0-4.5-2-4.5-4.5 2.5 0 4.5 2 4.5 4.5Zm0 0c2.5 0 4.5-2 4.5-4.5-2.5 0-4.5 2-4.5 4.5Z" /><path d="M12 8c-1.5-1-2.2-2.6-2-5 2 .8 2.8 2.6 2 5Zm0 0c1.5-1 2.2-2.6 2-5-2 .8-2.8 2.6-2 5Z" /><path d="M12 18c-2.5 0-4.5-2-4.5-4.5M12 18c2.5 0 4.5-2 4.5-4.5" /></>,
  drop: <><path d="M12 2.8s6.5 7 6.5 11.7a6.5 6.5 0 0 1-13 0C5.5 9.8 12 2.8 12 2.8Z" /><path d="M5.6 14h12.8" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>,
  alert: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  check: <><path d="m5 12.5 4.5 4.5L19 7.5" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></>,
  edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
  download: <><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></>,
  upload: <><path d="M12 16V5M7 10l5-5 5 5" /><path d="M5 20h14" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  repeat: <><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></>,
  watch: <><rect x="6" y="6" width="12" height="12" rx="3" /><path d="M9 6 9.5 2h5L15 6M9 18l.5 4h5l.5-4" /><path d="M12 10v2.5l1.5 1" /></>,
  sync: <><path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3" /><path d="M18 3v4h-4M6 21v-4h4" /></>,
  chevronLeft: <><path d="m15 5-7 7 7 7" /></>,
  chevronRight: <><path d="m9 5 7 7-7 7" /></>,
  chevronDown: <><path d="m5 9 7 7 7-7" /></>,
  chevronUp: <><path d="m5 15 7-7 7 7" /></>,
  arrowRight: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  send: <><path d="M21 3 10 14" /><path d="M21 3 14.5 21l-4.5-7-7-4.5L21 3Z" /></>,
  sparkle: <><path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z" /><path d="M19 15c.2 1.6 1 2.4 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.1 2.3-.9 2.5-2.5Z" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.8M6.6 6.6A16.7 16.7 0 0 0 2 12s3.6 7 10 7a9.5 9.5 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" /></>,
  chart: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 6-7" /></>,
  bolt: <><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" /></>,
  eraser: <><path d="m7 21-4-4L14 6l6 6-9 9H7Z" /><path d="M21 21H11M9 11l6 6" /></>,
  ruler: <><path d="M3 17 17 3l4 4L7 21l-4-4Z" /><path d="m7 13 2 2M10 10l2 2M13 7l2 2" /></>,
  note: <><path d="M5 3h10l4 4v14H5V3Z" /><path d="M9 9h6M9 13h6M9 17h3" /></>,
  wind: <><path d="M3 8h11a3 3 0 1 0-3-3" /><path d="M3 12h16a3 3 0 1 1-3 3" /><path d="M3 16h7" /></>
};

function Icon({ name, size = 20, strokeWidth = 1.75, className = '', title }) {
  const content = PATHS[name];
  if (!content) return null;

  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {content}
    </svg>
  );
}

export default Icon;
