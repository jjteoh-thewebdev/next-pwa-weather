/**
 * Safe API client for fetching weather data without exposing API keys
 */

import { LocationSuggestion } from "./models/search-autocomplete";
import { WeatherResponse } from "./models/weather";

/**
 * Search for locations by name or coordinates
 */
export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search locations');
    }

    return response.json();
}

/**
 * Get weather forecast for a location
 */
export async function getWeatherForecast(
    query: string,
    days: number = 3
): Promise<WeatherResponse> {
    const response = await fetch(
        `/api/weather?q=${encodeURIComponent(query)}&days=${days}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch weather data');
    }

    return response.json();
} 