import { NavLink } from 'react-router-dom';
import { Home, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const TopNavBar = () => {
  const navItems = [
    { name: 'Home Feed', icon: Home, path: '/home' },
    { name: 'Profile', icon: User, path: '/profile' },
    { name: 'Admin', icon: Shield, path: '/admin' },
  ];

  return (
    <nav className="tw-fixed tw-top-0 tw-left-0 tw-right-0 tw-bg-card tw-border-b tw-border-border tw-shadow-lg tw-z-50">
      <div className="tw-container tw-mx-auto tw-flex tw-justify-between tw-items-center tw-h-16 tw-px-4">
        <div className="tw-flex tw-items-center">
          <img src="/logo.jpeg" alt="App Logo" className="tw-h-8 tw-w-auto tw-mr-3" />
          <span className="tw-text-lg tw-font-bold tw-text-foreground">WPW Scanner Feed</span>
        </div>
        <div className="tw-flex tw-space-x-6">
          {navItems.map((item) => (
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
        </div>
      </div>
    </nav>
  );
};

export default TopNavBar;