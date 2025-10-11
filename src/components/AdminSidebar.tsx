import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Newspaper, Settings, BellRing, Menu, Phone } from 'lucide-react'; // Added Phone icon
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onTabChange }) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const navItems = [
    { name: 'Posts', icon: Newspaper, tab: 'posts' },
    { name: 'Analytics', icon: LayoutDashboard, tab: 'analytics' },
    { name: 'Settings', icon: Settings, tab: 'settings' },
    { name: 'Notifications', icon: BellRing, tab: 'notifications' },
    { name: 'Contact', icon: Phone, tab: 'contact' }, // New nav item
  ];

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    setIsSheetOpen(false); // Close the sheet on tab change
  };

  const sidebarContent = (
    <div className="tw-flex tw-flex-col tw-h-full tw-p-4">
      <h2 className="tw-text-xl tw-font-bold tw-mb-6 tw-text-sidebar-foreground">Admin Menu</h2>
      <nav className="tw-space-y-2 tw-flex-1">
        {navItems.map((item) => (
          <Button
            key={item.tab}
            variant={activeTab === item.tab ? 'secondary' : 'ghost'}
            onClick={() => handleTabClick(item.tab)}
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
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar (Sheet) */}
      <div className="md:tw-hidden tw-p-4 tw-border-b tw-border-border tw-bg-card">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="tw-text-muted-foreground">
              <Menu className="tw-h-6 tw-w-6" />
              <span className="tw-sr-only">Open admin menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="tw-w-[250px] sm:tw-w-[300px] tw-bg-sidebar tw-border-r tw-border-sidebar-border">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="tw-hidden md:tw-flex tw-w-64 tw-bg-sidebar tw-shadow-lg tw-flex-col tw-border-r tw-border-sidebar-border">
        {sidebarContent}
      </aside>
    </>
  );
};

export default AdminSidebar;