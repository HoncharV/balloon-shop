import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Об'єднує умовні класи й коректно розв'язує конфлікти утиліт Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
