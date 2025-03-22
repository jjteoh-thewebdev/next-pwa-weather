import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const days = searchParams.get('days') || '3';

    if (!q) {
        return NextResponse.json({ error: 'Location query parameter is required' }, { status: 400 });
    }

    const apiUrl = `${process.env.WEATHER_API_URL}/forecast.json`;
    const apiKey = process.env.WEATHER_API_KEY;

    try {
        const response = await fetch(
            `${apiUrl}?key=${apiKey}&q=${q}&days=${days}&aqi=yes&alerts=yes`,
            { next: { revalidate: 3600 } } // Cache for 1 hour
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Weather API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch weather data' },
            { status: 500 }
        );
    }
} 