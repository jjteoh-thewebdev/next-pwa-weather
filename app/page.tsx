"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Cloud, CloudRain, CloudSnow, Sun, Droplets, Wind, Download, CloudOff, RefreshCw } from "lucide-react"
import { format, addDays, parseISO, differenceInHours, differenceInMinutes } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import SearchBar from "@/components/SearchBar"
import { getWeatherForecast } from "@/lib/api/api"
import type { LocationSuggestion, WeatherResponse } from "@/lib/api/models"

// Default location when app first loads
const DEFAULT_LOCATION = "Kuala Lumpur";

const isBrowser = () => typeof window !== 'undefined';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [useFahrenheit, setUseFahrenheit] = useState(false)

  // Function to ensure we always have 7 days of forecast starting from today
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ensureSevenDayForecast = (forecastDays: any[]) => {
    // If we have 7 days already, return as is
    if (forecastDays.length >= 7) return forecastDays.slice(0, 7);

    // Get the last day from the forecast or use tomorrow if no data
    const today = new Date();
    const tomorrow = addDays(today, 1);

    const lastProvidedDay = forecastDays.length > 0
      ? parseISO(forecastDays[forecastDays.length - 1].date)
      : tomorrow;

    // Create a complete 7-day forecast
    const completeForecast = [...forecastDays];

    // Fill missing days
    while (completeForecast.length < 7) {
      // Add a day to the last date
      const nextDay = addDays(
        lastProvidedDay,
        completeForecast.length + 1 - forecastDays.length
      );

      // Create a placeholder forecast for the missing day
      completeForecast.push({
        date: format(nextDay, 'yyyy-MM-dd'),
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
      forecast: completeForcastDays.map((day) => {
        const date = parseISO(day.date);
        const dayName = format(date, 'EEE');

        return {
          day: dayName,
          temp: day.day.avgtemp_f !== null ? Math.round(day.day.avgtemp_f) : "-",
          tempC: day.day.avgtemp_c !== null ? Math.round(day.day.avgtemp_c) : "-",
          condition: (day.day.condition?.text || "Sunny").toLowerCase(),
        };
      }),
    };
  };

  useEffect(() => {
    // This effect only runs in the browser
    if (!isBrowser()) return;

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
        console.error("Failed to parse saved weather data", e)
      }
    }

    // Check for user's temperature unit preference
    const savedUnit = localStorage.getItem("useFahrenheit")
    if (savedUnit !== null) {
      setUseFahrenheit(savedUnit === "true")
    }

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
        // Save the timestamp when this data was fetched
        localStorage.setItem("weatherDataTimestamp", format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss'));
      } catch (err) {
        console.error("Failed to fetch initial weather:", err);
        setError("Failed to fetch weather data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

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
  }, [isOnline])

  // Handle temperature unit toggle
  const handleTemperatureUnitChange = () => {
    const newValue = !useFahrenheit;
    setUseFahrenheit(newValue);
    if (isBrowser()) {
      localStorage.setItem("useFahrenheit", newValue.toString());
    }
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
      if (isBrowser()) {
        localStorage.setItem("weatherData", JSON.stringify(transformedData));
        // Save the timestamp when this data was fetched
        localStorage.setItem("weatherDataTimestamp", format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss'));
      }
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // to get formatted last update time
  const getLastUpdateTime = () => {
    if (!isBrowser()) return format(new Date(), 'p');

    const timestamp = localStorage.getItem("weatherDataTimestamp");
    if (timestamp) {
      try {
        const lastUpdate = parseISO(timestamp);
        const now = new Date();

        // If it was updated today, just show the time
        if (format(lastUpdate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
          return `Today at ${format(lastUpdate, 'h:mm a')}`;
        }

        // Otherwise show the date and time
        return format(lastUpdate, 'MMM d, yyyy \'at\' h:mm a');
      } catch (e) {
        console.error("Failed to parse timestamp", e);
      }
    }

    // Default fallback
    return format(new Date(), 'p');
  };

  // to determine if data needs refresh
  const getDataAge = () => {
    if (!isBrowser()) return null;

    const timestamp = localStorage.getItem("weatherDataTimestamp");
    if (!timestamp) return null;

    try {
      const lastUpdate = parseISO(timestamp);
      const now = new Date();
      const hoursDiff = differenceInHours(now, lastUpdate);

      // If more than 6 hours old, data may be stale
      if (hoursDiff >= 6) {
        return {
          needsRefresh: true,
          message: `Weather data is ${hoursDiff} hours old`
        };
      }

      // If more than 1 hour old but less than 6, show minutes
      if (hoursDiff >= 1) {
        return {
          needsRefresh: false,
          message: `Updated ${hoursDiff} hours ago`
        };
      }

      // If less than 1 hour, show minutes
      const minutesDiff = differenceInMinutes(now, lastUpdate);
      return {
        needsRefresh: false,
        message: `Updated ${minutesDiff} minutes ago`
      };
    } catch (e) {
      console.error("Failed to calculate data age", e);
      return null;
    }
  };

  // Function to handle manual refresh
  const handleRefresh = async () => {
    if (!isOnline) {
      alert("You're offline. Please connect to the internet to refresh weather data.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the current displayed location or default
      const locationQuery = weather?.location.split(',')[0] || DEFAULT_LOCATION;
      const weatherData = await getWeatherForecast(locationQuery, 7);
      const transformedData = transformWeatherData(weatherData);

      setWeather(transformedData);
      if (isBrowser()) {
        localStorage.setItem("weatherData", JSON.stringify(transformedData));
        localStorage.setItem("weatherDataTimestamp", format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss'));
      }
    } catch (err) {
      console.error("Failed to refresh weather:", err);
      setError("Failed to refresh weather data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOnline && isBrowser() && !localStorage.getItem("weatherData")) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
        <Card className="mx-auto w-full max-w-md border-none shadow-lg">
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg text-center">
            <CardTitle className="flex flex-col items-center justify-center gap-2">
              <CloudOff className="h-12 w-12" />
              <span>You&apos;re Offline</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="mb-6">
              It looks like you&apos;re not connected to the internet and no cached weather data is available.
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

        {isBrowser() && !isInstalled && deferredPrompt && (
          <Button variant="outline" className="mt-4 bg-white" onClick={handleInstallClick}>
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        )}

        {!isOnline && (
          <div className="mt-4 rounded-md bg-amber-100 p-2 text-amber-800">
            You&apos;re currently offline. Showing cached weather data.
          </div>
        )}

        {isOnline && isBrowser() && getDataAge()?.needsRefresh && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-50 text-blue-700 flex items-center gap-1"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className="h-3 w-3" />
              {getDataAge()?.message}
            </Button>
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
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
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
              Last updated: {getLastUpdateTime()}. Powered by <a href="https://www.weatherapi.com/" title="Weather API">WeatherAPI.com</a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

