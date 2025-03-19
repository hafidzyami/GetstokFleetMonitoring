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
        src: '/pwa-icon.png', // Gunakan path relatif
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/pwa-icon.png', // Gunakan path relatif
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      // Tambahkan ikon untuk iOS
      {
        src: '/pwa-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/pwa-icon.png',
        sizes: '167x167',
        type: 'image/png', 
        purpose: 'any'
      },
      {
        src: '/pwa-icon.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/pwa-icon.png',
        sizes: '120x120',
        type: 'image/png',
        purpose: 'any'
      }
    ]
  }
}