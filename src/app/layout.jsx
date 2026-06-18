import './globals.css';

export const metadata = {
  title: 'GrowlyZ Dashboard',
  description: 'Client dashboard for GrowlyZ ad management',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
