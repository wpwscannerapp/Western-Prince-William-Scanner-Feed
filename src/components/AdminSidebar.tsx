import React from 'react';
// import { NavLink } from 'react-router-dom'; // Removed unused import
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Newspaper, Settings, BellRing } from 'lucide-react'; // Removed Users
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { name: 'Posts', icon: Newspaper, tab: 'posts' },
    { name: 'Analytics', icon: LayoutDashboard, tab: 'analytics' },
    { name: 'Settings', icon: Settings, tab: 'settings' },
    { name: 'Notifications', icon: BellRing, tab: 'notifications' },
    // { name: 'Users', icon: Users, tab: 'users' }, // Placeholder for future 'Manage Users' tab
  ];

  return (
    <aside className="tw-w-full md:tw-w-64 tw-bg-sidebar tw-p-4 tw-shadow-lg tw-flex tw-flex-col tw-border-r tw-border-sidebar-border">
      <h2 className="tw-text-xl tw-font-bold tw-mb-6 tw-text-sidebar-foreground">Admin Menu</h2>
      <nav className="tw-space-y-2 tw-flex-1">
        {navItems.map((item) => (
          <Button
            key={item.tab}
            variant={activeTab === item.tab ? 'secondary' : 'ghost'}
            onClick={() => onTabChange(item.tab)}
            className={cn(
              "tw-w-full tw-justify-start tw-text-sidebar-foreground hover:tw-bg-sidebar-accent hover:tw-text-sidebar-accent-foreground",
              activeTab === item.tab && "tw-bg-sidebar-primary tw-text-sidebar-primary-foreground hover:tw-bg-sidebar-primary/90 hover:tw-text-sidebar-primary-foreground"
            )}
            aria-label={`Go to ${item.name} section`}
          >
            <item.icon className="tw-h-5 tw-w-5 tw-mr-3" />
            {item.name}
          </Button>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;