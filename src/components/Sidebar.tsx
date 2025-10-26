import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, User, Shield, Archive, Phone, MapPin, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';

interface SidebarProps {
  onLinkClick?: () => void; // Optional callback for mobile menu to close on link click
}

const Sidebar: React.FC<SidebarProps> = ({ onLinkClick }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const location = useLocation();

  const navItems = [
    { name: 'Home', icon: Home, path: '/home', requiresAuth: true },
    { name: 'Incidents Feed', icon: MapPin, path: '/home/incidents', requiresAuth: true },
    { name: 'Incident Archive', icon: Archive, path: '/home/archive', requiresAuth: true },
    { name: 'Report Incident', icon: FileText, path: '/home/report-incident', requiresAuth: true },
    { name: 'Contact Us', icon: Phone, path: '/home/contact-us', requiresAuth: true },
    { name: 'Profile', icon: User, path: '/profile', requiresAuth: true },
    { name: 'Admin Dashboard', icon: Shield, path: '/admin', requiresAuth: true, adminOnly: true },
  ];

  if (authLoading || isAdminLoading) {
    return (
      <aside className="tw-hidden md:tw-flex tw-w-64 tw-bg-sidebar tw-shadow-lg tw-flex-col tw-border-r tw-border-sidebar-border tw-p-4 tw-animate-pulse">
        <div className="tw-h-8 tw-w-3/4 tw-bg-muted tw-rounded tw-mb-6"></div>
        <div className="tw-space-y-2">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="tw-h-10 tw-bg-muted tw-rounded"></div>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="tw-hidden md:tw-flex tw-w-64 tw-bg-sidebar tw-shadow-lg tw-flex-col tw-border-r tw-border-sidebar-border tw-p-4">
      <h2 className="tw-text-xl tw-font-bold tw-mb-6 tw-text-sidebar-foreground">Navigation</h2>
      <nav className="tw-space-y-2 tw-flex-1">
        {navItems.map((item) => {
          // Only render if user is authenticated AND (item doesn't require admin OR user is admin)
          if (user && (!item.adminOnly || isAdmin)) {
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "tw-flex tw-items-center tw-gap-3 tw-px-3 tw-py-2 tw-rounded-md tw-text-sm tw-font-medium tw-text-sidebar-foreground hover:tw-bg-sidebar-accent hover:tw-text-sidebar-accent-foreground",
                    isActive && "tw-bg-sidebar-primary tw-text-sidebar-primary-foreground hover:tw-bg-sidebar-primary/90 hover:tw-text-sidebar-primary-foreground"
                  )
                }
                onClick={onLinkClick}
                aria-label={`Go to ${item.name}`}
              >
                <item.icon className="tw-h-5 tw-w-5" />
                {item.name}
              </NavLink>
            );
          }
          return null;
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;