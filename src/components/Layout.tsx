import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <main className="tw-flex-grow tw-pt-16 tw-flex tw-flex-col">
      <Outlet />
      <footer className="tw-w-full tw-py-4 tw-text-center tw-text-xs tw-text-muted-foreground tw-mt-8">
        © {currentYear} Western Prince William Scanner Feed. All rights reserved.
      </footer>
    </main>
  );
};

export default Layout;