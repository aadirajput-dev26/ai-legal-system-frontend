import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://legaldesk.co.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup'],
        disallow: [
          '/dashboard',
          '/cases',
          '/cases/*',
          '/drafts',
          '/drafts/*',
          '/documents',
          '/documents/*',
          '/calendar',
          '/calendar/*',
          '/settings',
          '/settings/*',
          '/billing',
          '/billing/*',
          '/notifications',
          '/notifications/*',
          '/tools',
          '/tools/*',
          '/api/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
