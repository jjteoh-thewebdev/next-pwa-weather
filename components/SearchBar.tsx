"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchLocations } from "@/lib/api/api";
import type { LocationSuggestion } from "@/lib/api/models/search-autocomplete";

interface SearchBarProps {
    onLocationSelect: (location: LocationSuggestion) => void;
    isOnline: boolean;
}

export default function SearchBar({ onLocationSelect, isOnline }: SearchBarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [error, setError] = useState("");
    const suggestionRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                suggestionRef.current &&
                !suggestionRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    async function fetchSuggestions(query: string) {
        setLoading(true);
        setError("");

        try {
            const results = await searchLocations(query);
            setSuggestions(results);
            setShowSuggestions(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to search locations");
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }

    // Debounced search
    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setSearchQuery(value);

        // Clear any existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (value.trim().length >= 2) {
            // Set a new timer
            debounceTimerRef.current = setTimeout(() => {
                fetchSuggestions(value);
            }, 300); // 300ms debounce, 300-500ms is a good compromise
            // further reading: https://www.geeksforgeeks.org/debouncing-in-javascript/
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (searchQuery.trim().length > 0) {
            fetchSuggestions(searchQuery);
        }
    }

    function handleSuggestionClick(location: LocationSuggestion) {
        setSearchQuery(location.name);
        setShowSuggestions(false);
        onLocationSelect(location);
    }

    return (
        <div className="relative w-full">
            <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                    placeholder="Search city, postal code, or coordinates..."
                    className="flex-1 ring-offset-background bg-white shadow-sm"
                    disabled={!isOnline}
                />
                <Button type="submit" disabled={!isOnline || loading} className="cursor-pointer">
                    <Search className="mr-2 h-4 w-4" />
                    {loading ? "..." : "Search"}
                </Button>
            </form>

            {error && <p className="text-red-500 mt-1 text-sm">{error}</p>}

            {showSuggestions && suggestions.length > 0 && (
                <div
                    ref={suggestionRef}
                    className="absolute mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 z-10 max-h-60 overflow-y-auto"
                >
                    <ul className="py-1">
                        {suggestions.map((location, index) => (
                            <li
                                key={`${location.name}-${location.lat}-${location.lon}-${index}`}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                                onClick={() => handleSuggestionClick(location)}
                            >
                                <div className="font-medium">{location.name}</div>
                                <div className="text-sm text-gray-500">
                                    {location.region && `${location.region}, `}{location.country}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
} 