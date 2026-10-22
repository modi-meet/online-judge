// the whole icon set. drawn on a 24 grid, 1.6 stroke, round caps and joins,
// no fill unless it earns it. used only where words alone fall short: the
// brand, search, a solved mark, a verdict, and an empty list.
const PATHS: Record<string, JSX.Element> = {
  code: <><path d="M8.5 7.5L4 12l4.5 4.5" /><path d="M15.5 7.5L20 12l-4.5 4.5" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  'check-circle': <><circle cx="12" cy="12" r="9" /><path d="M7.8 12.4l3 3 5.4-6" /></>,
  'x-circle': <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  alert: <><path d="M12 3.8l9 15.4H3z" /><path d="M12 10v4.2" /><path d="M12 17.2v.1" /></>,
  tray: <><path d="M3.5 13.5l2.6-7a2 2 0 0 1 1.9-1.3h8a2 2 0 0 1 1.9 1.3l2.6 7" /><path d="M3.5 13.5v4a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4h-5.2a3 3 0 0 1-2.8 2h-2a3 3 0 0 1-2.8-2z" /></>,
  flag: <><path d="M6 20.5V4" /><path d="M6 5h11l-2.5 4 2.5 4H6" /></>,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}

/** a quiet empty state: one icon, one sentence, one optional hint */
export function Empty({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={28} />
      <p className="empty-title">{title}</p>
      {hint && <p className="muted small">{hint}</p>}
    </div>
  );
}
