import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseISODate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day)
}

