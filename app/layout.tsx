import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SSH Terminal Emulator',
  description: 'Ubuntu SSH Terminal Emulator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

