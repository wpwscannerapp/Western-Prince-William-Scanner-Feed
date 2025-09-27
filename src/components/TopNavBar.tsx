import { NavLink, useLocation } from 'react-router-dom';
import { Home, User, Shield, LogIn, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';

const TopNavBar = () => {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useIsAdmin(); // Destructure isAdmin from the hook
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  // Define navigation items that are always present for logged-in users
  const loggedInNavItems = [
    { name: 'Home Feed', icon: Home, path: '/home' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <nav className="tw-fixed tw-top-0 tw-left-0 tw-right-0 tw-bg-card tw-border-b tw-border-border tw-shadow-lg tw-z-50">
      <div className="tw-container tw-mx-auto tw-flex tw-justify-between tw-items-center tw-h-16 tw-px-4">
        <div className="tw-flex tw-items-center">
          <img src="/logo.png" alt="App Logo" className="tw-h-8 tw-w-auto tw-mr-3 tw-block tw-flex-shrink-0" />
          <span className="tw-text-lg tw-font-bold tw-text-foreground">Western Prince William Scanner Feed</span>
        </div>
        <div className="tw-flex tw-space-x-6 tw-items-center">
          {!loading && user ? ( // If user is logged in
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
              {isAdmin && ( // Admin link only for admins
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
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="tw-text-muted-foreground hover:tw-text-primary">
                <LogOut className="tw-h-5 tw-w-5 tw-mr-1" />
                Logout
              </Button>
            </>
          ) : ( // If user is not logged in and not loading
            !loading && location.pathname !== '/auth' && ( // Only show login if not on auth page
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
            )
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopNavBar;