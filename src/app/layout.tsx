import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nijoow LaunchPad',
  description:
    '피아노 패드를 자유롭게 연주하거나, 박자에 맞춰 노트를 눌러 멜로디를 완성하세요.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
