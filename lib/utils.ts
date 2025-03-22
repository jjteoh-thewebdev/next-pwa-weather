import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


// Utility function to merge class names(use by shadcn/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
