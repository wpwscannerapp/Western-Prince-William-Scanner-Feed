import { NavLink, useLocation } from 'react-router-dom';
import { Home, User, LogIn, LogOut, CreditCard, Shield, Archive, Phone, MapPin, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const TopNavBar = () => {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useIsAdmin(); // Removed 'loading: isAdminLoading'
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  // Define navigation items for the top bar
  const navItems = [
    { name: 'Home', icon: Home, path: '/home', requiresAuth: true },
    { name: 'Incidents', icon: MapPin, path: '/home/incidents', requiresAuth: true },
    { name: 'Archive', icon: Archive, path: '/home/archive', requiresAuth: true },
    { name: 'Report', icon: FileText, path: '/home/report-incident', requiresAuth: true },
    { name: 'Contact', icon: Phone, path: '/home/contact-us', requiresAuth: true },
    { name: 'Profile', icon: User, path: '/profile', requiresAuth: true },
    { name: 'Admin', icon: Shield, path: '/admin', requiresAuth: true, adminOnly: true },
  ];

  return (
    <nav className="tw-fixed tw-top-0 tw-left-0 tw-right-0 tw-bg-card tw-border-b tw-border-border tw-shadow-lg tw-z-50">
      <div className="tw-container tw-mx-auto tw-flex tw-justify-between tw-items-center tw-h-16 tw-px-4">
        <div className="tw-flex tw-items-center">
          <span className="tw-text-sm xs:tw-text-base sm:tw-text-lg tw-font-bold tw-text-foreground tw-whitespace-normal tw-break-words tw-max-w-[calc(100vw-80px)] md:tw-max-w-none">Western Prince William Scanner Feed</span>
        </div>
        <div className="tw-flex tw-space-x-4 tw-items-center"> {/* Desktop navigation */}
          {!loading && user ? (
            <>
              {navItems.map((item) => (
                (item.adminOnly && !isAdmin) ? null : ( // Conditionally render admin link
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "tw-flex tw-items-center tw-text-sm tw-font-medium tw-text-muted-foreground tw-transition-colors hover:tw-text-primary",
                        isActive && "tw-text-primary"
                      )
                    }
                    aria-label={`Go to ${item.name}`}
                  >
                    <item.icon className="tw-h-5 tw-w-5 tw-mr-1" />
                    <span className="tw-hidden sm:tw-inline">{item.name}</span>
                  </NavLink>
                )
              ))}
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="tw-text-muted-foreground hover:tw-text-primary">
                <LogOut className="tw-h-5 tw-w-5 tw-mr-1" />
                <span className="tw-hidden sm:tw-inline">Logout</span>
              </Button>
            </>
          ) : (
            !loading && (
              <>
                {location.pathname !== '/auth' && (
                  <NavLink
                    to="/auth"
                    className={({ isActive }) =>
                      cn(
                        "tw-flex tw-items-center tw-text-sm tw-font-medium tw-text-muted-foreground tw-transition-colors hover:tw-text-primary",
                        isActive && "tw-text-primary"
                      )
                    }
                    aria-label="Login or Sign Up"
                  >
                    <LogIn className="tw-h-5 tw-w-5 tw-mr-1" />
                    <span className="tw-hidden sm:tw-inline">Login / Sign Up</span>
                  </NavLink>
                )}
                {location.pathname !== '/subscribe' && (
                  <NavLink
                    to="/subscribe"
                    className={({ isActive }) =>
                      cn(
                        "tw-flex tw-items-center tw-text-sm tw-font-medium tw-text-muted-foreground tw-transition-colors hover:tw-text-primary",
                        isActive && "tw-text-primary"
                      )
                    }
                    aria-label="Subscribe to premium features"
                  >
                    <CreditCard className="tw-h-5 tw-w-5 tw-mr-1" />
                    <span className="tw-hidden sm:tw-inline">Subscribe</span>
                  </NavLink>
                )}
              </>
            )
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopNavBar;