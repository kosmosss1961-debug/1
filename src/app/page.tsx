'use client';

import { useEffect, useState } from 'react';
import { Activity, Utensils, Droplets, Footprints, TrendingUp, Camera, ScanLine, Plus } from 'lucide-react';

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyStats, setDailyStats] = useState({
    calories: 0,
    caloriesGoal: 1800,
    protein: 0,
    proteinGoal: 140,
    water: 0,
    waterGoal: 2.5,
    steps: 0,
    stepsGoal: 10000,
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  const ProgressCard = ({ 
    icon: Icon, 
    title, 
    current, 
    goal, 
    unit, 
    color 
  }: any) => {
    const percentage = Math.min(100, Math.round((current / goal) * 100));
    
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-xl ${color}`}>
            <Icon size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-800">
            {current}<span className="text-sm text-gray-500 ml-1">{unit}</span>
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${color.replace('bg-', 'bg-').replace('/10', '')} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Цель: {goal}{unit}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl font-bold mb-1">FatBurner</h1>
          <p className="text-emerald-100 text-lg">{formatDate(currentDate)}</p>
          
          <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Вес сегодня</p>
                <p className="text-4xl font-bold mt-1">75.2<span className="text-xl ml-1">кг</span></p>
              </div>
              <TrendingUp size={48} className="text-emerald-200 opacity-50" />
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <div>
                <span className="text-emerald-100">Цель:</span>
                <span className="ml-2 font-semibold">68 кг</span>
              </div>
              <div>
                <span className="text-emerald-100">Прогресс:</span>
                <span className="ml-2 font-semibold">32%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <section className="max-w-lg mx-auto px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-md p-4 grid grid-cols-3 gap-3">
          <button className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
              <Camera size={24} className="text-emerald-600" />
            </div>
            <span className="text-xs text-gray-600">Фото еды</span>
          </button>
          <button className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <ScanLine size={24} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Штрих-код</span>
          </button>
          <button className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
              <Plus size={24} className="text-orange-600" />
            </div>
            <span className="text-xs text-gray-600">Добавить</span>
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="max-w-lg mx-auto px-4 mt-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Сегодня</h2>
        
        <ProgressCard
          icon={Utensils}
          title="Калории"
          current={dailyStats.calories}
          goal={dailyStats.caloriesGoal}
          unit=" ккал"
          color="bg-red-500/10"
        />
        
        <ProgressCard
          icon={Activity}
          title="Белок"
          current={dailyStats.protein}
          goal={dailyStats.proteinGoal}
          unit=" г"
          color="bg-blue-500/10"
        />
        
        <ProgressCard
          icon={Droplets}
          title="Вода"
          current={dailyStats.water}
          goal={dailyStats.waterGoal}
          unit=" л"
          color="bg-cyan-500/10"
        />
        
        <ProgressCard
          icon={Footprints}
          title="Шаги"
          current={dailyStats.steps}
          goal={dailyStats.stepsGoal}
          unit=""
          color="bg-purple-500/10"
        />
      </section>

      {/* AI Prediction Card */}
      <section className="max-w-lg mx-auto px-4 mt-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-lg font-bold">AI Прогноз</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-indigo-200 text-xs">7 дней</p>
              <p className="text-2xl font-bold">74.1 кг</p>
            </div>
            <div>
              <p className="text-indigo-200 text-xs">14 дней</p>
              <p className="text-2xl font-bold">73.0 кг</p>
            </div>
            <div>
              <p className="text-indigo-200 text-xs">30 дней</p>
              <p className="text-2xl font-bold">71.2 кг</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-indigo-100">
            🎯 Дата достижения цели: <strong>15 марта 2026</strong>
          </p>
        </div>
      </section>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 safe-area-bottom">
        <div className="max-w-lg mx-auto flex justify-around">
          <button className="flex flex-col items-center text-emerald-600">
            <Activity size={24} />
            <span className="text-xs mt-1 font-medium">Главная</span>
          </button>
          <button className="flex flex-col items-center text-gray-400 hover:text-gray-600">
            <Utensils size={24} />
            <span className="text-xs mt-1">Питание</span>
          </button>
          <button className="flex flex-col items-center text-gray-400 hover:text-gray-600">
            <TrendingUp size={24} />
            <span className="text-xs mt-1">Вес</span>
          </button>
          <button className="flex flex-col items-center text-gray-400 hover:text-gray-600">
            <Camera size={24} />
            <span className="text-xs mt-1">AI</span>
          </button>
        </div>
      </nav>
    </main>
  );
}
