import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Bencho / Apple-inspired tuned spring curves
export const SPRING_PILL = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 38,
  mass: 0.85,
};

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 460,
  damping: 34,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 30,
};
