import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavBar from './TopNavBar'; // Import the new TopNavBar

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopNavBar /> {/* Add the TopNavBar here */}
      <main className="flex-grow pt-16"> {/* Add padding for top nav, remove bottom nav padding */}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;