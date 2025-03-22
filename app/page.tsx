"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Cloud, CloudRain, CloudSnow, Sun, Droplets, Wind, Download, CloudOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import SearchBar from "@/components/SearchBar"
import { getWeatherForecast } from "@/lib/api/api"
import type { LocationSuggestion, WeatherResponse } from "@/lib/api/models"

// Default location when app first loads
const DEFAULT_LOCATION = "Kuala Lumpur";


// Define types for our transformed weather data
interface ForecastDay {
  day: string;
  temp: number | string;
  tempC: number | string;
  condition: string;
}

interface WeatherState {
  location: string;
  temperature: number;
  temperatureC: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  airQuality: {
    index: number;
    level: string;
    primaryPollutant: string;
    description: string;
  };
  forecast: ForecastDay[];
}

const placeholderWeather: WeatherState = {
  location: "New York, US",
  temperature: 72,
  temperatureC: 22,
  condition: "Sunny",
  humidity: 45,
  windSpeed: 8,
  airQuality: {
    index: 42,
    level: "Good",
    primaryPollutant: "PM2.5",
    description: "Air quality is satisfactory, and air pollution poses little or no risk.",
  },
  forecast: [
    { day: "Mon", temp: 72, tempC: 22, condition: "sunny" },
    { day: "Tue", temp: 68, tempC: 20, condition: "cloudy" },
    { day: "Wed", temp: 75, tempC: 24, condition: "sunny" },
    { day: "Thu", temp: 65, tempC: 18, condition: "rainy" },
    { day: "Fri", temp: 62, tempC: 17, condition: "rainy" },
    { day: "Sat", temp: 68, tempC: 20, condition: "cloudy" },
    { day: "Sun", temp: 70, tempC: 21, condition: "sunny" },
  ],
}

export default function WeatherApp() {
  const [weather, setWeather] = useState<WeatherState>(placeholderWeather)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [useFahrenheit, setUseFahrenheit] = useState(false)

  // Function to ensure we always have 7 days of forecast starting from tomorrow
  const ensureSevenDayForecast = (forecastDays: any[]) => {
    // Skip today (index 0) and start from tomorrow
    const startFromTomorrow = forecastDays.length > 1 ? forecastDays.slice(1) : [];

    // If we have 7 days already after removing today, return as is
    if (startFromTomorrow.length >= 7) return startFromTomorrow.slice(0, 7);

    // Get the last day from the forecast or use tomorrow if no data
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const lastProvidedDay = startFromTomorrow.length > 0
      ? new Date(startFromTomorrow[startFromTomorrow.length - 1].date)
      : tomorrow;

    // Create a complete 7-day forecast
    const completeForecast = [...startFromTomorrow];

    // Fill missing days
    while (completeForecast.length < 7) {
      // Add a day to the last date
      const nextDay = new Date(lastProvidedDay);
      nextDay.setDate(nextDay.getDate() + completeForecast.length + 1 - startFromTomorrow.length);

      // Create a placeholder forecast for the missing day
      completeForecast.push({
        date: nextDay.toISOString().split('T')[0],
        day: {
          avgtemp_f: null,
          avgtemp_c: null,
          condition: {
            text: "Sunny", // Default condition
            icon: "//cdn.weatherapi.com/weather/64x64/day/113.png", // Default sunny icon
            code: 1000 // Code for sunny
          }
        }
      });
    }

    return completeForecast;
  };

  // Function to transform API data to our app's format
  const transformWeatherData = (weatherData: WeatherResponse): WeatherState => {
    // Ensure we have 7 days of forecast data
    const completeForcastDays = ensureSevenDayForecast(weatherData.forecast.forecastday);

    return {
      location: `${weatherData.location.name}, ${weatherData.location.country}`,
      temperature: Math.round(weatherData.current.temp_f),
      temperatureC: Math.round(weatherData.current.temp_c),
      condition: weatherData.current.condition.text,
      humidity: weatherData.current.humidity,
      windSpeed: Math.round(weatherData.current.wind_kph * 0.621371), // Convert km/h to mph
      airQuality: {
        index: weatherData.current.air_quality?.["us-epa-index"] || 1,
        level: getAirQualityLevel(weatherData.current.air_quality?.["us-epa-index"] || 1),
        primaryPollutant: getPrimaryPollutant(weatherData.current.air_quality),
        description: getAirQualityDescription(weatherData.current.air_quality?.["us-epa-index"] || 1),
      },
      forecast: completeForcastDays.map((day, index) => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        return {
          day: dayName,
          temp: day.day.avgtemp_f !== null ? Math.round(day.day.avgtemp_f) : "-",
          tempC: day.day.avgtemp_c !== null ? Math.round(day.day.avgtemp_c) : "-",
          condition: (day.day.condition?.text || "Sunny").toLowerCase(),
        };
      }),
    };
  };

  // Load initial weather data
  const fetchInitialWeather = async () => {
    if (!isOnline) return;

    setIsLoading(true);
    setError(null);

    try {
      const weatherData = await getWeatherForecast(DEFAULT_LOCATION, 7);
      const transformedData = transformWeatherData(weatherData);

      setWeather(transformedData);
      // Save to localStorage for offline use
      localStorage.setItem("weatherData", JSON.stringify(transformedData));
    } catch (err) {
      console.error("Failed to fetch initial weather:", err);
      setError("Failed to fetch weather data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if online
    setIsOnline(navigator.onLine)
    window.addEventListener("online", () => setIsOnline(true))
    window.addEventListener("offline", () => setIsOnline(false))

    // Try to load from localStorage first for immediate display
    const savedWeather = localStorage.getItem("weatherData")
    if (savedWeather) {
      try {
        setWeather(JSON.parse(savedWeather))
      } catch (e) {
        console.error("Failed to parse saved weather data")
      }
    }

    // Check for user's temperature unit preference
    const savedUnit = localStorage.getItem("useFahrenheit")
    if (savedUnit !== null) {
      setUseFahrenheit(savedUnit === "true")
    }

    // Then fetch fresh data from API
    fetchInitialWeather();

    // Check if app is installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
    }

    // Handle install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
    })

    return () => {
      window.removeEventListener("online", () => setIsOnline(true))
      window.removeEventListener("offline", () => setIsOnline(false))
      window.removeEventListener("beforeinstallprompt", () => { })
    }
  }, [])

  // Handle temperature unit toggle
  const handleTemperatureUnitChange = () => {
    const newValue = !useFahrenheit;
    setUseFahrenheit(newValue);
    localStorage.setItem("useFahrenheit", newValue.toString());
  };

  const handleLocationSelect = async (location: LocationSuggestion) => {
    if (!isOnline) {
      alert("You're offline. Please connect to the internet to get updated weather information.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use lat,lon for more accurate results
      const coordinates = `${location.lat},${location.lon}`;
      const weatherData = await getWeatherForecast(coordinates, 7);
      const transformedData = transformWeatherData(weatherData);

      setWeather(transformedData);
      // Save to localStorage for offline use
      localStorage.setItem("weatherData", JSON.stringify(transformedData));
    } catch (err) {
      console.error("Failed to fetch weather:", err);
      setError("Failed to fetch weather data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("This app is either already installed or can't be installed on your device.");
      return
    }

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    // We no longer need the prompt. Clear it up
    setDeferredPrompt(null)

    if (outcome === "accepted") {
      setIsInstalled(true)
      alert("The Weather App has been installed on your device.")
    } else {
      alert("Installation cancelled. You can install the app later from the menu if you change your mind.")
    }
  }

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "sunny":
      case "clear":
        return <Sun className="h-10 w-10 text-yellow-500" />
      case "cloudy":
      case "partly cloudy":
      case "overcast":
        return <Cloud className="h-10 w-10 text-gray-500" />
      case "rainy":
      case "patchy rain":
      case "moderate rain":
      case "heavy rain":
      case "light rain":
      case "drizzle":
        return <CloudRain className="h-10 w-10 text-blue-500" />
      case "snowy":
      case "snow":
      case "patchy snow":
      case "light snow":
      case "heavy snow":
        return <CloudSnow className="h-10 w-10 text-blue-200" />
      default:
        return <Sun className="h-10 w-10 text-yellow-500" />
    }
  }

  const getAirQualityLevel = (index: number) => {
    if (index <= 1) return "Good";
    if (index <= 2) return "Moderate";
    if (index <= 3) return "Unhealthy for Sensitive Groups";
    if (index <= 4) return "Unhealthy";
    if (index <= 5) return "Very Unhealthy";
    return "Hazardous";
  }

  const getPrimaryPollutant = (airQuality: any) => {
    if (!airQuality) return "Unknown";

    const pollutants = {
      "pm2_5": "PM2.5",
      "pm10": "PM10",
      "o3": "O3",
      "no2": "NO2",
      "so2": "SO2",
      "co": "CO"
    };

    let highestValue = -1;
    let highestPollutant = "Unknown";

    for (const [key, value] of Object.entries(pollutants)) {
      if (airQuality[key] && airQuality[key] > highestValue) {
        highestValue = airQuality[key];
        highestPollutant = value;
      }
    }

    return highestPollutant;
  }

  const getAirQualityDescription = (index: number) => {
    switch (index) {
      case 1:
        return "Air quality is satisfactory, and air pollution poses little or no risk.";
      case 2:
        return "Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.";
      case 3:
        return "Members of sensitive groups may experience health effects. The general public is less likely to be affected.";
      case 4:
        return "Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.";
      case 5:
        return "Health alert: The risk of health effects is increased for everyone.";
      case 6:
        return "Health warning of emergency conditions: everyone is more likely to be affected.";
      default:
        return "Air quality information not available.";
    }
  }

  const getAirQualityColor = (level: string) => {
    switch (level) {
      case "Good":
        return "bg-green-500"
      case "Moderate":
        return "bg-yellow-500"
      case "Unhealthy for Sensitive Groups":
        return "bg-orange-500"
      case "Unhealthy":
        return "bg-red-500"
      case "Very Unhealthy":
        return "bg-purple-500"
      case "Hazardous":
        return "bg-rose-900"
      default:
        return "bg-green-500"
    }
  }

  if (!isOnline && !localStorage.getItem("weatherData")) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
        <Card className="mx-auto w-full max-w-md border-none shadow-lg">
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg text-center">
            <CardTitle className="flex flex-col items-center justify-center gap-2">
              <CloudOff className="h-12 w-12" />
              <span>You're Offline</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="mb-6">
              It looks like you're not connected to the internet and no cached weather data is available.
            </p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-blue-100 p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary md:text-4xl">Weather <span className="text-muted-foreground text-xs">by JJTeoh</span></h1>
        <p className="mt-2 text-muted-foreground">Check the weather anywhere in the world</p>

        {!isInstalled && deferredPrompt && (
          <Button variant="outline" className="mt-4 bg-white" onClick={handleInstallClick}>
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        )}

        {!isOnline && (
          <div className="mt-4 rounded-md bg-amber-100 p-2 text-amber-800">
            You're currently offline. Showing cached weather data.
          </div>
        )}
      </header>

      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8">
          <SearchBar onLocationSelect={handleLocationSelect} isOnline={isOnline} />
          {error && <p className="mt-2 text-red-500">{error}</p>}
          {isLoading && <p className="mt-2 text-blue-500">Loading weather data...</p>}
        </div>

        {/* Temperature Unit Switch */}
        <div className="flex items-center justify-end space-x-2 mb-4">
          <Label htmlFor="temperature-unit" className={!useFahrenheit ? "font-bold" : ""}>°C</Label>
          <Switch
            id="temperature-unit"
            checked={useFahrenheit}
            onCheckedChange={handleTemperatureUnitChange}
          />
          <Label htmlFor="temperature-unit" className={useFahrenheit ? "font-bold" : ""}>°F</Label>
        </div>

        {/* Current Weather Card */}
        <Card className="mb-6 border-none shadow-lg py-0">
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg py-4">
            <CardTitle className="flex items-center justify-between text-2xl">
              <span>{weather.location}</span>
              {getWeatherIcon(weather.condition)}
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:justify-between">
              <div className="flex flex-col items-center">
                <span className="text-5xl font-bold">
                  {useFahrenheit ? `${weather.temperature}°F` : `${weather.temperatureC}°C`}
                </span>
                <span className="mt-1 text-xl text-muted-foreground">{weather.condition}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 md:gap-8">
                <div className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Humidity</p>
                    <p className="font-medium">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Wind</p>
                    <p className="font-medium">{weather.windSpeed} mph</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Air Quality Card */}
        <Card className="mb-6 border-none shadow-lg py-0">
          <CardHeader className="bg-primary/80 text-primary-foreground rounded-t-lg py-4">
            <CardTitle className="flex items-center justify-between text-2xl">
              <span>Air Quality</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 md:h-12 md:h-12 lg:h-16 lg:w-16 items-center justify-center rounded-full ${getAirQualityColor(weather.airQuality.level)} text-white`}
                >
                  <span className="text-xl font-bold">{weather.airQuality.index}</span>
                </div>
                <div>
                  <h3 className="xs:text-xl md:text-sm lg:text-xl font-semibold">{weather.airQuality.level}</h3>
                  <p className="text-sm text-muted-foreground">
                    Primary pollutant: {weather.airQuality.primaryPollutant}
                  </p>
                </div>
              </div>
              <div className="max-w-md">
                <p className="text-sm">{weather.airQuality.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forecast Card */}
        <Card className="border-none shadow-lg py-0">
          <CardHeader className="bg-primary/90 text-primary-foreground rounded-t-lg py-4">
            <CardTitle className="text-2xl">7-Day Forecast</CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-7">
              {weather.forecast.map((day, index) => (
                <div key={index} className="flex flex-col items-center rounded-lg bg-card p-3 shadow">
                  <span className="font-medium">{day.day}</span>
                  {getWeatherIcon(day.condition)}
                  <span className="mt-2 text-lg font-bold">
                    {useFahrenheit
                      ? (typeof day.temp === "string" ? "-" : `${day.temp}°F`)
                      : (typeof day.tempC === "string" ? "-" : `${day.tempC}°C`)
                    }
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground py-6">
            <p>
              Last updated: {new Date().toLocaleTimeString()}. Powered by <a href="https://www.weatherapi.com/" title="Weather API">WeatherAPI.com</a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

