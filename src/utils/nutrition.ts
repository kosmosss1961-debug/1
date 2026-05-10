import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
): number {
  // Mifflin-St Jeor Equation
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.2));
}

export function calculateCalorieGoal(
  tdee: number,
  goal: 'lose_weight' | 'maintain' | 'gain_weight',
  currentWeight: number
): number {
  const deficits: Record<string, number> = {
    lose_weight: -500,
    maintain: 0,
    gain_weight: 300,
  };
  
  const deficit = deficits[goal] || -500;
  const minCalories = goal === 'lose_weight' ? Math.max(1200, currentWeight * 25) : 1500;
  
  return Math.max(minCalories, Math.round(tdee + deficit));
}

export function calculateProteinGoal(weight: number, goal: string): number {
  const multipliers: Record<string, number> = {
    lose_weight: 2.0,
    maintain: 1.6,
    gain_weight: 1.8,
  };
  return Math.round(weight * (multipliers[goal] || 1.6));
}

export function calculateWaterGoal(weight: number): number {
  return Math.round(weight * 0.033 * 10) / 10;
}

export function calculateUSNavyBodyFat(
  waistCm: number,
  neckCm: number,
  heightCm: number,
  gender: 'male' | 'female',
  hipCm?: number
): number {
  if (gender === 'male') {
    return Math.round((495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450) * 10) / 10;
  } else {
    if (!hipCm) return 0;
    return Math.round((495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) - 450) * 10) / 10;
  }
}

export function formatDate(date: Date | string): string {
  return format(typeof date === 'string' ? parseISO(date) : date, 'dd.MM.yyyy');
}

export function formatDateShort(date: Date | string): string {
  return format(typeof date === 'string' ? parseISO(date) : date, 'dd.MM');
}

export function getDayName(date: Date | string): string {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[typeof date === 'string' ? parseISO(date).getDay() : date.getDay()];
}

export function isToday(date: Date | string): boolean {
  const today = new Date();
  const checkDate = typeof date === 'string' ? parseISO(date) : date;
  return format(today, 'yyyy-MM-dd') === format(checkDate, 'yyyy-MM-dd');
}

export function getStartOfDay(date: Date | string): string {
  return formatStartOfDay(typeof date === 'string' ? parseISO(date) : date);
}

function formatStartOfDay(date: Date): string {
  return format(startOfDay(date), "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

export function getEndOfDay(date: Date | string): string {
  return formatEndOfDay(typeof date === 'string' ? parseISO(date) : date);
}

function formatEndOfDay(date: Date): string {
  return format(endOfDay(date), "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

export function calculateMacros(calories: number, proteinG: number): { carbsG: number; fatG: number } {
  const proteinCalories = proteinG * 4;
  const remainingCalories = calories - proteinCalories;
  
  const fatPercent = 0.3;
  const carbsPercent = 0.55;
  
  const fatCalories = remainingCalories * fatPercent;
  const carbsCalories = remainingCalories * carbsPercent;
  
  return {
    carbsG: Math.round(carbsCalories / 4),
    fatG: Math.round(fatCalories / 9),
  };
}

export function calculateProgress(current: number, target: number, start: number): number {
  const totalChange = start - target;
  const actualChange = start - current;
  
  if (totalChange === 0) return 0;
  return Math.round((actualChange / totalChange) * 100);
}

export function getMealTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    breakfast: 'Завтрак',
    lunch: 'Обед',
    dinner: 'Ужин',
    snack: 'Перекус',
  };
  return labels[type] || type;
}

export function getMealStyleLabel(style: string): string {
  const labels: Record<string, string> = {
    light: '🥗 Лёгкий',
    medium: '🍽 Средний',
    heavy: '🍖 Плотный',
    protein: '💪 Белковый',
    vegetable: '🥬 Овощной',
    free: '✨ Свободный',
  };
  return labels[style] || style;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
