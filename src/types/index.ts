export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  goal: 'lose_weight' | 'maintain' | 'gain_weight' | null;
  dietary_restrictions: string[];
  allergies: string[];
  disliked_foods: string[];
  preferred_foods: string[];
  doctor_recommendations: string | null;
  water_goal_liters: number;
  steps_goal: number;
  created_at: string;
  updated_at: string;
}

export interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  manufacturer: string | null;
  barcode: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  serving_size_g: number;
  ingredients: string | null;
  category: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealEntry {
  id: string;
  user_id: string;
  food_item_id: string | null;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  meal_style: 'light' | 'medium' | 'heavy' | 'protein' | 'vegetable' | 'free';
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
  photo_url: string | null;
  consumed_at: string;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  body_fat_percent: number | null;
  measured_at: string;
  notes: string | null;
  created_at: string;
}

export interface DailySummary {
  user_id: string;
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_water_liters: number;
  total_steps: number;
  calorie_goal: number;
  protein_goal_g: number;
  created_at: string;
  updated_at: string;
}

export interface WeightPrediction {
  user_id: string;
  predicted_date: string;
  predicted_weight_kg: number;
  confidence_score: number;
  plateau_probability: number;
  dropout_probability: number;
  model_version: string;
  created_at: string;
}

export interface GeminiApiKey {
  key: string;
  is_active: boolean;
  last_used_at: string | null;
  error_count: number;
  created_at: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealStyle = 'light' | 'medium' | 'heavy' | 'protein' | 'vegetable' | 'free';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose_weight' | 'maintain' | 'gain_weight';
export type Gender = 'male' | 'female' | 'other';
