import React from 'react';
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
    <nav className="fixed top-0 left-0 right-0 bg-card border-b border-border shadow-lg z-50">
      <div className="container mx-auto flex justify-between items-center h-16 px-4">
        <div className="flex items-center">
          <img
            src="/Logo.jpeg?v=1" // Added cache-busting parameter
            alt="WPW Scanner Feed Logo"
            className="h-8 w-8 mr-2 rounded-full"
          />
          <span className="text-lg font-bold text-foreground">WPW Scanner Feed</span>
        </div>
        <div className="flex space-x-6">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
                  isActive && "text-primary"
                )
              }
            >
              <item.icon className="h-5 w-5 mr-1" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default TopNavBar;