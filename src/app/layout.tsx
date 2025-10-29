import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/AuthContext'; // Using the provided AuthContext
import { Toaster } from 'sonner'; // For toasts

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Western Prince William Scanner Feed',
  description: 'Join 20,000+ scanner fans for exclusive Prince William County updates!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark"> {/* Default to dark mode as per previous context */}
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}