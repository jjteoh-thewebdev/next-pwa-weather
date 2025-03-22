import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q) {
        return NextResponse.json({ error: 'Search query parameter is required' }, { status: 400 });
    }

    const apiUrl = `${process.env.WEATHER_API_URL}/search.json`;
    const apiKey = process.env.WEATHER_API_KEY;

    try {
        const response = await fetch(
            `${apiUrl}?key=${apiKey}&q=${q}`,
            { next: { revalidate: 86400 } } // Cache for 24 hours
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Location API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch location data' },
            { status: 500 }
        );
    }
} 