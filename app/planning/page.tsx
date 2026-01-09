'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

import {
  loadPlanning,
  saveMealToPlanning,
  removeMealFromPlanning,
  loadFamilySize,
  updateFamilySize,
} from '@/services/planningService';

import {
  loadPlanningRecipes,
} from '@/services/planningDataService';

import type {
  MealType,
  MealCategory,
} from '@/services/planning';

// ============================================
// TYPES
// ============================================

interface Ingredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

interface Recipe {
  id: string;
  name: string;
  category: MealCategory;
  continent: string;
  country: string;
  instructions: string;
  ingredients: Ingredient[];
  total_price: number;
  is_custom: boolean;
  is_validated: boolean;
}

interface Meal {
  id: string;
  name: string;
  category: MealCategory;
  price: number;
  ingredients?: Ingredient[];
  isCustom: boolean;
  planningId?: string;
}

interface MealsByDate {
  [dateKey: string]: {
    breakfast: Meal[];
    lunch: Meal[];
    snack: Meal[];
    dinner: Meal[];
  };
}

// ============================================
// CONSTANTES
// ============================================

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Goûter',
  dinner: 'Dîner',
};

const CATEGORY_LABELS: Record<MealCategory, string> = {
  entree: 'Entrée',
  principal: 'Principal',
  accompagnement: 'Accompagnement',
  dessert: 'Dessert',
  boisson: 'Boisson',
};

// ============================================
// PAGE COMPONENT
// ============================================

export default function PlanningPage() {
  const { user, loading: authLoading } = useAuth();
  
  // États de chargement
  const [loading, setLoading] = useState(true);
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  // États des données
  const [familySize, setFamilySize] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealsByDate, setMealsByDate] = useState<MealsByDate>({});
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);

  // États des modales
  const [showMainModal, setShowMainModal] = useState(false);
  const [showRecipeListModal, setShowRecipeListModal] = useState(false);
  const [showRecipeDetailsModal, setShowRecipeDetailsModal] = useState(false);
  const [currentMealType, setCurrentMealType] = useState<MealType>('breakfast');
  const [currentCategory, setCurrentCategory] = useState<MealCategory | ''>('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  // Charger les recettes au montage
  useEffect(() => {
    loadRecipesData();
  }, []);

  const loadRecipesData = async () => {
    setLoadingRecipes(true);
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      const recipesPromise = loadPlanningRecipes(false);
      const recipes = await Promise.race([recipesPromise, timeoutPromise]) as Recipe[];
      
      if (recipes && recipes.length > 0) {
        setAvailableRecipes(recipes);
        console.log(`✅ ${recipes.length} recettes chargées`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement recettes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  // Charger les données utilisateur
  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setLoading(false);
      return;
    }

    loadUserData();
  }, [authLoading, user?.id]);

  const loadUserData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      // Charger la taille de famille
      const familySizePromise = loadFamilySize(user.id);
      const loadedFamilySize = await Promise.race([familySizePromise, timeoutPromise]) as number;
      setFamilySize(loadedFamilySize || 1);

      // Charger le planning
      const planningPromise = loadPlanning(user.id);
      const planning = await Promise.race([planningPromise, timeoutPromise]) as any[];

      const mapped: MealsByDate = {};
      planning.forEach((p: { id: string; dateRepas: string; typeRepas: MealType; meal: Meal }) => {
        if (!mapped[p.dateRepas]) {
          mapped[p.dateRepas] = {
            breakfast: [],
            lunch: [],
            snack: [],
            dinner: [],
          };
        }

        const mealType = p.typeRepas as MealType;
        if (mealType && mapped[p.dateRepas][mealType]) {
          mapped[p.dateRepas][mealType].push({
            ...p.meal,
            planningId: p.id,
          });
        }
      });

      setMealsByDate(mapped);
      console.log('✅ Planning chargé');
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarde automatique de la taille de famille
  useEffect(() => {
    if (user?.id && familySize > 0) {
      const timer = setTimeout(async () => {
        await updateFamilySize(user.id, familySize);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [familySize, user?.id]);

  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================

  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDayName = (date: Date): string => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[date.getDay()];
  };

  const getMonthName = (date: Date): string => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return months[date.getMonth()];
  };

  const getMonthNameFull = (date: Date): string => {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return months[date.getMonth()];
  };

  const isSameDate = (date1: Date, date2: Date): boolean => {
    return formatDate(date1) === formatDate(date2);
  };

  const getWeekDates = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      dates.push(weekDate);
    }
    return dates;
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getCurrentMeals = () => {
    const dateKey = formatDate(selectedDate);
    return mealsByDate[dateKey] || { breakfast: [], lunch: [], snack: [], dinner: [] };
  };

  const getMealTotal = (mealType: MealType): number => {
    const meals = getCurrentMeals()[mealType];
    return meals.reduce((sum, meal) => sum + (meal.price * familySize), 0);
  };

  const getDayTotal = (): number => {
    return getMealTotal('breakfast') + getMealTotal('lunch') + getMealTotal('snack') + getMealTotal('dinner');
  };

  const dateHasMeals = (date: Date): boolean => {
    const dateKey = formatDate(date);
    const meals = mealsByDate[dateKey];
    if (!meals) return false;
    return meals.breakfast.length > 0 || meals.lunch.length > 0 || meals.snack.length > 0 || meals.dinner.length > 0;
  };

  // ============================================
  // GESTION DES MODALES
  // ============================================

  const openAddModal = (mealType: MealType) => {
    setCurrentMealType(mealType);
    setCurrentCategory('');
    setShowMainModal(true);
  };

  const closeAllModals = () => {
    setShowMainModal(false);
    setShowRecipeListModal(false);
    setShowRecipeDetailsModal(false);
    setSelectedRecipe(null);
    setCurrentCategory('');
    setSearchQuery('');
  };

  const showRecipeList = () => {
    if (!currentCategory) {
      alert('Veuillez sélectionner une catégorie');
      return;
    }
    setShowMainModal(false);
    setShowRecipeListModal(true);
  };

  const backToMainModal = () => {
    setShowRecipeListModal(false);
    setShowRecipeDetailsModal(false);
    setShowMainModal(true);
    setSearchQuery('');
  };

  const backToRecipeList = () => {
    setShowRecipeDetailsModal(false);
    setShowRecipeListModal(true);
  };

  const showRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeListModal(false);
    setShowRecipeDetailsModal(true);
  };

  // ============================================
  // ACTIONS
  // ============================================

  const generateMealId = (): string => {
    return `meal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const getFilteredRecipes = () => {
    return availableRecipes.filter(recipe => {
      const matchesCategory = recipe.category === currentCategory;
      const matchesSearch = searchQuery === '' || 
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.continent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.country.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  const confirmRecipeSelection = async () => {
    if (!selectedRecipe) return;

    const dateKey = formatDate(selectedDate);
    const newMeal: Meal = {
      id: generateMealId(),
      name: selectedRecipe.name,
      category: selectedRecipe.category,
      price: selectedRecipe.total_price,
      ingredients: selectedRecipe.ingredients,
      isCustom: selectedRecipe.is_custom,
    };

    // Mode invité
    if (!user?.id) {
      setMealsByDate(prev => {
        const dateMeals = prev[dateKey] || { breakfast: [], lunch: [], snack: [], dinner: [] };
        const updated = {
          ...prev,
          [dateKey]: {
            ...dateMeals,
            [currentMealType]: [...dateMeals[currentMealType], newMeal]
          }
        };
        localStorage.setItem('planningMeals', JSON.stringify(updated));
        return updated;
      });
      closeAllModals();
      return;
    }

    // Mode connecté
    try {
      const planningId = await saveMealToPlanning(
        user.id,
        dateKey,
        currentMealType,
        newMeal,
        familySize
      );

      if (planningId) {
        newMeal.planningId = planningId;
        setMealsByDate(prev => {
          const dateMeals = prev[dateKey] || { breakfast: [], lunch: [], snack: [], dinner: [] };
          return {
            ...prev,
            [dateKey]: {
              ...dateMeals,
              [currentMealType]: [...dateMeals[currentMealType], newMeal]
            }
          };
        });
        console.log('✅ Repas ajouté au planning');
      } else {
        alert('❌ Erreur lors de l\'ajout du repas');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('❌ Erreur lors de l\'ajout du repas');
    }

    closeAllModals();
  };

  const removeMeal = async (mealType: MealType, mealId: string) => {
    const dateKey = formatDate(selectedDate);
    const meal = mealsByDate[dateKey]?.[mealType].find(m => m.id === mealId);

    // Mode invité
    if (!user?.id) {
      setMealsByDate(prev => {
        const dateMeals = prev[dateKey];
        if (!dateMeals) return prev;
        const updated = {
          ...prev,
          [dateKey]: {
            ...dateMeals,
            [mealType]: dateMeals[mealType].filter(m => m.id !== mealId)
          }
        };
        localStorage.setItem('planningMeals', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    // Mode connecté
    if (meal?.planningId) {
      try {
        const success = await removeMealFromPlanning(meal.planningId, user.id);
        if (!success) {
          alert('❌ Erreur lors de la suppression');
          return;
        }
      } catch (error) {
        console.error('❌ Erreur:', error);
        alert('❌ Erreur lors de la suppression');
        return;
      }
    }

    setMealsByDate(prev => {
      const dateMeals = prev[dateKey];
      if (!dateMeals) return prev;
      return {
        ...prev,
        [dateKey]: {
          ...dateMeals,
          [mealType]: dateMeals[mealType].filter(m => m.id !== mealId)
        }
      };
    });
  };

  // ============================================
  // RENDER
  // ============================================

  const weekDates = getWeekDates(currentDate);
  const currentMeals = getCurrentMeals();

  if (loading || authLoading || loadingRecipes) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #c5e0d4 0%, #b5d8c9 100%)' }}>
        <Header />
        <main className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-xl font-semibold" style={{ color: '#4a7c5a' }}>
              {loadingRecipes ? 'Chargement des recettes...' : 'Chargement du planning...'}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #c5e0d4 0%, #b5d8c9 100%)' }}>
      <Header />

      {/* Bannière mode invité */}
      {!user && (
        <div className="max-w-7xl mx-auto px-8 pt-4">
          <div 
            className="rounded-xl p-4 shadow-lg flex items-center justify-between"
            style={{ 
              background: 'linear-gradient(135deg, #fff4e6 0%, #ffe4cc 100%)',
              border: '2px solid #ffd699'
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">ℹ️</span>
              <div>
                <div className="font-bold text-base" style={{ color: '#d97706' }}>Mode invité</div>
                <div className="text-sm" style={{ color: '#92400e' }}>
                  Votre planning ne sera pas sauvegardé. Créez un compte pour le conserver !
                </div>
              </div>
            </div>
            <a href="/inscription">
              <button
                className="px-6 py-2 rounded-xl font-semibold text-sm text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7ec99b 0%, #9cd9b1 100%)' }}
              >
                ✨ Créer un compte
              </button>
            </a>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* En-tête */}
        <div className="rounded-3xl shadow-2xl p-8 mb-8 text-white" style={{ background: 'linear-gradient(135deg, #7ec99b 0%, #9cd9b1 100%)' }}>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📅</span>
              <h1 className="text-3xl font-bold">Planning des repas</h1>
            </div>
            <p className="text-lg opacity-95 text-center max-w-3xl">
              Planifiez vos repas de la semaine • {availableRecipes.length} recettes disponibles
            </p>
          </div>
        </div>

        {/* Section famille */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <span className="font-medium" style={{ color: '#333' }}>Nombre de personnes :</span>
            <input
              type="number"
              value={familySize}
              onChange={(e) => setFamilySize(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-20 px-3 py-2 rounded-xl text-center font-semibold focus:outline-none"
              style={{ border: '2px solid #7ec99b', backgroundColor: 'white' }}
            />
          </div>
        </div>

        {/* Navigation mois */}
        <div className="flex justify-center items-center gap-8 mb-6">
          <Button variant="secondary" onClick={() => navigateMonth(-1)}>◀</Button>
          <div className="text-center text-xl font-bold text-gray-800 min-w-[200px]">
            {getMonthNameFull(currentDate)} {currentDate.getFullYear()}
          </div>
          <Button variant="secondary" onClick={() => navigateMonth(1)}>▶</Button>
        </div>

        {/* Calendrier semaine */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-4 justify-center">
            <button
              onClick={() => navigateWeek(-1)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
              style={{ backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', color: '#4a7c5a' }}
            >
              <span className="text-xl">◀</span>
            </button>

            <div className="flex gap-4">
              {weekDates.map((date, index) => {
                const isToday = isSameDate(date, new Date());
                const isSelected = isSameDate(date, selectedDate);
                const hasMeals = dateHasMeals(date);

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className="flex flex-col items-center min-w-[80px] p-4 rounded-xl cursor-pointer transition-all duration-200"
                    style={{
                      backgroundColor: isSelected ? '#4a7c5a' : isToday ? '#b5d8c9' : '#fafafa',
                      color: isSelected || isToday ? 'white' : '#333',
                      transform: isSelected ? 'translateY(-3px) scale(1.05)' : 'translateY(0)',
                      boxShadow: isSelected ? '0 4px 12px rgba(74, 124, 90, 0.4)' : 'none',
                    }}
                  >
                    <div className="text-xs font-semibold uppercase mb-2" style={{ color: isSelected || isToday ? 'white' : '#999' }}>
                      {getDayName(date)}
                    </div>
                    <div className="text-2xl font-bold">{date.getDate()}</div>
                    <div className="text-xs mt-1" style={{ color: isSelected || isToday ? 'white' : '#999' }}>
                      {getMonthName(date)}
                    </div>
                    {hasMeals && (
                      <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: isSelected || isToday ? 'white' : '#22c55e' }} />
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => navigateWeek(1)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
              style={{ backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', color: '#4a7c5a' }}
            >
              <span className="text-xl">▶</span>
            </button>
          </div>

          <div className="text-center mt-4 font-semibold text-gray-700">
            {getDayName(selectedDate)} {selectedDate.getDate()} {getMonthName(selectedDate)} {selectedDate.getFullYear()}
          </div>
        </div>

        {/* Section des repas */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden">
          {(['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).map((mealType, index) => (
            <div
              key={mealType}
              className="grid grid-cols-[150px_1fr_130px] min-h-[70px]"
              style={{ borderBottom: index < 3 ? '2px solid #e8f5e9' : 'none' }}
            >
              <div className="text-white flex items-center justify-center font-semibold text-sm px-2 py-5" style={{ background: 'linear-gradient(135deg, #9cd9b1 0%, #7ec99b 100%)' }}>
                {MEAL_TYPE_LABELS[mealType]}
              </div>
              <div className="p-6 flex flex-col gap-3">
                {currentMeals[mealType].length === 0 ? (
                  <span
                    onClick={() => openAddModal(mealType)}
                    className="italic text-sm cursor-pointer transition-all hover:text-green-700 hover:font-semibold hover:underline"
                    style={{ color: '#999' }}
                  >
                    + Ajouter un plat
                  </span>
                ) : (
                  <>
                    {currentMeals[mealType].map((meal) => (
                      <div key={meal.id} className="flex items-center gap-3">
                        <div
                          className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-medium flex-1"
                          style={{ 
                            background: 'linear-gradient(135deg, #f0fff5 0%, #e4ffe8 100%)',
                            color: '#4a7c5a',
                            border: '1px solid #d4f7e0'
                          }}
                        >
                          <span className="font-bold">{CATEGORY_LABELS[meal.category]} :</span>
                          <span>{meal.name} ({meal.price.toLocaleString()} FCFA)</span>
                          <button
                            onClick={() => removeMeal(mealType, meal.id)}
                            className="text-white w-5 h-5 rounded-full text-xs flex items-center justify-center ml-auto"
                            style={{ backgroundColor: '#ef4444' }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                    <span
                      onClick={() => openAddModal(mealType)}
                      className="italic text-sm cursor-pointer transition-all hover:text-green-700 hover:font-semibold hover:underline"
                      style={{ color: '#999' }}
                    >
                      + Ajouter un autre plat
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-center font-bold text-sm px-3 py-5" style={{ backgroundColor: '#fafafa', color: '#4a7c5a' }}>
                {getMealTotal(mealType).toLocaleString()} FCFA
              </div>
            </div>
          ))}
          <div className="text-white p-6 flex justify-between items-center font-bold" style={{ background: 'linear-gradient(135deg, #7ec99b 0%, #9cd9b1 100%)' }}>
            <span>Total de la journée</span>
            <span>{getDayTotal().toLocaleString()} FCFA</span>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modal overlay */}
      {(showMainModal || showRecipeListModal || showRecipeDetailsModal) && (
        <div onClick={closeAllModals} className="fixed inset-0 bg-black/50 z-40" />
      )}

      {/* Modal principal */}
      {showMainModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[400px]" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            Ajouter un plat - {MEAL_TYPE_LABELS[currentMealType]}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#4a7c5a' }}>Catégorie</label>
              <select
                value={currentCategory}
                onChange={(e) => setCurrentCategory(e.target.value as MealCategory)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none"
                style={{ border: '2px solid #d4f7e0' }}
              >
                <option value="">Sélectionner une catégorie</option>
                <option value="entree">Entrée</option>
                <option value="principal">Principal</option>
                <option value="accompagnement">Accompagnement</option>
                <option value="dessert">Dessert</option>
                <option value="boisson">Boisson</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#4a7c5a' }}>Sélectionner une recette</label>
              <button
                onClick={showRecipeList}
                className="w-full p-6 rounded-xl cursor-pointer flex flex-col items-center gap-3 transition-all hover:shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #f0fff5 0%, #e4ffe8 100%)',
                  border: '2px solid #d4f7e0'
                }}
              >
                <span className="text-3xl">🍽️</span>
                <span className="text-sm font-semibold" style={{ color: '#4a7c5a' }}>Voir les recettes disponibles</span>
              </button>
            </div>
          </div>
          <Button variant="secondary" onClick={closeAllModals} className="w-full mt-6">
            Annuler
          </Button>
        </div>
      )}

      {/* Modal liste des recettes */}
      {showRecipeListModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[600px] max-w-[700px] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            🍽️ Recettes disponibles ({getFilteredRecipes().length})
          </h2>
          
          <input
            type="text"
            placeholder="🔍 Rechercher une recette..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-xl mb-4 focus:outline-none"
            style={{ border: '2px solid #d4f7e0' }}
          />

          <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
            {getFilteredRecipes().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune recette trouvée dans cette catégorie
              </div>
            ) : (
              getFilteredRecipes().map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => showRecipeDetails(recipe)}
                  className="flex justify-between items-center p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                  style={{ 
                    background: 'linear-gradient(135deg, #f0fff5 0%, #e4ffe8 100%)',
                    border: '2px solid #d4f7e0'
                  }}
                >
                  <div>
                    <div className="font-semibold" style={{ color: '#4a7c5a' }}>{recipe.name}</div>
                    <div className="text-sm" style={{ color: '#999' }}>{recipe.continent} - {recipe.country}</div>
                  </div>
                  <div className="font-bold" style={{ color: '#4a7c5a' }}>{recipe.total_price.toLocaleString()} FCFA</div>
                </div>
              ))
            )}
          </div>

          <Button variant="secondary" onClick={backToMainModal} className="w-full">
            Retour
          </Button>
        </div>
      )}

      {/* Modal détails recette */}
      {showRecipeDetailsModal && selectedRecipe && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[600px] max-w-[700px] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            {selectedRecipe.name}
          </h2>

          <div className="space-y-5 mb-6">
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9fff7', border: '1px solid #d4f7e0' }}>
              <div className="font-bold text-sm mb-2" style={{ color: '#4a7c5a' }}>🌍 Origine</div>
              <div style={{ color: '#333' }}>{selectedRecipe.continent} - {selectedRecipe.country}</div>
            </div>

            {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9fff7', border: '1px solid #d4f7e0' }}>
                <div className="font-bold text-sm mb-2" style={{ color: '#4a7c5a' }}>🥗 Ingrédients</div>
                <div className="text-sm" style={{ color: '#333' }}>
                  {selectedRecipe.ingredients.map(ing => `${ing.name} (${ing.quantity} ${ing.unit})`).join(', ')}
                </div>
              </div>
            )}

            {selectedRecipe.instructions && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9fff7', border: '1px solid #d4f7e0' }}>
                <div className="font-bold text-sm mb-2" style={{ color: '#4a7c5a' }}>📖 Instructions</div>
                <div className="text-sm" style={{ color: '#666' }}>{selectedRecipe.instructions}</div>
              </div>
            )}

            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9fff7', border: '1px solid #d4f7e0' }}>
              <div className="font-bold text-sm mb-2" style={{ color: '#4a7c5a' }}>💰 Prix total</div>
              <div className="text-3xl font-bold text-center" style={{ color: '#4a7c5a' }}>
                {(selectedRecipe.total_price * familySize).toLocaleString()} FCFA
              </div>
              <div className="text-sm text-center mt-1" style={{ color: '#666' }}>
                Pour {familySize} personne{familySize > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={backToRecipeList} className="flex-1">
              Retour
            </Button>
            <Button variant="primary" onClick={confirmRecipeSelection} className="flex-[2]">
              Ajouter au planning
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}