"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Settings, BellRing, Menu, Phone, Siren, AlertTriangle, MessageSquare } from 'lucide-react'; // Re-added MessageSquare icon
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AnalyticsService } from '@/services/AnalyticsService';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onTabChange }) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const navItems = [
    { name: 'Incidents', icon: Siren, tab: 'incidents' },
    { name: 'Alerts', icon: AlertTriangle, tab: 'alerts' },
    { name: 'Feedback', icon: MessageSquare, tab: 'feedback' }, // Re-added Feedback as a top-level tab
    { name: 'Analytics', icon: LayoutDashboard, tab: 'analytics' },
    { name: 'Settings', icon: Settings, tab: 'settings' },
    { name: 'Notifications', icon: BellRing, tab: 'notifications' },
    { name: 'Contact', icon: Phone, tab: 'contact' },
  ];

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    setIsSheetOpen(false);
    AnalyticsService.trackEvent({ name: 'admin_sidebar_tab_clicked', properties: { tabName: tab } });
  };

  const sidebarContent = (
    <div className="tw-flex tw-flex-col tw-h-full tw-p-4">
      <h2 className="tw-text-xl tw-font-bold tw-mb-6 tw-text-sidebar-foreground">Admin Menu</h2>
      <nav className="tw-space-y-2 tw-flex-1" aria-label="Admin navigation">
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
            <item.icon className="tw-h-5 tw-w-5 tw-mr-3" aria-hidden="true" />
            {item.name}
          </Button>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <div className="md:tw-hidden tw-p-4 tw-border-b tw-border-border tw-bg-card">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="tw-text-muted-foreground" aria-label="Open admin menu">
              <Menu className="tw-h-6 tw-w-6" aria-hidden="true" />
              <span className="tw-sr-only">Open admin menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="tw-w-[90vw] sm:tw-max-w-[300px] tw-bg-sidebar tw-border-r tw-border-sidebar-border tw-overflow-y-auto">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      <aside className="tw-hidden md:tw-flex tw-w-64 tw-bg-sidebar tw-shadow-lg tw-flex-col tw-border-r tw-border-sidebar-border">
        {sidebarContent}
      </aside>
    </>
  );
};

export default AdminSidebar;