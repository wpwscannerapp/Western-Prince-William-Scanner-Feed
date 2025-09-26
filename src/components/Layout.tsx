import React from 'react';
import { Outlet } from 'react-router-dom';
// TopNavBar is now global, so remove import and usage here

const Layout: React.FC = () => {
  return (
    <main className="tw-flex-grow"> {/* No top padding needed here, it's handled in App.tsx */}
      <Outlet />
    </main>
  );
};

export default Layout;