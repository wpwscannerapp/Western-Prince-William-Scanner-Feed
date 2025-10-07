import React from 'react';
import { Outlet } from 'react-router-dom';
import { MadeWithDyad } from '@/components/made-with-dyad'; // Import MadeWithDyad

const Layout: React.FC = () => {
  return (
    <main className="tw-flex-grow tw-pt-16"> {/* Added tw-pt-16 for TopNavBar height */}
      <Outlet />
      <MadeWithDyad /> {/* Added MadeWithDyad here */}
    </main>
  );
};

export default Layout;