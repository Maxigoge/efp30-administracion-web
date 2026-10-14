import type { ReactNode, SVGProps } from "react";
export type IconName = "grid" | "news" | "courses" | "calendar" | "school" | "users" | "media" | "search" | "bell" | "chevron" | "arrow" | "lock" | "shield" | "clock" | "file" | "plus" | "menu" | "close" | "logout";
const paths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.4" /><rect x="14" y="3" width="7" height="7" rx="1.4" /><rect x="14" y="14" width="7" height="7" rx="1.4" /><rect x="3" y="14" width="7" height="7" rx="1.4" /></>,
  news: <><path d="M5 4.5h14a2 2 0 0 1 2 2V19a1.5 1.5 0 0 1-1.5 1.5H5A2.5 2.5 0 0 1 2.5 18V7A2.5 2.5 0 0 1 5 4.5Z" /><path d="M7 9h10M7 13h10M7 17h6" /></>,
  courses: <><path d="m3 8 9-4 9 4-9 4-9-4Z" /><path d="M6 10v5.5c0 1.4 2.7 3 6 3s6-1.6 6-3V10M21 8v6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" /></>,
  school: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M21 9v6" /></>,
  users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" /><circle cx="9.5" cy="7.5" r="3.5" /><path d="M17 11a3.5 3.5 0 1 0-1-6.9M21 20v-1.5a4 4 0 0 0-3-3.9" /></>,
  media: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" /><path d="M13 3v7h7M8 15h8M8 18h6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
};
export function Icon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name]}</svg>;
}
