import { Outlet, NavLink, Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  BarChart3,
  Contact2,
  Filter,
  CheckSquare,
  Building2,
  Tag,
  Key,
  FileText,
  BookMarked,
  FileSignature,
  ShieldCheck,
  Receipt,
  Banknote,
  Percent,
  Megaphone,
  MessageSquare,
  Sparkles,
  Trophy,
  FolderOpen,
  Home,
  Settings,
  Bell,
  LogOut,
} from 'lucide-react';
import logo from 'figma:asset/04fbd52ef60da91b44edcb17b864e7abb90acda5.png';
import { useAuth } from '../../store/auth';
import { canOpen } from '../../store/permissions';
import { can } from '@era/contracts';
import { useInboxSummary } from '../../data/inbox';
import { NoAccess } from '../guards';

// Falls back to the CURRENT host (not a hardcoded "localhost") so the link
// still works when this page is opened from another device on the LAN.
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || `http://${window.location.hostname}:5173`;

const NAV: { section: string; items: { to: string; icon: typeof Home; label: string }[] }[] = [
  {
    section: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    section: 'CRM',
    items: [
      { to: '/inbox', icon: MessageSquare, label: 'Inbox' },
      { to: '/contacts', icon: Contact2, label: 'Contacts' },
      { to: '/leads', icon: Filter, label: 'Pipeline' },
      { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    ],
  },
  {
    section: 'Inventory',
    items: [
      { to: '/inventory/projects', icon: Building2, label: 'Projects' },
      { to: '/inventory/sales', icon: Tag, label: 'Sales' },
      { to: '/inventory/rent', icon: Key, label: 'Rent' },
    ],
  },
  {
    section: 'Sales',
    items: [
      { to: '/quotations', icon: FileText, label: 'Quotations' },
      { to: '/reservations', icon: BookMarked, label: 'Reservations' },
      { to: '/contracts', icon: FileSignature, label: 'Contracts' },
      { to: '/approvals', icon: ShieldCheck, label: 'Approvals' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { to: '/invoices', icon: Receipt, label: 'Invoices & AR' },
      { to: '/payments', icon: Banknote, label: 'Payments' },
      { to: '/commissions', icon: Percent, label: 'Commissions' },
    ],
  },
  {
    section: 'Growth',
    items: [
      { to: '/campaigns', icon: Megaphone, label: 'Marketing' },
      { to: '/ai-knowledge', icon: Sparkles, label: 'AI Knowledge' },
      { to: '/agents', icon: Trophy, label: 'Agents' },
    ],
  },
  {
    section: 'Admin',
    items: [
      { to: '/documents', icon: FolderOpen, label: 'Documents' },
      { to: '/about', icon: FileText, label: 'Manage About' },
      { to: '/users', icon: ShieldCheck, label: 'Users & Roles' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const capabilities = user?.capabilities;

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => canOpen(capabilities, i.to)),
  })).filter((g) => g.items.length > 0);

  const allowed = canOpen(capabilities, location.pathname);
  // Chats waiting on a person (AI asked for one, or a customer wrote to a staff-handled chat).
  const inboxBadge = useInboxSummary(can(capabilities, 'crm:read')).data?.attention ?? 0;
  const initials =
    user?.name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2) ?? 'AD';

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <aside className="fixed h-full w-64 text-white shadow-2xl" style={{ backgroundColor: '#001F5B' }}>
        <div className="flex h-full flex-col">
          <div className="border-b px-5 py-3" style={{ borderColor: 'rgba(239,45,44,0.2)' }}>
            <Link to="/" className="block">
              <img src={logo} alt="ERA Cambodia" className="mx-auto h-12 w-auto" />
            </Link>
          </div>

          <nav
            className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3
              [mask-image:linear-gradient(to_bottom,transparent,black_10px,black_calc(100%-10px),transparent)]
              [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]
              [&::-webkit-scrollbar]:w-1.5
              [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15
              hover:[&::-webkit-scrollbar-thumb]:bg-white/25
              [&::-webkit-scrollbar-track]:bg-transparent"
          >
            {groups.map((group) => (
              <div key={group.section}>
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {group.section}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-[#EF2D2C] font-semibold text-white'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.label}</span>
                      {item.to === '/inbox' && inboxBadge > 0 && (
                        <span className="ml-auto rounded-full bg-[#EF2D2C] px-2 py-0.5 text-[11px] font-bold text-white ring-1 ring-white/40">
                          {inboxBadge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="border-t p-3" style={{ borderColor: 'rgba(239,45,44,0.2)' }}>
            <a
              href={CLIENT_URL}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <Home className="h-4 w-4" />
              <span>Customer Website</span>
            </a>
          </div>
        </div>
      </aside>

      <div className="ml-64 flex flex-1 flex-col">
        <header className="sticky top-0 z-40 bg-white shadow-sm" style={{ borderBottom: '3px solid #EF2D2C' }}>
          <div className="flex items-center justify-between px-8 py-3">
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#001F5B' }}>
                ERA Cambodia — Back Office
              </h2>
              <p className="text-xs" style={{ color: '#8B0A1C' }}>
                Live data
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative rounded-lg p-2" style={{ backgroundColor: '#F8F9FA' }}>
                <Bell className="h-5 w-5" style={{ color: '#001F5B' }} />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full" style={{ backgroundColor: '#EF2D2C' }} />
              </button>
              <div className="flex items-center gap-3 rounded-lg px-3 py-1.5" style={{ backgroundColor: '#F8F9FA' }}>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: '#001F5B' }}
                >
                  {initials}
                </div>
                <div className="text-left text-xs">
                  <div className="font-semibold" style={{ color: '#001F5B' }}>
                    {user?.name ?? 'Not signed in'}
                  </div>
                  <div style={{ color: '#8B0A1C' }}>{user?.role.name ?? ''}</div>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-[var(--era-red)]"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">{allowed ? <Outlet /> : <NoAccess />}</main>
      </div>
    </div>
  );
}
