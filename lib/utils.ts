import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


// Utility function to merge class names(use by shadcn/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getAirQualityLevel = (index: number) => {
  if (index <= 1) return "Good";
  if (index <= 2) return "Moderate";
  if (index <= 3) return "Unhealthy for Sensitive Groups";
  if (index <= 4) return "Unhealthy";
  if (index <= 5) return "Very Unhealthy";
  return "Hazardous";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPrimaryPollutant = (airQuality: any) => {
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

export const getAirQualityDescription = (index: number) => {
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

export const getAirQualityColor = (level: string) => {
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