import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavBar from './TopNavBar'; // Import the new TopNavBar

const Layout: React.FC = () => {
  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-background tw-text-foreground">
      <TopNavBar /> {/* Add the TopNavBar here */}
      <main className="tw-flex-grow tw-pt-16"> {/* Add padding for top nav, remove bottom nav padding */}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;