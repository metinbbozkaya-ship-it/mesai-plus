import { isPublicHoliday } from './holidays';

export type DayType = 'weekday' | 'saturday' | 'sunday' | 'holiday';

export const STANDARD_WORKDAY_HOURS = 7.5; // for weekday absence deduction
export const STANDARD_MONTHLY_HOURS = 225; // standard monthly hours

export function getDayType(date: Date): DayType {
  if (!date) return 'weekday';
  const holiday = isPublicHoliday(date);
  if (holiday?.isHoliday) return 'holiday';
  const day = date.getDay?.() ?? 0;
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'weekday';
}

export function getMultiplier(dayType: DayType): number {
  if (dayType === 'sunday' || dayType === 'holiday') return 2.0;
  return 1.5; // weekday + saturday
}

// Multiplier selection options: 25% to 200%
export const MULTIPLIER_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export function getMultiplierPercentage(multiplier: number): number {
  return Math.round(multiplier * 100);
}

export function getDayTypeLabel(dayType: DayType): string {
  switch (dayType) {
    case 'weekday': return 'Hafta İçi';
    case 'saturday': return 'Cumartesi';
    case 'sunday': return 'Pazar';
    case 'holiday': return 'Resmi Tatil';
    default: return '';
  }
}

/**
 * Calculate hourly rate from monthly salary
 * hourlyRate = monthlySalary / STANDARD_MONTHLY_HOURS
 */
export function calculateHourlyRate(monthlySalary: number): number {
  if (monthlySalary <= 0) return 0;
  return monthlySalary / STANDARD_MONTHLY_HOURS;
}

export interface CalculationInput {
  hours: number;
  isAbsence: boolean;
  dayType: DayType;
}

export interface CalculationResult {
  earnings: number; // can be negative for weekday absence deduction
  multiplier: number;
}

export function calculateEarnings(
  input: CalculationInput,
  hourlyRate: number = 1,
  customMultiplier?: number
): CalculationResult {
  const safeInput = input ?? { hours: 0, isAbsence: false, dayType: 'weekday' as DayType };
  const hours = Number(safeInput.hours ?? 0) || 0;
  const dayType = safeInput.dayType ?? 'weekday';
  const isAbsence = !!safeInput.isAbsence;
  
  // Use custom multiplier if provided, otherwise use default
  const multiplier = customMultiplier !== undefined ? customMultiplier : getMultiplier(dayType);

  if (isAbsence) {
    // Weekday absence: deduct for a standard workday (7.5 hours)
    if (dayType === 'weekday') {
      return { earnings: -(STANDARD_WORKDAY_HOURS * hourlyRate), multiplier };
    }
    // Weekend/holiday absence: no earnings but no deduction
    return { earnings: 0, multiplier };
  }

  // Negative hours (late arrival) or positive hours
  const earnings = hours * multiplier * hourlyRate;
  return { earnings, multiplier };
}

export function formatTL(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(amount);
}
