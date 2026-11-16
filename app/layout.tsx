import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import { GA4_ATIVO, GA4_ID } from '@/lib/ga4'
import { TarjaDefs } from '@/components/TarjaSvg'
import './tokens.melfiore.css'
import './globals.css'

const brother1816 = localFont({
  src: [
    { path: '../public/fonts/Brother1816-Light.woff2',   weight: '300', style: 'normal' },
    { path: '../public/fonts/Brother1816-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/Brother1816-Bold.woff2',    weight: '700', style: 'normal' },
    { path: '../public/fonts/Brother1816-Black.woff2',   weight: '900', style: 'normal' },
  ],
  variable: '--font-brother',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://melfiore.com'),
  title: 'MELFIORE | o diário secreto',
  description: 'Algo está chegando. Cadastre-se e seja o primeiro a saber.',
  openGraph: {
    title: 'MELFIORE | o diário secreto',
    description: 'Algo está chegando. Cadastre-se e seja o primeiro a saber.',
    type: 'website',
    url: 'https://melfiore.com',
    siteName: 'MELFIORE',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MELFIORE | o diário secreto',
    description: 'Algo está chegando. Cadastre-se e seja o primeiro a saber.',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
  },
  alternates: {
    canonical: 'https://melfiore.com',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={brother1816.variable}>
      <body className="font-brand bg-brand-bg min-h-screen">
        <TarjaDefs />
        {children}
        {GA4_ATIVO && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA4_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
