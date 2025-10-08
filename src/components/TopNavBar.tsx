import { NavLink, useLocation } from 'react-router-dom';
import { Home, User, Shield, LogIn, LogOut, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';
import NotificationBell from './NotificationBell';
import MobileNav from './MobileNav'; // Import MobileNav

const TopNavBar = () => {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  // Define navigation items that are always present for logged-in users
  const loggedInNavItems = [
    { name: 'Home Page', icon: Home, path: '/home' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <nav className="tw-fixed tw-top-0 tw-left-0 tw-right-0 tw-bg-card tw-border-b tw-border-border tw-shadow-lg tw-z-50">
      <div className="tw-container tw-mx-auto tw-flex tw-justify-between tw-items-center tw-h-16 tw-px-4">
        <div className="tw-flex tw-items-center">
          <MobileNav /> {/* Mobile navigation trigger */}
          {/* Adjusted text size for xs screens and max-width calculation */}
          <span className="tw-text-sm xs:tw-text-base sm:tw-text-lg tw-font-bold tw-text-foreground tw-ml-2 md:tw-ml-0 tw-whitespace-normal tw-break-words tw-max-w-[calc(100vw-80px)] md:tw-max-w-none">Western Prince William Scanner Feed</span>
        </div>
        <div className="tw-hidden md:tw-flex tw-space-x-4 tw-items-center"> {/* Desktop navigation */}
          {!loading && user ? (
            <>
              {loggedInNavItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "tw-flex tw-items-center tw-text-sm tw-font-medium tw-text-muted-foreground tw-transition-colors hover:tw-text-primary",
                      isActive && "tw-text-primary"
                    )
                  }
                >
                  <item.icon className="tw-h-5 tw-w-5 tw-mr-1" />
                  {item.name}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn(
                        "tw-flex tw-items-center tw-text-sm tw-font-medium tw-text-muted-foreground tw-transition-colors hover:tw-text-primary",
                        isActive && "tw-text-primary"
                    )
                  }
                >
                  <Shield className="tw-h-5 tw-w-5 tw-mr-1" />
                  Admin
                </NavLink>
              )}
              <NotificationBell aria-label="Toggle notifications" />
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="tw-text-muted-foreground hover:tw-text-primary">
                <LogOut className="tw-h-5 tw-w-5 tw-mr-1" />
                Logout
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
                  >
                    <LogIn className="tw-h-5 tw-w-5 tw-mr-1" />
                    Login
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
                  >
                    <CreditCard className="tw-h-5 tw-w-5 tw-mr-1" />
                    Subscribe
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