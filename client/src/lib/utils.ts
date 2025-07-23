import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseISODate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function minutesFromDuration(duration?: string): number | undefined {
  if (!duration) return undefined
  const match = duration.match(/^(\d+)(?::(\d{1,2}))?/) // supports "mm" or "mm:ss"
  if (!match) return undefined
  const minutes = parseInt(match[1], 10)
  if (isNaN(minutes)) return undefined
  if (match[2]) {
    const seconds = parseInt(match[2], 10)
    if (!isNaN(seconds)) {
      return minutes + seconds / 60
    }
  }
  return minutes
}

