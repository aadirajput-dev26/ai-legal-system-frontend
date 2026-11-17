import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LegalDesk — AI Legal Practice & Case Management',
    short_name: 'LegalDesk',
    description: 'Intelligent case management, legal drafting, and matter intelligence for advocates and modern law firms.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0f0f',
    theme_color: '#0d0f0f',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
