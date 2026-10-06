import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nijoow LaunchPad',
  description:
    '피아노와 드럼을 연주하고, 4마디 루프를 녹음해 내 기기에 저장하세요.',
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
