import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function normalizePhoneNumber(number: string | number | undefined | null): string {
  if (number === undefined || number === null) return '';
  let num = number.toString().replace(/[\s\-+]/g, '');
  if (num.startsWith('0')) num = '91' + num.slice(1);
  if (num.length === 10) return '91' + num;
  if (num.length === 12 && num.startsWith('91')) return num;
  if (num.length === 13 && num.startsWith('91')) return num.slice(1); // e.g. '091xxxxxxxxxx'
  if (num.length === 14 && num.startsWith('91')) return num.slice(2); // e.g. '0091xxxxxxxxxx'
  return num;
}
