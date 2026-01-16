import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SignMate - Real-time AI Sign Language Interpreter',
  description: 'Real-time AI sign language interpreter for live events. Providing instant ASL translation with expressive 3D avatar animation.',
  keywords: ['sign language', 'ASL', 'accessibility', 'live events', 'interpreter', 'AI'],
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
