import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



export function normalizePhoneNumber(input: string | number | null | undefined): string {
  if (!input) {
    throw new Error("Phone number is empty or undefined");
  }

  // Convert to string and remove all non-digit characters
  const cleaned = String(input).replace(/\D/g, '');

  let tenDigitNumber: string;

  if (cleaned.length === 10) {
    // Already a 10-digit number
    tenDigitNumber = cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    // Starts with 0 and followed by 10 digits
    tenDigitNumber = cleaned.slice(1);
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // Starts with country code 91
    tenDigitNumber = cleaned.slice(2);
  } else if (cleaned.length === 13 && cleaned.startsWith('091')) {
    // Starts with 091
    tenDigitNumber = cleaned.slice(3);
  } else if (cleaned.length >= 10) {
    // Fallback: pick the last 10 digits
    tenDigitNumber = cleaned.slice(-10);
  } else {
    throw new Error(`Invalid phone number format: ${input}`);
  }

  if (tenDigitNumber.length !== 10) {
    throw new Error(`Unable to normalize phone number: ${input}`);
  }

  return `+91${tenDigitNumber}`;
}



