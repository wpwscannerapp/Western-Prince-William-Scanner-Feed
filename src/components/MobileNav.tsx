import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Home, User, Shield, LogIn, LogOut, CreditCard, Archive, Phone, MapPin, FileText } from 'lucide-react'; // Added new icons
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';

interface MobileNavProps {
  onLinkClick?: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ onLinkClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    onLinkClick?.();
  };

  // Define navigation items consistent with the new Sidebar
  const navItems = [
    { name: 'Home', icon: Home, path: '/home', requiresAuth: true },
    { name: 'Incidents Feed', icon: MapPin, path: '/home/incidents', requiresAuth: true },
    { name: 'Incident Archive', icon: Archive, path: '/home/archive', requiresAuth: true },
    { name: 'Report Incident', icon: FileText, path: '/home/report-incident', requiresAuth: true },
    { name: 'Contact Us', icon: Phone, path: '/home/contact-us', requiresAuth: true },
    { name: 'Profile', icon: User, path: '/profile', requiresAuth: true },
    { name: 'Admin Dashboard', icon: Shield, path: '/admin', requiresAuth: true, adminOnly: true },
    { name: 'Subscribe', icon: CreditCard, path: '/subscribe', requiresAuth: false, showWhenLoggedOut: true },
    { name: 'Login / Sign Up', icon: LogIn, path: '/auth', requiresAuth: false, showWhenLoggedOut: true },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="tw-md:tw-hidden tw-text-muted-foreground hover:tw-text-primary"
          aria-label="Open navigation menu"
        >
          <Menu className="tw-h-6 tw-w-6" />
          <span className="tw-sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="tw-w-[250px] sm:tw-w-[300px] tw-bg-sidebar tw-border-r tw-border-sidebar-border tw-flex tw-flex-col">
        <SheetHeader>
          <SheetTitle className="tw-sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="tw-sr-only">Access application navigation links.</SheetDescription>
        </SheetHeader>
        <div className="tw-px-4 tw-py-6 tw-border-b tw-border-sidebar-border">
          <h2 className="tw-text-xl tw-font-bold tw-text-sidebar-foreground">Navigation</h2>
        </div>
        <nav className="tw-flex-1 tw-flex tw-flex-col tw-gap-2 tw-p-4">
          {!loading && user ? (
            <>
              {navItems.filter(item => item.requiresAuth).map((item) => (
                (item.adminOnly && !isAdmin) ? null : (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "tw-flex tw-items-center tw-gap-3 tw-px-3 tw-py-2 tw-rounded-md tw-text-sm tw-font-medium tw-text-sidebar-foreground hover:tw-bg-sidebar-accent hover:tw-text-sidebar-accent-foreground",
                        isActive && "tw-bg-sidebar-primary tw-text-sidebar-primary-foreground hover:tw-bg-sidebar-primary/90 hover:tw-text-sidebar-primary-foreground"
                      )
                    }
                    onClick={() => { setIsOpen(false); onLinkClick?.(); }}
                  >
                    <item.icon className="tw-h-5 tw-w-5" />
                    {item.name}
                  </NavLink>
                )
              ))}
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="tw-w-full tw-justify-start tw-gap-3 tw-px-3 tw-py-2 tw-rounded-md tw-text-sm tw-font-medium tw-text-sidebar-foreground hover:tw-bg-sidebar-accent hover:tw-text-sidebar-accent-foreground"
              >
                <LogOut className="tw-h-5 tw-w-5" />
                Logout
              </Button>
            </>
          ) : (
            !loading && (
              <>
                {navItems.filter(item => item.showWhenLoggedOut && location.pathname !== item.path).map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "tw-flex tw-items-center tw-gap-3 tw-px-3 tw-py-2 tw-rounded-md tw-text-sm tw-font-medium tw-text-sidebar-foreground hover:tw-bg-sidebar-accent hover:tw-text-sidebar-accent-foreground",
                        isActive && "tw-bg-sidebar-primary tw-text-sidebar-primary-foreground hover:tw-bg-sidebar-primary/90 hover:tw-text-sidebar-primary-foreground"
                      )
                    }
                    onClick={() => { setIsOpen(false); onLinkClick?.(); }}
                  >
                    <item.icon className="tw-h-5 tw-w-5" />
                    {item.name}
                  </NavLink>
                ))}
              </>
            )
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;