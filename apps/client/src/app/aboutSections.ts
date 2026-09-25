import { Building2, TrendingUp, Users, Award, Globe } from "lucide-react";

/** The About page's sections — one list for the page's tabs, the header's About menu, the mobile
 * menu and the footer, so a link always opens the section it names (`/about?tab=<id>`). */
export const ABOUT_SECTIONS = [
  { id: 'overview', label: 'Company Overview', hint: 'Who we are', icon: Building2 },
  { id: 'history', label: 'Our History', hint: 'Journey & milestones', icon: TrendingUp },
  { id: 'team', label: 'Our Team', hint: 'Meet our experts', icon: Users },
  { id: 'awards', label: 'Awards & Recognition', hint: 'Our achievements', icon: Award },
  { id: 'contact', label: 'Contact Us', hint: 'Get in touch', icon: Globe },
] as const;

export type AboutTab = (typeof ABOUT_SECTIONS)[number]['id'];

export const aboutHref = (tab: AboutTab) => (tab === 'overview' ? '/about' : `/about?tab=${tab}`);

export function parseAboutTab(value: string | null): AboutTab {
  return ABOUT_SECTIONS.some((s) => s.id === value) ? (value as AboutTab) : 'overview';
}
