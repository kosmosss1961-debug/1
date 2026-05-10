import type { WeightLog, UserProfile } from '@/types';

interface WeightPredictionResult {
  predictedWeight7d: number;
  predictedWeight14d: number;
  predictedWeight30d: number;
  goalAchievementDate: string | null;
  plateauProbability: number;
  dropoutProbability: number;
  weightTrend: 'losing' | 'gaining' | 'stable';
  averageDailyChange: number;
  confidenceScore: number;
}

interface MLFeatures {
  weights: number[];
  dates: Date[];
  avgCalorieDeficit: number;
  avgProteinIntake: number;
  avgWaterIntake: number;
  avgSteps: number;
  consistencyScore: number;
  phase: number;
}

class WeightPredictionModel {
  private readonly MODEL_VERSION = '1.0.0';
  private readonly MIN_DATA_POINTS = 3;
  
  predict(
    weightHistory: WeightLog[],
    userProfile: UserProfile,
    dailyAverages: { calories: number; protein: number; water: number; steps: number }
  ): WeightPredictionResult {
    if (weightHistory.length < this.MIN_DATA_POINTS) {
      return this.getBaselinePrediction(weightHistory, userProfile);
    }

    const features = this.extractFeatures(weightHistory, dailyAverages);
    const prediction = this.runHybridModel(features, userProfile);
    
    return {
      ...prediction,
      confidenceScore: this.calculateConfidence(weightHistory, features),
    };
  }

  private extractFeatures(
    weightHistory: WeightLog[],
    dailyAverages: { calories: number; protein: number; water: number; steps: number }
  ): MLFeatures {
    const sortedLogs = [...weightHistory].sort(
      (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
    );

    const weights = sortedLogs.map(log => log.weight_kg);
    const dates = sortedLogs.map(log => new Date(log.measured_at));

    const totalDays = Math.max(
      1,
      Math.ceil(
        (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    const weightChanges = [];
    for (let i = 1; i < weights.length; i++) {
      const daysBetween = Math.max(
        1,
        Math.ceil((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24))
      );
      weightChanges.push((weights[i] - weights[i - 1]) / daysBetween);
    }

    const avgDailyChange = weightChanges.reduce((a, b) => a + b, 0) / weightChanges.length || 0;
    const variance = weightChanges.reduce((acc, val) => acc + Math.pow(val - avgDailyChange, 2), 0) / weightChanges.length;
    const stdDev = Math.sqrt(variance);

    const consistencyScores = weightChanges.map(change => {
      const deviation = Math.abs(change - avgDailyChange);
      return Math.max(0, 1 - deviation / (stdDev || 1));
    });
    const consistencyScore = consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;

    const currentWeight = userProfile.current_weight_kg || weights[weights.length - 1];
    const targetWeight = userProfile.target_weight_kg || currentWeight - 5;
    const weightProgress = (currentWeight - targetWeight) / Math.max(1, currentWeight - (weights[0] || currentWeight));
    const phase = Math.min(1, Math.max(0, weightProgress));

    return {
      weights,
      dates,
      avgCalorieDeficit: dailyAverages.calories || 0,
      avgProteinIntake: dailyAverages.protein || 0,
      avgWaterIntake: dailyAverages.water || 0,
      avgSteps: dailyAverages.steps || 0,
      consistencyScore,
      phase,
    };
  }

  private runHybridModel(features: MLFeatures, userProfile: UserProfile): Omit<WeightPredictionResult, 'confidenceScore'> {
    const currentWeight = features.weights[features.weights.length - 1];
    const targetWeight = userProfile.target_weight_kg || currentWeight - 5;
    
    const timeSeriesComponent = this.timeSeriesForecast(features);
    const regressionComponent = this.regressionForecast(features, userProfile);
    const behavioralComponent = this.behavioralAdjustment(features, userProfile);

    const blendedPrediction = {
      day7: timeSeriesComponent.day7 * 0.4 + regressionComponent.day7 * 0.4 + behavioralComponent.day7 * 0.2,
      day14: timeSeriesComponent.day14 * 0.4 + regressionComponent.day14 * 0.4 + behavioralComponent.day14 * 0.2,
      day30: timeSeriesComponent.day30 * 0.3 + regressionComponent.day30 * 0.4 + behavioralComponent.day30 * 0.3,
    };

    const avgDailyChange = (blendedPrediction.day30 - currentWeight) / 30;
    const weightTrend: 'losing' | 'gaining' | 'stable' = 
      avgDailyChange < -0.1 ? 'losing' : avgDailyChange > 0.1 ? 'gaining' : 'stable';

    const daysToGoal = targetWeight !== currentWeight 
      ? (targetWeight - currentWeight) / avgDailyChange 
      : Infinity;

    const goalAchievementDate = daysToGoal > 0 && daysToGoal < 365
      ? new Date(Date.now() + daysToGoal * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;

    const plateauProbability = this.calculatePlateauProbability(features, avgDailyChange);
    const dropoutProbability = this.calculateDropoutProbability(features, userProfile);

    return {
      predictedWeight7d: Math.round(blendedPrediction.day7 * 10) / 10,
      predictedWeight14d: Math.round(blendedPrediction.day14 * 10) / 10,
      predictedWeight30d: Math.round(blendedPrediction.day30 * 10) / 10,
      goalAchievementDate,
      plateauProbability,
      dropoutProbability,
      weightTrend,
      averageDailyChange: Math.round(avgDailyChange * 100) / 100,
    };
  }

  private timeSeriesForecast(features: MLFeatures): { day7: number; day14: number; day30: number } {
    const weights = features.weights;
    const n = weights.length;
    
    if (n < 2) {
      const lastWeight = weights[n - 1] || 70;
      return { day7: lastWeight, day14: lastWeight, day30: lastWeight };
    }

    const recentTrend = n >= 3 
      ? (weights[n - 1] - weights[n - 3]) / 2 
      : weights[n - 1] - weights[n - 2];

    const smoothedTrend = this.exponentialSmoothing(weights, 0.3);
    const adjustedTrend = recentTrend * 0.6 + smoothedTrend * 0.4;

    const currentWeight = weights[n - 1];

    return {
      day7: currentWeight + adjustedTrend * 7,
      day14: currentWeight + adjustedTrend * 14,
      day30: currentWeight + adjustedTrend * 30,
    };
  }

  private exponentialSmoothing(data: number[], alpha: number): number {
    let smoothed = data[0];
    for (let i = 1; i < data.length; i++) {
      smoothed = alpha * data[i] + (1 - alpha) * smoothed;
    }
    return smoothed;
  }

  private regressionForecast(features: MLFeatures, userProfile: UserProfile): { day7: number; day14: number; day30: number } {
    const currentWeight = features.weights[features.weights.length - 1];
    const targetWeight = userProfile.target_weight_kg || currentWeight - 5;
    
    const calorieDeficitFactor = features.avgCalorieDeficit > 0 ? -0.00013 : 0.0001;
    const proteinFactor = features.avgProteinIntake > 80 ? -0.002 : 0.001;
    const waterFactor = features.avgWaterIntake > 2 ? -0.001 : 0.0005;
    const activityFactor = features.avgSteps > 8000 ? -0.0015 : 0.0005;

    const dailyRate = calorieDeficitFactor + proteinFactor + waterFactor + activityFactor;
    const plateauAdjustment = 1 - features.phase * 0.3;

    return {
      day7: currentWeight + dailyRate * 7 * plateauAdjustment,
      day14: currentWeight + dailyRate * 14 * plateauAdjustment,
      day30: currentWeight + dailyRate * 30 * plateauAdjustment,
    };
  }

  private behavioralAdjustment(features: MLFeatures, userProfile: UserProfile): { day7: number; day14: number; day30: number } {
    const currentWeight = features.weights[features.weights.length - 1];
    const baseRate = (currentWeight - (userProfile.target_weight_kg || currentWeight - 5)) / 60;
    
    const consistencyMultiplier = 0.5 + features.consistencyScore * 0.5;
    const motivationDecay = 1 - features.phase * 0.2;

    const adjustedRate = baseRate * consistencyMultiplier * motivationDecay;

    return {
      day7: currentWeight + adjustedRate * 7,
      day14: currentWeight + adjustedRate * 14,
      day30: currentWeight + adjustedRate * 30,
    };
  }

  private calculatePlateauProbability(features: MLFeatures, avgDailyChange: number): number {
    const weights = features.weights;
    if (weights.length < 3) return 0.3;

    const recentWeights = weights.slice(-7);
    const recentVariance = recentWeights.reduce((acc, w) => acc + Math.pow(w - recentWeights[0], 2), 0) / recentWeights.length;
    
    const trendStrength = Math.abs(avgDailyChange);
    const varianceFactor = Math.min(1, recentVariance / 0.5);
    const trendFactor = Math.min(1, trendStrength / 0.2);

    return Math.round((varianceFactor * (1 - trendFactor)) * 100) / 100;
  }

  private calculateDropoutProbability(features: MLFeatures, userProfile: UserProfile): number {
    const currentWeight = features.weights[features.weights.length - 1];
    const targetWeight = userProfile.target_weight_kg || currentWeight - 5;
    const progress = Math.abs(currentWeight - (features.weights[0] || currentWeight)) / Math.max(1, Math.abs(currentWeight - targetWeight));
    
    const consistencyPenalty = (1 - features.consistencyScore) * 0.3;
    const progressBonus = progress > 0.5 ? -0.1 : 0;
    const phasePenalty = features.phase > 0.7 ? 0.15 : 0;

    return Math.round(Math.max(0, Math.min(1, 0.2 + consistencyPenalty + progressBonus + phasePenalty)) * 100) / 100;
  }

  private calculateConfidence(weightHistory: WeightLog[], features: MLFeatures): number {
    const dataPointsFactor = Math.min(1, weightHistory.length / 30);
    const consistencyFactor = features.consistencyScore;
    const recencyFactor = (() => {
      const lastEntry = weightHistory[weightHistory.length - 1];
      const daysSinceLast = (Date.now() - new Date(lastEntry.measured_at).getTime()) / (1000 * 60 * 60 * 24);
      return Math.max(0, 1 - daysSinceLast / 14);
    })();

    return Math.round((dataPointsFactor * 0.4 + consistencyFactor * 0.3 + recencyFactor * 0.3) * 100) / 100;
  }

  private getBaselinePrediction(weightHistory: WeightLog[], userProfile: UserProfile): WeightPredictionResult {
    const currentWeight = userProfile.current_weight_kg || 70;
    const targetWeight = userProfile.target_weight_kg || currentWeight - 5;
    const assumedRate = -0.05;

    return {
      predictedWeight7d: Math.round((currentWeight + assumedRate * 7) * 10) / 10,
      predictedWeight14d: Math.round((currentWeight + assumedRate * 14) * 10) / 10,
      predictedWeight30d: Math.round((currentWeight + assumedRate * 30) * 10) / 10,
      goalAchievementDate: new Date(Date.now() + ((targetWeight - currentWeight) / assumedRate) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      plateauProbability: 0.3,
      dropoutProbability: 0.2,
      weightTrend: 'losing',
      averageDailyChange: assumedRate,
      confidenceScore: 0.5,
    };
  }

  calculateFatBurnIndex(
    weightHistory: WeightLog[],
    dailySummary: { calories: number; protein: number; water: number; steps: number },
    userProfile: UserProfile
  ): number {
    const prediction = this.predict(weightHistory, userProfile, dailySummary);
    
    const trendScore = prediction.weightTrend === 'losing' ? 1 : prediction.weightTrend === 'stable' ? 0.5 : 0;
    const proteinScore = Math.min(1, dailySummary.protein / (userProfile.current_weight_kg || 70) / 2);
    const waterScore = Math.min(1, dailySummary.water / 2.5);
    const activityScore = Math.min(1, dailySummary.steps / 10000);
    const consistencyScore = prediction.confidenceScore;

    const index = (
      trendScore * 0.3 +
      proteinScore * 0.25 +
      waterScore * 0.15 +
      activityScore * 0.15 +
      consistencyScore * 0.15
    ) * 100;

    return Math.round(index);
  }

  calculateDisciplineIndex(mealConsistency: number, loggingStreak: number, goalAdherence: number): number {
    const index = (
      mealConsistency * 0.4 +
      Math.min(1, loggingStreak / 30) * 0.3 +
      goalAdherence * 0.3
    ) * 100;

    return Math.round(index);
  }
}

export const WeightPredictionService = new WeightPredictionModel();
export default WeightPredictionService;
