import { createClient } from '@supabase/supabase-js';
import type { User, UserProfile, FoodItem, MealEntry, WeightLog, DailySummary, WeightPrediction } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Using mock mode.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
});

// User operations
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data as UserProfile;
}

export async function updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<boolean> {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ ...profile, user_id: userId, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  return !error;
}

// Food operations
export async function searchFoods(query: string, limit: number = 20): Promise<FoodItem[]> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
    .limit(limit);

  if (error) return [];
  return data as FoodItem[];
}

export async function getFoodByBarcode(barcode: string): Promise<FoodItem | null> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('barcode', barcode)
    .single();

  if (error) return null;
  return data as FoodItem;
}

export async function addFoodItem(food: Omit<FoodItem, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  const { data, error } = await supabase
    .from('food_items')
    .insert([food])
    .select('id')
    .single();

  if (error) return null;
  return (data as { id: string }).id;
}

// Meal entry operations
export async function addMealEntry(entry: Omit<MealEntry, 'id' | 'created_at'>): Promise<string | null> {
  const { data, error } = await supabase
    .from('meal_entries')
    .insert([entry])
    .select('id')
    .single();

  if (error) return null;
  return (data as { id: string }).id;
}

export async function getMealEntriesForDate(userId: string, date: string): Promise<MealEntry[]> {
  const startOfDay = `${date}T00:00:00Z`;
  const endOfDay = `${date}T23:59:59Z`;

  const { data, error } = await supabase
    .from('meal_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('consumed_at', startOfDay)
    .lte('consumed_at', endOfDay)
    .order('consumed_at', { ascending: true });

  if (error) return [];
  return data as MealEntry[];
}

export async function deleteMealEntry(id: string): Promise<boolean> {
  const { error } = await supabase.from('meal_entries').delete().eq('id', id);
  return !error;
}

// Weight log operations
export async function addWeightLog(log: Omit<WeightLog, 'id' | 'created_at'>): Promise<string | null> {
  const { data, error } = await supabase
    .from('weight_logs')
    .insert([log])
    .select('id')
    .single();

  if (error) return null;
  return (data as { id: string }).id;
}

export async function getWeightHistory(userId: string, days: number = 90): Promise<WeightLog[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('measured_at', cutoffDate.toISOString())
    .order('measured_at', { ascending: false });

  if (error) return [];
  return data as WeightLog[];
}

// Daily summary operations
export async function getDailySummary(userId: string, date: string): Promise<DailySummary | null> {
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (error) return null;
  return data as DailySummary;
}

export async function updateDailySummary(
  userId: string,
  date: string,
  summary: Partial<DailySummary>
): Promise<boolean> {
  const { error } = await supabase
    .from('daily_summaries')
    .upsert({ ...summary, user_id: userId, date, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('date', date);

  return !error;
}

// Weight prediction operations
export async function getWeightPrediction(userId: string): Promise<WeightPrediction | null> {
  const { data, error } = await supabase
    .from('weight_predictions')
    .select('*')
    .eq('user_id', userId)
    .order('predicted_date', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as WeightPrediction;
}

export async function saveWeightPrediction(prediction: Omit<WeightPrediction, 'created_at'>): Promise<boolean> {
  const { error } = await supabase.from('weight_predictions').insert([prediction]);
  return !error;
}

// Auth helpers
export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
