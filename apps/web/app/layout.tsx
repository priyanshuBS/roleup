import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { palette } from '@roleup/ui-tokens';
import { Analytics } from '@/components/Analytics';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

// Self-hosted at build time (no request to Google from visitors' browsers).
const sans = Geist({ subsets: ['latin'], display: 'swap', variable: '--font-geist' });
const mono = Geist_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-geist-mono' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: tech jobs in India and remote`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_IN' },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: palette.light.bg },
    { media: '(prefers-color-scheme: dark)', color: palette.dark.bg },
  ],
  width: 'device-width',
  initialScale: 1,
};

// Applies a saved theme before first paint to avoid a flash.
// Also pins the browser UI colour (theme-color) to the chosen theme, not just the OS setting.
const themeScript = `try{var t=localStorage.getItem('roleup-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;var c=t==='dark'?'${palette.dark.bg}':'${palette.light.bg}';document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('meta[name=theme-color]').forEach(function(m){m.setAttribute('content',c)})})}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main
          id="main"
          className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:px-8"
        >
          {children}
        </main>
        <Footer />
        {/* Suspense: Analytics reads search params, which must not opt static pages out. */}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
