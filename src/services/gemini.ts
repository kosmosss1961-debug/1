import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import type { FoodItem, MealType, MealStyle } from '@/types';

interface GeminiConfig {
  apiKeys: string[];
  currentKeyIndex: number;
  keyErrorCounts: Map<string, number>;
  lastKeyRotation: number;
}

class GeminiServiceClass {
  private config: GeminiConfig;
  private models: Map<string, GenerativeModel>;
  private cache: Map<string, any>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 30000;

  constructor() {
    const keysString = process.env.GEMINI_API_KEYS || '';
    const apiKeys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    this.config = {
      apiKeys,
      currentKeyIndex: 0,
      keyErrorCounts: new Map(),
      lastKeyRotation: Date.now(),
    };

    this.models = new Map();
    this.cache = new Map();

    if (apiKeys.length === 0) {
      console.warn('No Gemini API keys configured');
    } else {
      console.log(`Initialized ${apiKeys.length} Gemini API keys`);
      this.initializeModels();
    }
  }

  private initializeModels() {
    for (const key of this.config.apiKeys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        this.models.set(key, genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }));
        this.config.keyErrorCounts.set(key, 0);
      } catch (error) {
        console.error(`Failed to initialize model for key: ${key.substring(0, 8)}...`);
      }
    }
  }

  private getActiveKey(): string | null {
    const activeKeys = this.config.apiKeys.filter(
      key => (this.config.keyErrorCounts.get(key) || 0) < 5
    );

    if (activeKeys.length === 0) {
      return this.config.apiKeys[0] || null;
    }

    return activeKeys[this.config.currentKeyIndex % activeKeys.length];
  }

  private rotateKey() {
    this.config.currentKeyIndex = (this.config.currentKeyIndex + 1) % this.config.apiKeys.length;
    this.config.lastKeyRotation = Date.now();
  }

  private incrementKeyError(key: string) {
    const currentCount = this.config.keyErrorCounts.get(key) || 0;
    this.config.keyErrorCounts.set(key, currentCount + 1);
    
    if (currentCount + 1 >= 3) {
      this.rotateKey();
    }
  }

  private resetKeySuccess(key: string) {
    this.config.keyErrorCounts.set(key, 0);
  }

  private getCachedResponse(cacheKey: string): any | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  private setCache(cacheKey: string, data: any) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, key: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const timeoutPromise = new Promise<T>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.TIMEOUT_MS);
        });

        const result = await Promise.race([operation(), timeoutPromise]);
        this.resetKeySuccess(key);
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt + 1} failed:`, error.message);

        if (error.message.includes('429') || error.message.includes('quota')) {
          this.incrementKeyError(key);
          this.rotateKey();
          
          const newKey = this.getActiveKey();
          if (!newKey || newKey === key) {
            await this.sleep(2000 * (attempt + 1));
          }
        } else if (error.message.includes('403')) {
          this.incrementKeyError(key);
          this.rotateKey();
        } else if (error.message.includes('500') || error.message.includes('503')) {
          await this.sleep(1000 * (attempt + 1));
        } else {
          throw error;
        }
      }
    }

    throw lastError || new Error('All retries failed');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async analyzeFoodImage(imageData: string | Buffer, mimeType: string = 'image/jpeg'): Promise<Partial<FoodItem> | null> {
    const cacheKey = `image:${typeof imageData === 'string' ? imageData.substring(0, 50) : 'buffer'}`;
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const key = this.getActiveKey();
    if (!key) {
      throw new Error('No active Gemini API keys available');
    }

    const model = this.models.get(key);
    if (!model) {
      throw new Error('Model not initialized for key');
    }

    try {
      const base64Data = typeof imageData === 'string' 
        ? imageData.split(',')[1] || imageData 
        : imageData.toString('base64');

      const prompt = `Analyze this food image and provide detailed nutritional information. Return ONLY a valid JSON object with the following structure (no markdown, no explanations):
{
  "name": "food name in Russian",
  "brand": "brand name or null",
  "calories_per_100g": number,
  "protein_per_100g": number,
  "carbs_per_100g": number,
  "fat_per_100g": number,
  "fiber_per_100g": number,
  "estimated_weight_g": number,
  "ingredients": "list of visible ingredients or null",
  "category": "food category",
  "confidence": 0.0-1.0
}`;

      const result = await this.executeWithRetry(async () => {
        const response = await model.generateContent([
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          prompt,
        ]);
        return response.response.text();
      }, key);

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      this.setCache(cacheKey, parsed);
      
      return {
        name: parsed.name,
        brand: parsed.brand,
        calories_per_100g: parsed.calories_per_100g || 0,
        protein_per_100g: parsed.protein_per_100g || 0,
        carbs_per_100g: parsed.carbs_per_100g || 0,
        fat_per_100g: parsed.fat_per_100g || 0,
        fiber_per_100g: parsed.fiber_per_100g || 0,
        serving_size_g: parsed.estimated_weight_g || 100,
        ingredients: parsed.ingredients,
        category: parsed.category,
      };
    } catch (error: any) {
      console.error('Food image analysis failed:', error.message);
      throw error;
    }
  }

  async generateMealRecommendation(
    userProfile: any,
    mealType: MealType,
    mealStyle: MealStyle,
    currentDailyIntake: any
  ): Promise<string> {
    const cacheKey = `recommendation:${userProfile.id}:${mealType}:${mealStyle}`;
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const key = this.getActiveKey();
    if (!key) {
      throw new Error('No active Gemini API keys available');
    }

    const model = this.models.get(key);
    if (!model) {
      throw new Error('Model not initialized for key');
    }

    try {
      const prompt = `Ты - профессиональный диетолог и нутрициолог. Создай рекомендацию по питанию для пользователя.

Профиль пользователя:
- Возраст: ${userProfile.age || 'не указан'}
- Пол: ${userProfile.gender || 'не указан'}
- Рост: ${userProfile.height_cm || '?'} см
- Текущий вес: ${userProfile.current_weight_kg || '?'} кг
- Целевой вес: ${userProfile.target_weight_kg || '?'} кг
- Активность: ${userProfile.activity_level || 'не указана'}
- Цель: ${userProfile.goal || 'не указана'}
- Ограничения: ${userProfile.dietary_restrictions?.join(', ') || 'нет'}
- Аллергии: ${userProfile.allergies?.join(', ') || 'нет'}
- Нелюбимые продукты: ${userProfile.disliked_foods?.join(', ') || 'нет'}
- Рекомендации врача: ${userProfile.doctor_recommendations || 'нет'}

Текущий приём пищи: ${mealType === 'breakfast' ? 'Завтрак' : mealType === 'lunch' ? 'Обед' : mealType === 'dinner' ? 'Ужин' : 'Перекус'}
Стиль приёма: ${mealStyle === 'light' ? 'Лёгкий' : mealStyle === 'medium' ? 'Средний' : mealStyle === 'heavy' ? 'Плотный' : mealStyle === 'protein' ? 'Белковый' : mealStyle === 'vegetable' ? 'Овощной' : 'Свободный'}

Текущее потребление за день:
- Калории: ${currentDailyIntake.calories || 0} ккал
- Белки: ${currentDailyIntake.protein || 0} г
- Углеводы: ${currentDailyIntake.carbs || 0} г
- Жиры: ${currentDailyIntake.fat || 0} г

Дай конкретную рекомендацию:
1. Что съесть (конкретные продукты с указанием веса в граммах)
2. Почему это подходит для данной цели
3. Как это вписывается в дневной план
4. Альтернативные варианты

Ответ должен быть кратким, практичным и мотивирующим. Используй русский язык.`;

      const result = await this.executeWithRetry(async () => {
        const response = await model.generateContent(prompt);
        return response.response.text();
      }, key);

      this.setCache(cacheKey, result);
      return result;
    } catch (error: any) {
      console.error('Meal recommendation failed:', error.message);
      throw error;
    }
  }

  async analyzeRefrigeratorPhoto(imageData: string | Buffer, mimeType: string = 'image/jpeg'): Promise<string[]> {
    const key = this.getActiveKey();
    if (!key) {
      throw new Error('No active Gemini API keys available');
    }

    const model = this.models.get(key);
    if (!model) {
      throw new Error('Model not initialized for key');
    }

    try {
      const base64Data = typeof imageData === 'string' 
        ? imageData.split(',')[1] || imageData 
        : imageData.toString('base64');

      const prompt = `Проанализируй фото холодильника/продуктов. Верни ТОЛЬКО JSON массив с названиями видимых продуктов на русском языке. Пример: ["молоко", "яйца", "сыр", "овощи"]. Никакого дополнительного текста.`;

      const result = await this.executeWithRetry(async () => {
        const response = await model.generateContent([
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          prompt,
        ]);
        return response.response.text();
      }, key);

      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON array in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error: any) {
      console.error('Refrigerator analysis failed:', error.message);
      throw error;
    }
  }

  async validateApiKey(key: string): Promise<boolean> {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const testModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const response = await testModel.generateContent('Hello');
      return response.response.text().length > 0;
    } catch {
      return false;
    }
  }

  getKeyStatus() {
    return {
      totalKeys: this.config.apiKeys.length,
      activeKeys: this.config.apiKeys.filter(
        k => (this.config.keyErrorCounts.get(k) || 0) < 5
      ).length,
      currentIndex: this.config.currentKeyIndex,
      errorCounts: Object.fromEntries(this.config.keyErrorCounts),
    };
  }
}

export const GeminiService = new GeminiServiceClass();
export default GeminiService;
