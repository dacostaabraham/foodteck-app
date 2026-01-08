'use client';

import { useEffect, useState } from 'react';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';

import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

import {
  loadCustomRecipes,
  saveCustomRecipe,
  updateCustomRecipe,
  deleteCustomRecipe,
  loadPlanning,
  saveMealToPlanning,
  removeMealFromPlanning,
  loadFamilySize,
  updateFamilySize,
} from '@/services/planningService';

import {
  loadIngredientsByCategory,
  loadPlanningRecipes,
  loadPlanningMenus,
} from '@/services/planningDataService';

import type {
  Ingredient,
  Recipe,
  Meal,
  MealsByDate,
  MealType,
  MealCategory,
  FormattedMenu,
  AvailableIngredientsByCategory,
  ConsolidatedIngredient,
} from '@/services/planning';

/* -------------------------------------------------------------------------- */
/*                                   CONSTANTES                                */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                      */
/* -------------------------------------------------------------------------- */

export default function PlanningPage() {
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();

  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [familySize, setFamilySize] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [mealsByDate, setMealsByDate] = useState<MealsByDate>({});
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [predefinedRecipes, setPredefinedRecipes] = useState<Recipe[]>([]);
  const [predefinedMenus, setPredefinedMenus] = useState<FormattedMenu[]>([]);
  const [availableIngredientsByCategory, setAvailableIngredientsByCategory] =
    useState<AvailableIngredientsByCategory>({});

  /* ----------------------------- CHARGEMENT DATA ---------------------------- */

  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const ingredients = await loadIngredientsByCategory();
      if (ingredients) setAvailableIngredientsByCategory(ingredients);

      const recipes = await loadPlanningRecipes(false);
      if (recipes) {
        setPredefinedRecipes(
          recipes.map((r) => ({
            id: r.id,
            name: r.name,
            category: r.category as MealCategory,
            continent: r.continent || 'Universel',
            country: r.country || '',
            recipe: r.instructions || '',
            ingredients: r.ingredients,
            totalPrice: r.total_price,
            isCustom: r.is_custom,
            isValidated: r.is_validated,
            createdBy: r.created_by,
          }))
        );
      }

      const menus = await loadPlanningMenus();
      if (menus) {
        setPredefinedMenus(
          menus.map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description || '',
            meals: m.recipes.map((r) => ({
              type: r.type as MealCategory,
              recipeName: r.recipe_name,
            })),
            totalPrice: m.total_price,
          }))
        );
      }

      setDataLoaded(true);
    } catch (err) {
      console.error(err);
      setDataLoaded(true);
    }
  };

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
      setFamilySize(await loadFamilySize(user.id));

      const recipes = await loadCustomRecipes(user.id);
      setCustomRecipes(recipes);

      const planning = await loadPlanning(user.id);
      const mapped: MealsByDate = {};

      planning.forEach((p) => {
        if (!mapped[p.dateRepas]) {
          mapped[p.dateRepas] = {
            breakfast: [],
            lunch: [],
            snack: [],
            dinner: [],
          };
        }

        mapped[p.dateRepas][p.typeRepas].push({
          ...p.meal,
          planningId: p.id,
        });
      });

      setMealsByDate(mapped);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------- UTILITAIRES ------------------------------ */

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

  const getCurrentMeals = () =>
    mealsByDate[formatDate(selectedDate)] ?? {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: [],
    };

  const getMealTotal = (type: MealType) =>
    getCurrentMeals()[type].reduce(
      (sum, m) => sum + m.price * familySize,
      0
    );

  const getDayTotal = () =>
    getMealTotal('breakfast') +
    getMealTotal('lunch') +
    getMealTotal('snack') +
    getMealTotal('dinner');

  /* ------------------------------- ACTIONS ---------------------------------- */

  const addMeal = async (meal: Meal, mealType: MealType) => {
    const dateKey = formatDate(selectedDate);

    if (user?.id) {
      const planningId = await saveMealToPlanning(
        user.id,
        dateKey,
        mealType,
        meal,
        familySize
      );
      meal.planningId = planningId ?? undefined;
    }

    setMealsByDate((prev) => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] ?? {
          breakfast: [],
          lunch: [],
          snack: [],
          dinner: [],
        }),
        [mealType]: [...(prev[dateKey]?.[mealType] ?? []), meal],
      },
    }));
  };

  const removeMeal = async (mealType: MealType, meal: Meal) => {
    if (user?.id && meal.planningId) {
      await removeMealFromPlanning(meal.planningId, user.id);
    }

    const dateKey = formatDate(selectedDate);

    setMealsByDate((prev) => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [mealType]: prev[dateKey][mealType].filter((m) => m.id !== meal.id),
      },
    }));
  };

  /* ------------------------------- RENDER ----------------------------------- */

  if (loading || authLoading || !dataLoaded) {
    return (
      <>
        <Header />
        <main className="min-h-[400px] flex items-center justify-center">
          ⏳ Chargement du planning…
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">📅 Planning des repas</h1>

        {(['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).map(
          (type) => (
            <div key={type} className="mb-6">
              <h2 className="font-semibold text-lg mb-2">
                {MEAL_TYPE_LABELS[type]}
              </h2>

              {getCurrentMeals()[type].map((meal) => (
                <div
                  key={meal.id}
                  className="flex justify-between bg-white p-3 rounded mb-2"
                >
                  <span>
                    {CATEGORY_LABELS[meal.category]} – {meal.name}
                  </span>
                  <span>{meal.price.toLocaleString()} FCFA</span>
                  <button onClick={() => removeMeal(type, meal)}>✕</button>
                </div>
              ))}

              <div className="font-bold">
                Total : {getMealTotal(type).toLocaleString()} FCFA
              </div>
            </div>
          )
        )}

        <div className="text-xl font-bold mt-8">
          Total journée : {getDayTotal().toLocaleString()} FCFA
        </div>
      </main>

      <Footer />
    </>
  );
}