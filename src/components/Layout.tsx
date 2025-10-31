"use client";

import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom'; // Import useNavigate
import ThemeToggle from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { LogOut, Home } from 'lucide-react'; // Import Home icon
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const Layout: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { user, signOut } = useAuth();
  const navigate = useNavigate(); // Initialize useNavigate

  const handleLogout = async () => {
    toast.loading('Logging out...', { id: 'logout' });
    const { success, error } = await signOut();
    if (success) {
      toast.success('Logged out successfully!', { id: 'logout' });
    } else {
      toast.error(`Logout failed: ${error?.message || 'An unexpected error occurred.'}`, { id: 'logout' });
    }
  };

  return (
    <div className="tw-flex tw-flex-col tw-min-h-screen">
      <header className="tw-w-full tw-p-4 tw-flex tw-justify-end tw-items-center tw-gap-2 tw-bg-card tw-border-b tw-border-border tw-shadow-sm">
        <ThemeToggle />
        {user && ( // Only show logout and back to dashboard if user is logged in
          <>
            <Button onClick={() => navigate('/home')} variant="outline" className="tw-button" aria-label="Back to Dashboard">
              <Home className="tw-mr-2 tw-h-4 tw-w-4" /> Dashboard
            </Button>
            <Button onClick={handleLogout} variant="outline" className="tw-button" aria-label="Logout">
              <LogOut className="tw-mr-2 tw-h-4 tw-w-4" /> Logout
            </Button>
          </>
        )}
      </header>
      <main className="tw-flex-grow tw-flex tw-flex-col">
        <Outlet />
        <footer className="tw-w-full tw-py-4 tw-text-center tw-text-xs tw-text-muted-foreground tw-mt-8">
          © {currentYear} Western Prince William Scanner Feed. All rights reserved.
        </footer>
      </main>
    </div>
  );
};

export default Layout;