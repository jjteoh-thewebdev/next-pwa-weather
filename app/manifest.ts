import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Weather By JJTeoh',
        short_name: 'Weather',
        description: 'A Weather Progressive Web App built with Next.js',
        start_url: '/',
        display: 'standalone',
        background_color: '#3c83f6',
        theme_color: '#ffffff',
        orientation: 'portrait',
        icons: [
            {
                "src": "/icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "maskable"
            },
            {
                "src": "/icons/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable"
            }
        ],
    }
}