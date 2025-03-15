import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Getstok Fleet Monitoring System',
    short_name: 'Getstok FMS',
    description: 'By YB',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/pwaicon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwaicon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}