'use client';

import { useState, useEffect } from 'react';
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

// ✅ NOUVEAU: Import du service de données Supabase
import {
  loadPlanningIngredients,
  loadIngredientsByCategory,
  loadPlanningRecipes,
  loadPlanningMenus,
  PlanningIngredient,
  PlanningRecipe,
  PlanningMenu,
} from '@/services/planningDataService';

// Types TypeScript
interface Ingredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

interface Recipe {
  id: number | string;
  name: string;
  category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  ingredients: Ingredient[];
  totalPrice: number;
  continent: string;
  country: string;
  recipe: string;
  isCustom: boolean;
  isValidated: boolean;
  createdBy?: string;
}

interface Meal {
  id: number | string;
  name: string;
  category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
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

type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Goûter',
  dinner: 'Dîner'
};

const CATEGORY_LABELS: Record<string, string> = {
  'entree': 'Entrée',
  'principal': 'Principal',
  'accompagnement': 'Accompagnement',
  'dessert': 'Dessert',
  'boisson': 'Boisson'
};

// ✅ Type pour les ingrédients disponibles par catégorie
interface AvailableIngredient {
  name: string;
  unit: string;
  pricePerUnit: number;
}

interface AvailableIngredientsByCategory {
  [category: string]: AvailableIngredient[];
}

// ✅ Type pour les menus formatés
interface FormattedMenu {
  id: string;
  name: string;
  description: string;
  meals: { type: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson'; recipeName: string }[];
  totalPrice: number;
}

export default function PlanningPage() {
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const [loading, setLoading] = useState(true);

  // États principaux
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [familySize, setFamilySize] = useState(1);
  const [mealsByDate, setMealsByDate] = useState<MealsByDate>({});
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  
  // ✅ NOUVEAU: États pour les données Supabase
  const [availableIngredientsByCategory, setAvailableIngredientsByCategory] = useState<AvailableIngredientsByCategory>({});
  const [predefinedRecipes, setPredefinedRecipes] = useState<Recipe[]>([]);
  const [predefinedMenus, setPredefinedMenus] = useState<FormattedMenu[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Type pour les ingrédients consolidés modifiables
  interface ConsolidatedIngredient {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    price: number;
    pricePerUnit: number;
    isExcluded: boolean;
  }

  // États pour les ingrédients modifiables dans la modale
  const [editableIngredients, setEditableIngredients] = useState<ConsolidatedIngredient[]>([]);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<number>(0);
  
  // États des modales
  const [showMainModal, setShowMainModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showRecipeListModal, setShowRecipeListModal] = useState(false);
  const [showRecipeDetailsModal, setShowRecipeDetailsModal] = useState(false);
  const [showMenuListModal, setShowMenuListModal] = useState(false);
  const [showMenuDetailsModal, setShowMenuDetailsModal] = useState(false);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showIngredientsListModal, setShowIngredientsListModal] = useState(false);
  const [showCreateRecipeModal, setShowCreateRecipeModal] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<FormattedMenu | null>(null);
  const [menuPersonCount, setMenuPersonCount] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipePersonCount, setRecipePersonCount] = useState(1);
  const [recipeQuality, setRecipeQuality] = useState<'standard' | 'premium' | 'bio'>('standard');
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState<'all' | 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson'>('all');
  const [editingRecipeId, setEditingRecipeId] = useState<number | string | null>(null);
  
  // États pour la création de recettes
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeCategory, setNewRecipeCategory] = useState<'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson'>('principal');
  const [newRecipeContinent, setNewRecipeContinent] = useState('');
  const [newRecipeCountry, setNewRecipeCountry] = useState('');
  const [newRecipeDescription, setNewRecipeDescription] = useState('');
  const [newRecipeIngredients, setNewRecipeIngredients] = useState<Ingredient[]>([]);

  // États pour la composition
  const [currentMealType, setCurrentMealType] = useState<MealType>('breakfast');
  const [customMealName, setCustomMealName] = useState('');
  const [customMealCategory, setCustomMealCategory] = useState<'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson'>('principal');
  const [customIngredients, setCustomIngredients] = useState<Ingredient[]>([]);
  
  // États pour l'ajout d'ingrédients
  const [selectedIngredientKey, setSelectedIngredientKey] = useState('');
  const [newIngredientQuantity, setNewIngredientQuantity] = useState(1);

  // ✅ NOUVEAU: Charger les données de référence depuis Supabase
  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      console.log('📦 Chargement des données de référence depuis Supabase...');
      
      // Charger les ingrédients groupés par catégorie
      const ingredientsByCategory = await loadIngredientsByCategory();
      if (ingredientsByCategory) {
        // Transformer en format attendu par le composant
        const formattedIngredients: AvailableIngredientsByCategory = {};
        Object.entries(ingredientsByCategory).forEach(([category, ingredients]) => {
          formattedIngredients[category] = ingredients.map(ing => ({
            name: ing.name,
            unit: ing.unit,
            pricePerUnit: ing.price_per_unit
          }));
        });
        setAvailableIngredientsByCategory(formattedIngredients);
        console.log(`✅ ${Object.keys(formattedIngredients).length} catégories d'ingrédients chargées`);
      }

      // Charger les recettes prédéfinies
      const recipes = await loadPlanningRecipes(false);
      if (recipes) {
        const formattedRecipes: Recipe[] = recipes.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category as Recipe['category'],
          continent: r.continent || 'Universel',
          country: r.country || 'International',
          recipe: r.instructions || '',
          ingredients: r.ingredients.map((ing, idx) => ({
            id: idx + 1,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            price: ing.price
          })),
          totalPrice: r.total_price,
          isCustom: r.is_custom,
          isValidated: r.is_validated,
          createdBy: r.created_by || undefined
        }));
        setPredefinedRecipes(formattedRecipes);
        console.log(`✅ ${formattedRecipes.length} recettes prédéfinies chargées`);
      }

      // Charger les menus prédéfinis
      const menus = await loadPlanningMenus();
      if (menus) {
        const formattedMenus: FormattedMenu[] = menus.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description || '',
          meals: m.recipes.map(r => ({
            type: r.type as FormattedMenu['meals'][0]['type'],
            recipeName: r.recipe_name
          })),
          totalPrice: m.total_price
        }));
        setPredefinedMenus(formattedMenus);
        console.log(`✅ ${formattedMenus.length} menus prédéfinis chargés`);
      }

      setDataLoaded(true);
    } catch (error) {
      console.error('❌ Erreur chargement données de référence:', error);
      setDataLoaded(true); // Permettre de continuer même en cas d'erreur
    }
  };

  // Charger les données utilisateur depuis Supabase au montage
  useEffect(() => {
    if (authLoading) return;

    if (user?.id) {
      loadDataFromSupabase();
    } else {
      setLoading(false);
      console.log('💡 Mode invité : Utilisation locale du planning');
    }
  }, [user?.id, authLoading]);

  const loadDataFromSupabase = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Charger la taille de famille
      const loadedFamilySize = await loadFamilySize(user.id);
      setFamilySize(loadedFamilySize);

      // Charger les recettes personnalisées
      const loadedRecipes = await loadCustomRecipes(user.id);
      setCustomRecipes(loadedRecipes.map(r => ({
        ...r,
        id: r.id,
      })));

      // Charger le planning
      const loadedPlanning = await loadPlanning(user.id);
      
      // Transformer le planning en MealsByDate
      const mealsByDateTemp: MealsByDate = {};
      loadedPlanning.forEach((entry) => {
        const dateKey = entry.dateRepas;
        if (!mealsByDateTemp[dateKey]) {
          mealsByDateTemp[dateKey] = {
            breakfast: [],
            lunch: [],
            snack: [],
            dinner: [],
          };
        }
        mealsByDateTemp[dateKey][entry.typeRepas].push({
          ...entry.meal,
          planningId: entry.id,
        });
      });
      
      setMealsByDate(mealsByDateTemp);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder automatiquement la taille de famille
  useEffect(() => {
    if (user?.id && familySize > 0) {
      const timer = setTimeout(() => {
        updateFamilySize(user.id, familySize);
        console.log('✅ Taille famille sauvegardée:', familySize);
      }, 500);
      return () => clearTimeout(timer);
    } else if (!user?.id && familySize > 0) {
      console.log('💡 Mode invité : Taille famille en mémoire:', familySize);
    }
  }, [familySize, user?.id]);
  
  // Fonction pour obtenir l'ingrédient sélectionné depuis sa clé "Catégorie|Nom"
  const getSelectedIngredient = () => {
    if (!selectedIngredientKey) return null;
    const [category, name] = selectedIngredientKey.split('|');
    const categoryIngredients = availableIngredientsByCategory[category];
    return categoryIngredients?.find(ing => ing.name === name) || null;
  };
  
  // Calculer le prix automatiquement
  const calculateIngredientPrice = () => {
    const ingredient = getSelectedIngredient();
    if (!ingredient) return 0;
    return Math.round(ingredient.pricePerUnit * newIngredientQuantity);
  };

  // Fonctions utilitaires
  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDayName = (date: Date): string => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[date.getDay()];
  };

  const getDayNameFull = (date: Date): string => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
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

  const isDateInPast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const isDateKeyInPast = (dateKey: string): boolean => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return isDateInPast(date);
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

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const selectDate = (date: Date) => {
    if (isDateInPast(date)) return;
    setSelectedDate(new Date(date));
  };

  // Récupérer les repas de la date sélectionnée
  const getCurrentMeals = () => {
    if (!selectedDate) {
      return { breakfast: [], lunch: [], snack: [], dinner: [] };
    }
    const dateKey = formatDate(selectedDate);
    return mealsByDate[dateKey] || { breakfast: [], lunch: [], snack: [], dinner: [] };
  };

  // Vérifier si une date a des repas
  const dateHasMeals = (date: Date): boolean => {
    const dateKey = formatDate(date);
    const meals = mealsByDate[dateKey];
    if (!meals) return false;
    return meals.breakfast.length > 0 || meals.lunch.length > 0 || meals.snack.length > 0 || meals.dinner.length > 0;
  };

  // Calculer le total d'un type de repas
  const getMealTotal = (mealType: MealType): number => {
    const meals = getCurrentMeals()[mealType];
    return meals.reduce((sum, meal) => sum + (meal.price * familySize), 0);
  };

  // Calculer le total de la journée
  const getDayTotal = (): number => {
    return getMealTotal('breakfast') + getMealTotal('lunch') + getMealTotal('snack') + getMealTotal('dinner');
  };

  // Gestion des modales
  const openAddModal = (mealType: MealType) => {
    if (!selectedDate) {
      alert('Veuillez d\'abord sélectionner une date dans le calendrier');
      return;
    }
    setCurrentMealType(mealType);
    setShowMainModal(true);
  };

  const closeAllModals = () => {
    setShowMainModal(false);
    setShowComposeModal(false);
    setShowRecipeListModal(false);
    setShowRecipeDetailsModal(false);
    setShowMenuListModal(false);
    setShowMenuDetailsModal(false);
    setShowIngredientModal(false);
    setShowIngredientsListModal(false);
    setShowCreateRecipeModal(false);
    setCustomMealName('');
    setCustomMealCategory('principal');
    setCustomIngredients([]);
    setSelectedIngredientKey('');
    setNewIngredientQuantity(1);
    setSelectedMenu(null);
    setMenuPersonCount(1);
    setSelectedRecipe(null);
    setRecipePersonCount(1);
    setRecipeQuality('standard');
    setRecipeSearchQuery('');
    setRecipeCategoryFilter('all');
    setNewRecipeName('');
    setNewRecipeCategory('principal');
    setNewRecipeContinent('');
    setNewRecipeCountry('');
    setNewRecipeDescription('');
    setNewRecipeIngredients([]);
    setEditingRecipeId(null);
  };

  const openComposeModal = () => {
    setShowMainModal(false);
    setShowComposeModal(true);
  };

  const openRecipeListModal = () => {
    setShowMainModal(false);
    setShowRecipeListModal(true);
  };

  const openRecipeDetailsModal = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRecipePersonCount(1);
    setRecipeQuality('standard');
    setShowRecipeListModal(false);
    setShowRecipeDetailsModal(true);
  };

  const backToRecipeList = () => {
    setShowRecipeDetailsModal(false);
    setShowRecipeListModal(true);
    setSelectedRecipe(null);
    setRecipePersonCount(1);
    setRecipeQuality('standard');
  };

  const openCreateRecipeModal = () => {
    setShowRecipeListModal(false);
    setShowCreateRecipeModal(true);
  };

  const openEditRecipeModal = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setNewRecipeName(recipe.name);
    setNewRecipeCategory(recipe.category);
    setNewRecipeContinent(recipe.continent);
    setNewRecipeCountry(recipe.country);
    setNewRecipeDescription(recipe.recipe);
    setNewRecipeIngredients([...recipe.ingredients]);
    setShowRecipeListModal(false);
    setShowCreateRecipeModal(true);
  };

  const backFromCreateRecipe = () => {
    setShowCreateRecipeModal(false);
    setShowRecipeListModal(true);
    setEditingRecipeId(null);
  };

  const openMenuListModal = () => {
    setShowMainModal(false);
    setShowMenuListModal(true);
  };

  const openMenuDetailsModal = (menu: FormattedMenu) => {
    setSelectedMenu(menu);
    setMenuPersonCount(1);
    setShowMenuListModal(false);
    setShowMenuDetailsModal(true);
  };

  const backToMenuList = () => {
    setShowMenuDetailsModal(false);
    setShowMenuListModal(true);
    setSelectedMenu(null);
    setMenuPersonCount(1);
  };

  const backToMainModal = () => {
    setShowComposeModal(false);
    setShowRecipeListModal(false);
    setShowMenuListModal(false);
    setShowMainModal(true);
  };

  // Gestion des ingrédients personnalisés
  const openIngredientModal = () => {
    setShowIngredientModal(true);
  };

  const closeIngredientModal = () => {
    setShowIngredientModal(false);
    setSelectedIngredientKey('');
    setNewIngredientQuantity(1);
  };

  const addCustomIngredient = () => {
    const ingredient = getSelectedIngredient();
    if (!ingredient || newIngredientQuantity <= 0) {
      alert('Veuillez sélectionner un ingrédient et entrer une quantité valide');
      return;
    }

    const newIngredient: Ingredient = {
      id: Date.now(),
      name: ingredient.name,
      quantity: newIngredientQuantity,
      unit: ingredient.unit,
      price: calculateIngredientPrice()
    };

    if (showComposeModal) {
      setCustomIngredients([...customIngredients, newIngredient]);
    } else if (showCreateRecipeModal) {
      setNewRecipeIngredients([...newRecipeIngredients, newIngredient]);
    }
    
    closeIngredientModal();
  };

  const removeIngredientFromNewRecipe = (id: number) => {
    setNewRecipeIngredients(newRecipeIngredients.filter(ing => ing.id !== id));
  };

  const calculateNewRecipePrice = (): number => {
    return newRecipeIngredients.reduce((sum, ing) => sum + ing.price, 0);
  };

  const saveNewRecipe = async () => {
    if (!newRecipeName || newRecipeIngredients.length === 0) {
      alert('Veuillez donner un nom à la recette et ajouter au moins un ingrédient');
      return;
    }

    if (!newRecipeContinent || !newRecipeCountry) {
      alert('Veuillez renseigner l\'origine de la recette (continent et pays)');
      return;
    }

    if (!newRecipeDescription) {
      alert('Veuillez ajouter une description de la recette');
      return;
    }

    const recipeData = {
      name: newRecipeName,
      category: newRecipeCategory,
      continent: newRecipeContinent,
      country: newRecipeCountry,
      recipe: newRecipeDescription,
      ingredients: newRecipeIngredients,
      totalPrice: calculateNewRecipePrice(),
      isCustom: true,
      isValidated: false,
      createdBy: user?.id || 'guest',
    };

    if (!user?.id) {
      const newRecipe: Recipe = {
        id: editingRecipeId || Date.now(),
        ...recipeData
      };
      
      if (editingRecipeId) {
        setCustomRecipes(prev => prev.map(r => r.id === editingRecipeId ? newRecipe : r));
      } else {
        setCustomRecipes(prev => [...prev, newRecipe]);
      }
      
      alert('⚠️ Mode invité : Vos recettes ne seront pas sauvegardées. Créez un compte pour les conserver !');
      closeAllModals();
      return;
    }

    if (editingRecipeId) {
      const success = await updateCustomRecipe(editingRecipeId as string, user.id, recipeData);
      if (success) {
        alert('Votre recette a été modifiée avec succès !');
        await loadDataFromSupabase();
      } else {
        alert('Erreur lors de la modification de la recette');
      }
    } else {
      const recipeId = await saveCustomRecipe(user.id, recipeData);
      if (recipeId) {
        alert('Votre recette a été créée avec succès !');
        await loadDataFromSupabase();
      } else {
        alert('Erreur lors de la création de la recette');
      }
    }
    
    closeAllModals();
  };

  const deleteCustomRecipeHandler = async (recipeId: number | string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) return;
    
    if (!user?.id) {
      setCustomRecipes(prev => prev.filter(r => r.id !== recipeId));
      console.log('💡 Mode invité : Recette supprimée de la mémoire');
      return;
    }

    const success = await deleteCustomRecipe(recipeId as string, user.id);
    if (success) {
      await loadDataFromSupabase();
    } else {
      alert('Erreur lors de la suppression de la recette');
    }
  };

  const removeCustomIngredient = (id: number) => {
    setCustomIngredients(customIngredients.filter(ing => ing.id !== id));
  };

  const calculateCustomMealPrice = (): number => {
    return customIngredients.reduce((sum, ing) => sum + ing.price, 0);
  };

  const confirmCustomMeal = async () => {
    if (!customMealName || customIngredients.length === 0) {
      alert('Veuillez donner un nom au repas et ajouter au moins un ingrédient');
      return;
    }

    if (!selectedDate) return;
    
    const dateKey = formatDate(selectedDate);
    const newMeal: Meal = {
      id: Date.now(),
      name: customMealName,
      category: customMealCategory,
      price: calculateCustomMealPrice(),
      ingredients: customIngredients,
      isCustom: true
    };
    
    if (!user?.id) {
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
      
      console.log('💡 Mode invité : Repas ajouté en mémoire');
      closeAllModals();
      return;
    }

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
    } else {
      alert('Erreur lors de la sauvegarde du repas');
    }

    closeAllModals();
  };

  // Ajouter une recette depuis la bibliothèque
  const addRecipeToMeal = async (recipe: Recipe, personCount: number, quality: 'standard' | 'premium' | 'bio') => {
    if (!selectedDate) return;

    const dateKey = formatDate(selectedDate);
    const qualityMultiplier = quality === 'standard' ? 1 : quality === 'premium' ? 1.5 : 2;
    
    const newMeal: Meal = {
      id: Date.now(),
      name: recipe.name,
      category: recipe.category,
      price: Math.round(recipe.totalPrice * personCount * qualityMultiplier),
      ingredients: recipe.ingredients.map(ing => ({
        ...ing,
        quantity: ing.quantity * personCount,
        price: Math.round(ing.price * personCount * qualityMultiplier)
      })),
      isCustom: false
    };

    if (!user?.id) {
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
      
      console.log('💡 Mode invité : Recette ajoutée en mémoire');
      closeAllModals();
      return;
    }

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
    } else {
      alert('Erreur lors de la sauvegarde du repas');
    }

    closeAllModals();
  };

  // ✅ MODIFIÉ: Ajouter un menu complet (recherche par nom au lieu de ID)
  const addCompleteMenu = async (menu: FormattedMenu, personCount: number) => {
    if (!selectedDate) return;

    const dateKey = formatDate(selectedDate);
    const mealTypeForMenu = currentMealType;
    
    // Toutes les recettes disponibles (prédéfinies + custom)
    const allRecipes = [...predefinedRecipes, ...customRecipes];
    
    if (!user?.id) {
      const mealsToAdd: Meal[] = [];
      
      for (const mealDef of menu.meals) {
        // ✅ Recherche par nom au lieu de ID
        const recipe = allRecipes.find(r => r.name === mealDef.recipeName);
        if (recipe) {
          const meal: Meal = {
            id: Date.now() + Math.random(),
            name: recipe.name,
            category: recipe.category,
            price: recipe.totalPrice * personCount,
            ingredients: recipe.ingredients.map(ing => ({
              ...ing,
              quantity: ing.quantity * personCount,
              price: ing.price * personCount
            })),
            isCustom: false
          };
          mealsToAdd.push(meal);
        }
      }
      
      if (mealsToAdd.length > 0) {
        setMealsByDate(prev => {
          const dateMeals = prev[dateKey] || { breakfast: [], lunch: [], snack: [], dinner: [] };
          return {
            ...prev,
            [dateKey]: {
              ...dateMeals,
              [mealTypeForMenu]: [...dateMeals[mealTypeForMenu], ...mealsToAdd]
            }
          };
        });
      }
      
      console.log('💡 Mode invité : Menu ajouté en mémoire');
      closeAllModals();
      return;
    }

    // Mode connecté
    const mealsToAdd: Meal[] = [];

    for (const mealDef of menu.meals) {
      // ✅ Recherche par nom au lieu de ID
      const recipe = allRecipes.find(r => r.name === mealDef.recipeName);
      if (recipe) {
        const meal: Meal = {
          id: Date.now() + Math.random(),
          name: recipe.name,
          category: recipe.category,
          price: recipe.totalPrice * personCount,
          ingredients: recipe.ingredients.map(ing => ({
            ...ing,
            quantity: ing.quantity * personCount,
            price: ing.price * personCount
          })),
          isCustom: false
        };

        const planningId = await saveMealToPlanning(
          user.id,
          dateKey,
          mealTypeForMenu,
          meal,
          familySize
        );

        if (planningId) {
          meal.planningId = planningId;
          mealsToAdd.push(meal);
        }
      }
    }

    if (mealsToAdd.length > 0) {
      setMealsByDate(prev => {
        const dateMeals = prev[dateKey] || { breakfast: [], lunch: [], snack: [], dinner: [] };
        return {
          ...prev,
          [dateKey]: {
            ...dateMeals,
            [mealTypeForMenu]: [...dateMeals[mealTypeForMenu], ...mealsToAdd]
          }
        };
      });
    }

    closeAllModals();
  };

  const removeMeal = async (mealType: MealType, mealId: number | string) => {
    if (!selectedDate) return;

    const dateKey = formatDate(selectedDate);
    const meal = mealsByDate[dateKey]?.[mealType].find(m => m.id === mealId);
    
    if (user?.id && meal?.planningId) {
      const success = await removeMealFromPlanning(meal.planningId, user.id);
      if (!success) {
        alert('Erreur lors de la suppression du repas');
        return;
      }
      console.log('✅ Repas supprimé de Supabase');
    } else if (!user?.id) {
      console.log('💡 Mode invité : Repas supprimé de la mémoire');
    }

    setMealsByDate(prev => {
      const dateMeals = prev[dateKey];
      if (!dateMeals) return prev;

      return {
        ...prev,
        [dateKey]: {
          ...dateMeals,
          [mealType]: dateMeals[mealType].filter(meal => meal.id !== mealId)
        }
      };
    });
  };

  // Générer la liste consolidée d'ingrédients (UNIQUEMENT dates futures)
  const generateIngredientsList = (): ConsolidatedIngredient[] => {
    const allIngredients: { [key: string]: { quantity: number; unit: string; price: number; pricePerUnit: number } } = {};

    Object.entries(mealsByDate).forEach(([dateKey, dateMeals]) => {
      if (isDateKeyInPast(dateKey)) {
        return;
      }

      Object.values(dateMeals).forEach(meals => {
        meals.forEach(meal => {
          if (meal.ingredients) {
            meal.ingredients.forEach(ing => {
              const key = `${ing.name}-${ing.unit}`;
              const pricePerUnit = ing.quantity > 0 ? ing.price / ing.quantity : 0;
              
              if (allIngredients[key]) {
                allIngredients[key].quantity += ing.quantity * familySize;
                allIngredients[key].price += ing.price * familySize;
              } else {
                allIngredients[key] = {
                  quantity: ing.quantity * familySize,
                  unit: ing.unit,
                  price: ing.price * familySize,
                  pricePerUnit: pricePerUnit
                };
              }
            });
          }
        });
      });
    });

    return Object.entries(allIngredients).map(([key, data]) => ({
      id: key,
      name: key.split('-')[0],
      quantity: data.quantity,
      unit: data.unit,
      price: data.price,
      pricePerUnit: data.pricePerUnit,
      isExcluded: false
    }));
  };

  const openIngredientsListModal = () => {
    const ingredients = generateIngredientsList();
    setEditableIngredients(ingredients);
    setShowIngredientsListModal(true);
  };

  const startEditingIngredient = (id: string, currentQuantity: number) => {
    setEditingIngredientId(id);
    setTempQuantity(currentQuantity);
  };

  const saveIngredientQuantity = (id: string) => {
    setEditableIngredients(prev => prev.map(ing => {
      if (ing.id === id) {
        const newPrice = Math.round(ing.pricePerUnit * tempQuantity);
        return { ...ing, quantity: tempQuantity, price: newPrice };
      }
      return ing;
    }));
    setEditingIngredientId(null);
    setTempQuantity(0);
  };

  const cancelEditingIngredient = () => {
    setEditingIngredientId(null);
    setTempQuantity(0);
  };

  const excludeIngredient = (id: string) => {
    setEditableIngredients(prev => prev.map(ing => 
      ing.id === id ? { ...ing, isExcluded: true } : ing
    ));
  };

  const restoreIngredient = (id: string) => {
    setEditableIngredients(prev => prev.map(ing => 
      ing.id === id ? { ...ing, isExcluded: false } : ing
    ));
  };

  const calculateActiveIngredientsTotal = (): number => {
    return editableIngredients
      .filter(ing => !ing.isExcluded)
      .reduce((sum, ing) => sum + ing.price, 0);
  };

  const getActiveIngredients = (): ConsolidatedIngredient[] => {
    return editableIngredients.filter(ing => !ing.isExcluded);
  };

  const weekDates = getWeekDates(currentDate);
  const currentMeals = getCurrentMeals();
  const consolidatedIngredients = generateIngredientsList();
  const totalIngredientsPrice = consolidatedIngredients.reduce((sum, ing) => sum + ing.price, 0);

  const [isOrdering, setIsOrdering] = useState(false);

  const handleOrderIngredients = async () => {
    const activeIngredients = getActiveIngredients();
    
    if (activeIngredients.length === 0) {
      alert('Aucun ingrédient à commander');
      return;
    }

    setIsOrdering(true);
    
    try {
      for (const ing of activeIngredients) {
        await addItem({
          product_name: ing.name,
          product_type: 'ingredient',
          quantity: Math.ceil(ing.quantity),
          unit: ing.unit,
          quality: 'Standard',
          prix_unitaire: Math.round(ing.pricePerUnit),
          metadata: {
            category: 'Planning',
            description: `Ingrédient pour planning (${ing.quantity.toFixed(2)} ${ing.unit})`,
          }
        });
      }

      const total = calculateActiveIngredientsTotal();
      alert(`✅ ${activeIngredients.length} ingrédients ajoutés au panier !\n\n💰 Total: ${total.toLocaleString()} FCFA\n\n👉 Allez dans votre panier pour finaliser la commande.`);
      setShowIngredientsListModal(false);
      
    } catch (error) {
      console.error('❌ Erreur ajout au panier:', error);
      alert('❌ Erreur lors de l\'ajout au panier. Veuillez réessayer.');
    } finally {
      setIsOrdering(false);
    }
  };

  // ✅ MODIFIÉ: Condition de chargement incluant dataLoaded
  if (loading || authLoading || !dataLoaded) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #d4c5f0 0%, #c9b5e8 100%)' }}>
        <Header />
        <main className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-xl font-semibold" style={{ color: '#5a4a7c' }}>
              {!dataLoaded ? 'Chargement des recettes...' : authLoading ? 'Initialisation...' : 'Chargement de vos planifications...'}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #d4c5f0 0%, #c9b5e8 100%)' }}>
      <Header />

      {/* Bannière d'information pour les utilisateurs non connectés */}
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
                <div className="font-bold text-base" style={{ color: '#d97706' }}>
                  Mode invité
                </div>
                <div className="text-sm" style={{ color: '#92400e' }}>
                  Vos plannings ne seront pas sauvegardés. Créez un compte pour les conserver !
                </div>
              </div>
            </div>
            <a href="/inscription">
              <button
                className="px-6 py-2 rounded-xl font-semibold text-sm text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
              >
                ✨ Créer un compte
              </button>
            </a>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* En-tête de page */}
        <div className="rounded-3xl shadow-2xl p-8 mb-8 text-white" style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📅</span>
              <h1 className="text-3xl font-bold">Planning des Repas</h1>
            </div>
            <p className="text-lg opacity-95 text-center max-w-3xl">
              Planifiez vos repas et générez automatiquement votre liste de courses • {predefinedRecipes.length} recettes disponibles
            </p>
          </div>
        </div>

        {/* Section famille */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <span className="font-medium" style={{ color: '#333' }}>Nombre de personnes dans la famille :</span>
            <input
              type="number"
              value={familySize}
              onChange={(e) => setFamilySize(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-20 px-3 py-2 rounded-xl text-center font-semibold focus:outline-none"
              style={{ border: '2px solid #9b7ec9', backgroundColor: 'white' }}
            />
          </div>
        </div>

        {/* Navigation du calendrier */}
        <div className="flex justify-center items-center gap-8 mb-6">
          <Button variant="secondary" onClick={() => navigateMonth(-1)}>
            ◀
          </Button>
          <div className="text-center text-xl font-bold text-gray-800 min-w-[200px]">
            {getMonthNameFull(currentDate)} {currentDate.getFullYear()}
          </div>
          <Button variant="secondary" onClick={() => navigateMonth(1)}>
            ▶
          </Button>
        </div>

        {/* Calendrier */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-4 justify-center">
            <button
              onClick={() => navigateWeek(-1)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
              style={{ 
                backgroundColor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                color: '#5a4a7c'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5a4a7c';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#5a4a7c';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span className="text-xl">◀</span>
            </button>

            <div className="flex gap-4">
              {weekDates.map((date, index) => {
                const isToday = isSameDate(date, new Date());
                const isSelected = isSameDate(date, selectedDate);
                const hasMeals = dateHasMeals(date);
                const isPast = isDateInPast(date);

                return (
                  <div
                    key={index}
                    onClick={() => selectDate(date)}
                    className="flex flex-col items-center min-w-[80px] p-4 rounded-xl cursor-pointer transition-all duration-200"
                    style={{
                      backgroundColor: isSelected ? '#5a4a7c' : isToday ? '#c9b5e8' : isPast ? '#f5f5f5' : '#fafafa',
                      color: isSelected || isToday ? 'white' : isPast ? '#999' : '#333',
                      transform: isSelected ? 'translateY(-3px) scale(1.05)' : 'translateY(0)',
                      boxShadow: isSelected ? '0 4px 12px rgba(90, 74, 124, 0.4)' : 'none',
                      opacity: isPast ? 0.6 : 1,
                      cursor: isPast ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isPast) {
                        e.currentTarget.style.backgroundColor = '#e8dcf7';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isPast) {
                        e.currentTarget.style.backgroundColor = isToday ? '#c9b5e8' : '#fafafa';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <div className="text-xs font-semibold uppercase mb-2" style={{ color: isSelected || isToday ? 'white' : '#999' }}>
                      {getDayName(date)}
                    </div>
                    <div className="text-2xl font-bold" style={{ color: isSelected || isToday ? 'white' : isPast ? '#999' : '#333' }}>
                      {date.getDate()}
                    </div>
                    <div className="text-xs mt-1" style={{ color: isSelected || isToday ? 'white' : '#999' }}>
                      {getMonthName(date)}
                    </div>
                    {hasMeals && (
                      <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: isSelected || isToday ? 'white' : '#ff4444' }} />
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => navigateWeek(1)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
              style={{ 
                backgroundColor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                color: '#5a4a7c'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5a4a7c';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#5a4a7c';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span className="text-xl">▶</span>
            </button>
          </div>

          <div className="text-center mt-4 font-semibold text-gray-700">
            {getDayName(selectedDate)} {selectedDate.getDate()} {getMonthName(selectedDate)} {selectedDate.getFullYear()}
            {isDateInPast(selectedDate) && (
              <span className="ml-2 text-red-500 text-sm">⚠️ Date passée</span>
            )}
          </div>
        </div>

        {/* Section des repas */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden mb-8">
          {(['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).map((mealType, index) => (
            <div
              key={mealType}
              className="grid grid-cols-[150px_1fr_130px] min-h-[70px]"
              style={{ borderBottom: index < 3 ? '2px solid #f0e8ff' : 'none' }}
            >
              <div className="text-white flex items-center justify-center font-semibold text-sm px-2 py-5" style={{ background: 'linear-gradient(135deg, #b19cd9 0%, #9b7ec9 100%)' }}>
                {MEAL_TYPE_LABELS[mealType]}
              </div>
              <div className="p-6 flex flex-col gap-3">
                {currentMeals[mealType].length === 0 ? (
                  <span
                    onClick={() => openAddModal(mealType)}
                    className="italic text-sm cursor-pointer transition-all"
                    style={{ color: isDateInPast(selectedDate) ? '#ccc' : '#999' }}
                    onMouseEnter={(e) => {
                      if (!isDateInPast(selectedDate)) {
                        e.currentTarget.style.color = '#5a4a7c';
                        e.currentTarget.style.fontWeight = '600';
                        e.currentTarget.style.textDecoration = 'underline';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = isDateInPast(selectedDate) ? '#ccc' : '#999';
                      e.currentTarget.style.fontWeight = 'normal';
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {isDateInPast(selectedDate) ? 'Date passée' : `+ Ajouter ${mealType === 'snack' ? 'un goûter' : 'un plat'}`}
                  </span>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      {currentMeals[mealType].map((meal) => {
                        const categoryLabel = CATEGORY_LABELS[meal.category];
                        
                        return (
                          <div key={meal.id} className="flex items-center gap-3">
                            <div
                              className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-medium flex-1"
                              style={{ 
                                background: 'linear-gradient(135deg, #f5f0ff 0%, #ede4ff 100%)',
                                color: '#5a4a7c',
                                border: '1px solid #e0d4f7'
                              }}
                            >
                              <span className="font-bold">{categoryLabel} :</span>
                              <span>{meal.name} ({meal.price.toLocaleString()} FCFA)</span>
                              <button
                                onClick={() => removeMeal(mealType, meal.id)}
                                className="text-white w-5 h-5 rounded-full text-xs flex items-center justify-center transition-all ml-auto"
                                style={{ backgroundColor: '#ef4444' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#dc2626';
                                  e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#ef4444';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {!isDateInPast(selectedDate) && (
                      <span
                        onClick={() => openAddModal(mealType)}
                        className="italic text-sm cursor-pointer transition-all"
                        style={{ color: '#999' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#5a4a7c';
                          e.currentTarget.style.fontWeight = '600';
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#999';
                          e.currentTarget.style.fontWeight = 'normal';
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        + Ajouter {mealType === 'snack' ? 'un autre goûter' : 'un autre plat'}
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center justify-center font-bold text-sm px-3 py-5" style={{ backgroundColor: '#fafafa', color: '#5a4a7c' }}>
                {getMealTotal(mealType).toLocaleString()} FCFA
              </div>
            </div>
          ))}
          <div className="text-white p-6 flex justify-between items-center font-bold" style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}>
            <span>Total de la journée</span>
            <span>{getDayTotal().toLocaleString()} FCFA</span>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-center gap-4">
          <button
            onClick={openIngredientsListModal}
            className="px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(155, 126, 201, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            }}
          >
            📋 Liste des ingrédients
          </button>
        </div>
      </main>

      <Footer />

      {/* Modal overlay */}
      {(showMainModal || showComposeModal || showRecipeListModal || showRecipeDetailsModal || showMenuListModal || showMenuDetailsModal || showIngredientModal || showIngredientsListModal || showCreateRecipeModal) && (
        <div
          onClick={closeAllModals}
          className="fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* Modal principal - Choix du type d'ajout */}
      {showMainModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[500px]" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            Ajouter un repas - {MEAL_TYPE_LABELS[currentMealType]}
          </h2>
          <div className="space-y-4">
            <button
              onClick={openComposeModal}
              className="w-full p-6 rounded-xl cursor-pointer flex flex-col items-center gap-3 transition-all"
              style={{ 
                background: 'linear-gradient(135deg, #f5f0ff 0%, #ede4ff 100%)',
                border: '2px solid #e0d4f7'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(155, 126, 201, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span className="text-3xl">🍳</span>
              <span className="text-sm font-semibold" style={{ color: '#5a4a7c' }}>Composer un repas personnalisé</span>
            </button>

            <button
              onClick={openRecipeListModal}
              className="w-full p-6 rounded-xl cursor-pointer flex flex-col items-center gap-3 transition-all"
              style={{ 
                background: 'linear-gradient(135deg, #f5f0ff 0%, #ede4ff 100%)',
                border: '2px solid #e0d4f7'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(155, 126, 201, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span className="text-3xl">📖</span>
              <span className="text-sm font-semibold" style={{ color: '#5a4a7c' }}>Choisir depuis la bibliothèque de recettes</span>
            </button>

            <button
              onClick={openMenuListModal}
              className="w-full p-6 rounded-xl cursor-pointer flex flex-col items-center gap-3 transition-all"
              style={{ 
                background: 'linear-gradient(135deg, #f5f0ff 0%, #ede4ff 100%)',
                border: '2px solid #e0d4f7'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(155, 126, 201, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span className="text-3xl">🍽️</span>
              <span className="text-sm font-semibold" style={{ color: '#5a4a7c' }}>Choisir un menu complet</span>
            </button>
          </div>
          <Button variant="secondary" onClick={closeAllModals} className="w-full mt-6">
            Annuler
          </Button>
        </div>
      )}

      {/* Modal composition personnalisée */}
      {showComposeModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[600px] max-w-[700px] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            🍳 Composer un repas personnalisé
          </h2>

          <div className="space-y-5 mb-6">
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Nom du repas</label>
              <input
                type="text"
                value={customMealName}
                onChange={(e) => setCustomMealName(e.target.value)}
                placeholder="Ex: Mon poulet spécial"
                className="w-full px-4 py-3 rounded-xl focus:outline-none"
                style={{ border: '2px solid #e0d4f7' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
              />
            </div>

            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Catégorie</label>
              <select
                value={customMealCategory}
                onChange={(e) => setCustomMealCategory(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none"
                style={{ border: '2px solid #e0d4f7' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
              >
                <option value="entree">Entrée</option>
                <option value="principal">Principal</option>
                <option value="accompagnement">Accompagnement</option>
                <option value="dessert">Dessert</option>
                <option value="boisson">Boisson</option>
              </select>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm" style={{ color: '#5a4a7c' }}>Ingrédients</span>
                <button
                  onClick={openIngredientModal}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                  style={{
                    backgroundColor: '#5a4a7c',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a6a9c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5a4a7c'}
                >
                  + Ajouter
                </button>
              </div>

              {customIngredients.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#999' }}>
                  Aucun ingrédient ajouté
                </p>
              ) : (
                <div className="space-y-2">
                  {customIngredients.map((ing) => (
                    <div key={ing.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <div className="font-semibold" style={{ color: '#333' }}>{ing.name}</div>
                        <div className="text-sm" style={{ color: '#666' }}>
                          {ing.quantity} {ing.unit} - {ing.price.toLocaleString()} FCFA
                        </div>
                      </div>
                      <button
                        onClick={() => removeCustomIngredient(ing.id)}
                        className="text-white w-6 h-6 rounded-full text-sm flex items-center justify-center transition-all"
                        style={{ backgroundColor: '#ef4444' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ef4444';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>💰 Prix total</div>
              <div className="text-2xl font-bold text-center" style={{ color: '#5a4a7c' }}>
                {calculateCustomMealPrice().toLocaleString()} FCFA
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={backToMainModal} className="flex-1">
              Retour
            </Button>
            <Button variant="primary" onClick={confirmCustomMeal} className="flex-[2]">
              Ajouter ce repas
            </Button>
          </div>
        </div>
      )}

      {/* Modal ajout d'ingrédient */}
      {showIngredientModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-[60] min-w-[500px]" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            Ajouter un ingrédient
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Choix d'ingrédients</label>
              <select
                value={selectedIngredientKey}
                onChange={(e) => setSelectedIngredientKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none"
                style={{ border: '2px solid #e0d4f7' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
              >
                <option value="">Sélectionner un ingrédient</option>
                
                {/* ✅ DYNAMIQUE: Afficher les catégories depuis Supabase */}
                {Object.entries(availableIngredientsByCategory).map(([category, ingredients]) => (
                  <optgroup key={category} label={category}>
                    {ingredients.map((ing, idx) => (
                      <option key={idx} value={`${category}|${ing.name}`}>
                        {ing.name} ({ing.pricePerUnit} FCFA/{ing.unit})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Quantité</label>
                <input
                  type="number"
                  value={newIngredientQuantity}
                  onChange={(e) => setNewIngredientQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-3 rounded-xl focus:outline-none"
                  style={{ border: '2px solid #e0d4f7' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
                />
              </div>

              <div>
                <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Unité</label>
                <input
                  type="text"
                  value={getSelectedIngredient()?.unit || '-'}
                  disabled
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ 
                    border: '2px solid #e0d4f7',
                    backgroundColor: '#f5f5f5',
                    color: '#999',
                    cursor: 'not-allowed'
                  }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color: '#5a4a7c' }}>Prix calculé</span>
                <span className="font-bold text-xl" style={{ color: '#5a4a7c' }}>
                  {calculateIngredientPrice().toLocaleString()} FCFA
                </span>
              </div>
              {getSelectedIngredient() && (
                <div className="text-xs mt-2 text-center" style={{ color: '#999' }}>
                  {newIngredientQuantity} {getSelectedIngredient()?.unit} × {getSelectedIngredient()?.pricePerUnit} FCFA/{getSelectedIngredient()?.unit}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={closeIngredientModal} className="flex-1">
              Annuler
            </Button>
            <Button 
              variant="primary" 
              onClick={addCustomIngredient} 
              className="flex-[2]"
              disabled={!selectedIngredientKey || newIngredientQuantity <= 0}
            >
              Ajouter
            </Button>
          </div>
        </div>
      )}

      {/* Modal bibliothèque de recettes */}
      {showRecipeListModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[700px] max-w-[800px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            📖 Bibliothèque de recettes ({predefinedRecipes.length + customRecipes.length})
          </h2>

          {/* Barre de recherche */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Rechercher un plat..."
              value={recipeSearchQuery}
              onChange={(e) => setRecipeSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-xl focus:outline-none"
              style={{ border: '2px solid #e0d4f7' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
            />
          </div>

          {/* Filtre par catégorie */}
          <div className="mb-6">
            <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Catégorie</label>
            <select
              value={recipeCategoryFilter}
              onChange={(e) => setRecipeCategoryFilter(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl focus:outline-none"
              style={{ border: '2px solid #e0d4f7' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
            >
              <option value="all">Toutes les catégories</option>
              <option value="entree">Entrée</option>
              <option value="principal">Principal</option>
              <option value="accompagnement">Accompagnement</option>
              <option value="dessert">Dessert</option>
              <option value="boisson">Boisson</option>
            </select>
          </div>

          {/* Liste des recettes */}
          <div className="space-y-2 mb-6 max-h-[450px] overflow-y-auto">
            {(() => {
              const allRecipes = [...predefinedRecipes, ...customRecipes];
              
              const filteredRecipes = allRecipes
                .filter(recipe => {
                  if (recipeCategoryFilter !== 'all' && recipe.category !== recipeCategoryFilter) {
                    return false;
                  }
                  
                  if (!recipeSearchQuery) return true;
                  const searchLower = recipeSearchQuery.toLowerCase();
                  return (
                    recipe.name.toLowerCase().includes(searchLower) ||
                    (recipe.country && recipe.country.toLowerCase().includes(searchLower)) ||
                    (recipe.continent && recipe.continent.toLowerCase().includes(searchLower))
                  );
                })
                .sort((a, b) => a.name.localeCompare(b.name));

              if (filteredRecipes.length === 0) {
                return (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">🔍</span>
                    <p className="text-lg" style={{ color: '#999' }}>
                      Aucune recette trouvée
                    </p>
                  </div>
                );
              }

              return filteredRecipes.map((recipe) => {
                const description = (recipe.continent && recipe.country && recipe.continent !== 'Universel') 
                  ? `${recipe.continent}, ${recipe.country}`
                  : 'Standard';

                return (
                  <div
                    key={recipe.id}
                    className="flex justify-between items-center p-4 rounded-xl cursor-pointer transition-all"
                    style={{ 
                      background: recipe.isCustom 
                        ? 'linear-gradient(135deg, #fff4e6 0%, #ffe4cc 100%)'
                        : 'linear-gradient(135deg, #f5f0ff 0%, #ede4ff 100%)',
                      border: recipe.isCustom ? '2px solid #ffa726' : '2px solid #e0d4f7'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = recipe.isCustom 
                        ? 'linear-gradient(135deg, #ffe4cc 0%, #ffd4b3 100%)'
                        : 'linear-gradient(135deg, #ede4ff 0%, #e0d4f7 100%)';
                      e.currentTarget.style.borderColor = recipe.isCustom ? '#ff9800' : '#9b7ec9';
                      e.currentTarget.style.transform = 'translateX(5px)';
                      e.currentTarget.style.boxShadow = recipe.isCustom 
                        ? '0 4px 12px rgba(255, 167, 38, 0.3)'
                        : '0 4px 12px rgba(155, 126, 201, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = recipe.isCustom 
                        ? 'linear-gradient(135deg, #fff4e6 0%, #ffe4cc 100%)'
                        : 'linear-gradient(135deg, #f5f0ff 0%, #ede4ff 100%)';
                      e.currentTarget.style.borderColor = recipe.isCustom ? '#ffa726' : '#e0d4f7';
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div onClick={() => openRecipeDetailsModal(recipe)} className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold" style={{ color: recipe.isCustom ? '#e65100' : '#5a4a7c' }}>
                          {recipe.name}
                        </div>
                        {recipe.isCustom && (
                          <span 
                            className="text-xs px-2 py-1 rounded-full font-semibold"
                            style={{ backgroundColor: '#ff9800', color: 'white' }}
                          >
                            Personnalisé
                          </span>
                        )}
                      </div>
                      <div className="text-sm" style={{ color: '#999' }}>
                        {description} · {recipe.ingredients?.length || 0} ingrédients
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold" style={{ color: recipe.isCustom ? '#e65100' : '#5a4a7c' }}>
                        {recipe.totalPrice.toLocaleString()} FCFA
                      </div>
                      {recipe.isCustom && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditRecipeModal(recipe);
                            }}
                            className="text-white w-8 h-8 rounded-full text-sm flex items-center justify-center transition-all"
                            style={{ backgroundColor: '#2196F3' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#1976D2';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#2196F3';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            ✎
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCustomRecipeHandler(recipe.id);
                            }}
                            className="text-white w-8 h-8 rounded-full text-sm flex items-center justify-center transition-all"
                            style={{ backgroundColor: '#ef4444' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#dc2626';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ef4444';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={backToMainModal} className="flex-1">
              Retour
            </Button>
            <button
              onClick={openCreateRecipeModal}
              className="flex-[2] px-4 py-2 rounded-xl font-semibold text-base transition-all shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(155, 126, 201, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
              }}
            >
              + Créer un nouveau menu
            </button>
          </div>
        </div>
      )}

      {/* Modal détails de recette */}
      {showRecipeDetailsModal && selectedRecipe && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[600px] max-w-[700px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            {selectedRecipe.name}
          </h2>

          <div className="space-y-5 mb-6">
            {/* Origine */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>🌍 Origine</div>
              <div style={{ color: '#333' }}>
                {(selectedRecipe.continent && selectedRecipe.country && selectedRecipe.continent !== 'Universel') 
                  ? `${selectedRecipe.continent}, ${selectedRecipe.country}`
                  : 'Standard'}
              </div>
            </div>

            {/* Ingrédients */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>🥗 Ingrédients ({selectedRecipe.ingredients.length})</div>
              <div className="text-sm space-y-1" style={{ color: '#333' }}>
                {selectedRecipe.ingredients.map((ing, idx) => (
                  <div key={idx}>• {ing.name}: {ing.quantity} {ing.unit}</div>
                ))}
              </div>
            </div>

            {/* Recette */}
            {selectedRecipe.recipe && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
                <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>📖 Recette</div>
                <div className="text-sm" style={{ color: '#666' }}>{selectedRecipe.recipe}</div>
              </div>
            )}

            {/* Nombre de personnes */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-3" style={{ color: '#5a4a7c' }}>👥 Nombre de personnes</div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setRecipePersonCount(Math.max(1, recipePersonCount - 1))}
                  className="text-white w-10 h-10 rounded-full text-xl font-bold transition-all"
                  style={{ backgroundColor: '#5a4a7c' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a6a9c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5a4a7c'}
                >
                  -
                </button>
                <input
                  type="number"
                  value={recipePersonCount}
                  onChange={(e) => setRecipePersonCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-20 px-3 py-2 text-center text-lg font-bold rounded-lg"
                  style={{ border: '2px solid #e0d4f7' }}
                />
                <button
                  onClick={() => setRecipePersonCount(recipePersonCount + 1)}
                  className="text-white w-10 h-10 rounded-full text-xl font-bold transition-all"
                  style={{ backgroundColor: '#5a4a7c' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a6a9c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5a4a7c'}
                >
                  +
                </button>
              </div>
            </div>

            {/* Qualité */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-3" style={{ color: '#5a4a7c' }}>⭐ Qualité</div>
              <div className="flex gap-3">
                {(['standard', 'premium', 'bio'] as const).map((quality) => (
                  <button
                    key={quality}
                    onClick={() => setRecipeQuality(quality)}
                    className="flex-1 p-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: recipeQuality === quality ? '#5a4a7c' : 'white',
                      color: recipeQuality === quality ? 'white' : '#5a4a7c',
                      border: `2px solid ${recipeQuality === quality ? '#5a4a7c' : '#e0d4f7'}`
                    }}
                    onMouseEnter={(e) => {
                      if (recipeQuality !== quality) {
                        e.currentTarget.style.borderColor = '#9b7ec9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (recipeQuality !== quality) {
                        e.currentTarget.style.borderColor = '#e0d4f7';
                      }
                    }}
                  >
                    <div>{quality === 'standard' ? 'Standard' : quality === 'premium' ? 'Premium' : 'Bio'}</div>
                    <div className="text-xs opacity-80">×{quality === 'standard' ? '1' : quality === 'premium' ? '1.5' : '2'}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prix total */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>💰 Prix total</div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: '#666' }}>Prix de base</span>
                <span className="font-semibold" style={{ color: '#5a4a7c' }}>
                  {selectedRecipe.totalPrice.toLocaleString()} FCFA
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: '#666' }}>Nombre de personnes</span>
                <span className="font-semibold" style={{ color: '#5a4a7c' }}>× {recipePersonCount}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: '#666' }}>Qualité</span>
                <span className="font-semibold" style={{ color: '#5a4a7c' }}>
                  × {recipeQuality === 'standard' ? '1' : recipeQuality === 'premium' ? '1.5' : '2'}
                </span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center" style={{ borderColor: '#e0d4f7' }}>
                <span className="font-bold text-lg" style={{ color: '#333' }}>Total</span>
                <span className="text-3xl font-bold" style={{ color: '#5a4a7c' }}>
                  {(() => {
                    const qualityMultiplier = recipeQuality === 'standard' ? 1 : recipeQuality === 'premium' ? 1.5 : 2;
                    return Math.round(selectedRecipe.totalPrice * recipePersonCount * qualityMultiplier).toLocaleString();
                  })()} FCFA
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={backToRecipeList} className="flex-1">
              Retour
            </Button>
            <Button 
              variant="primary" 
              onClick={() => addRecipeToMeal(selectedRecipe, recipePersonCount, recipeQuality)} 
              className="flex-[2]"
            >
              Ajouter au planning
            </Button>
          </div>
        </div>
      )}

      {/* ✅ MODIFIÉ: Modal liste de menus complets (utilise predefinedMenus depuis Supabase) */}
      {showMenuListModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[600px] max-w-[700px] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            🍽️ Menus complets ({predefinedMenus.length})
          </h2>

          <div className="space-y-4 mb-6">
            {predefinedMenus.map((menu) => {
              // Toutes les recettes disponibles
              const allRecipes = [...predefinedRecipes, ...customRecipes];
              
              // ✅ Calculer le prix total en cherchant les recettes par nom
              const totalPrice = menu.meals.reduce((sum, mealDef) => {
                const recipe = allRecipes.find(r => r.name === mealDef.recipeName);
                return sum + (recipe?.totalPrice || 0);
              }, 0);

              return (
                <div
                  key={menu.id}
                  onClick={() => openMenuDetailsModal(menu)}
                  className="p-5 rounded-xl cursor-pointer transition-all"
                  style={{ 
                    background: 'linear-gradient(135deg, #f5f0ff 0%, #ede4ff 100%)',
                    border: '2px solid #e0d4f7'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ede4ff 0%, #e0d4f7 100%)';
                    e.currentTarget.style.borderColor = '#9b7ec9';
                    e.currentTarget.style.transform = 'translateX(5px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(155, 126, 201, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f5f0ff 0%, #ede4ff 100%)';
                    e.currentTarget.style.borderColor = '#e0d4f7';
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-bold text-lg" style={{ color: '#5a4a7c' }}>{menu.name}</div>
                    <div className="font-bold text-lg" style={{ color: '#5a4a7c' }}>{totalPrice.toLocaleString()} FCFA/pers.</div>
                  </div>
                  <div className="space-y-1">
                    {menu.meals.map((mealDef, index) => {
                      const recipe = allRecipes.find(r => r.name === mealDef.recipeName);
                      const categoryLabel = recipe ? CATEGORY_LABELS[recipe.category] : CATEGORY_LABELS[mealDef.type];
                      return (
                        <div key={index} className="text-sm" style={{ color: '#666' }}>
                          • <span className="font-semibold" style={{ color: '#5a4a7c' }}>{categoryLabel} :</span> {mealDef.recipeName}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <Button variant="secondary" onClick={backToMainModal} className="w-full">
            Retour
          </Button>
        </div>
      )}

      {/* ✅ MODIFIÉ: Modal détails du menu complet */}
      {showMenuDetailsModal && selectedMenu && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[600px] max-w-[700px] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            {selectedMenu.name}
          </h2>

          <div className="space-y-5 mb-6">
            {/* Liste des plats */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-3" style={{ color: '#5a4a7c' }}>Composition du menu</div>
              <div className="space-y-2">
                {selectedMenu.meals.map((mealDef, index) => {
                  const allRecipes = [...predefinedRecipes, ...customRecipes];
                  const recipe = allRecipes.find(r => r.name === mealDef.recipeName);
                  const categoryLabel = recipe ? CATEGORY_LABELS[recipe.category] : CATEGORY_LABELS[mealDef.type];
                  return (
                    <div key={index} className="text-sm p-2 bg-white rounded-lg" style={{ color: '#666' }}>
                      <span className="font-semibold" style={{ color: '#5a4a7c' }}>{categoryLabel} :</span> {mealDef.recipeName}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sélecteur de nombre de personnes */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-3" style={{ color: '#5a4a7c' }}>👥 Nombre de personnes</div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setMenuPersonCount(Math.max(1, menuPersonCount - 1))}
                  className="text-white w-10 h-10 rounded-full text-xl font-bold transition-all"
                  style={{ backgroundColor: '#5a4a7c' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a6a9c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5a4a7c'}
                >
                  -
                </button>
                <input
                  type="number"
                  value={menuPersonCount}
                  onChange={(e) => setMenuPersonCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-20 px-3 py-2 text-center text-lg font-bold rounded-lg"
                  style={{ border: '2px solid #e0d4f7' }}
                />
                <button
                  onClick={() => setMenuPersonCount(menuPersonCount + 1)}
                  className="text-white w-10 h-10 rounded-full text-xl font-bold transition-all"
                  style={{ backgroundColor: '#5a4a7c' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a6a9c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5a4a7c'}
                >
                  +
                </button>
              </div>
            </div>

            {/* Prix total */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>💰 Prix total</div>
              {(() => {
                const allRecipes = [...predefinedRecipes, ...customRecipes];
                const pricePerPerson = selectedMenu.meals.reduce((sum, mealDef) => {
                  const recipe = allRecipes.find(r => r.name === mealDef.recipeName);
                  return sum + (recipe?.totalPrice || 0);
                }, 0);
                
                return (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm" style={{ color: '#666' }}>Prix par personne</span>
                      <span className="font-semibold" style={{ color: '#5a4a7c' }}>
                        {pricePerPerson.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm" style={{ color: '#666' }}>Nombre de personnes</span>
                      <span className="font-semibold" style={{ color: '#5a4a7c' }}>× {menuPersonCount}</span>
                    </div>
                    <div className="pt-2 border-t flex justify-between items-center" style={{ borderColor: '#e0d4f7' }}>
                      <span className="font-bold text-lg" style={{ color: '#333' }}>Total</span>
                      <span className="text-3xl font-bold" style={{ color: '#5a4a7c' }}>
                        {(pricePerPerson * menuPersonCount).toLocaleString()} FCFA
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={backToMenuList} className="flex-1">
              Retour
            </Button>
            <Button 
              variant="primary" 
              onClick={() => addCompleteMenu(selectedMenu, menuPersonCount)} 
              className="flex-[2]"
            >
              Ajouter ce menu
            </Button>
          </div>
        </div>
      )}

      {/* Modal création de recette */}
      {showCreateRecipeModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[700px] max-w-[800px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            {editingRecipeId ? '✏️ Modifier le menu' : '✨ Créer un nouveau menu'}
          </h2>

          <div className="space-y-5 mb-6">
            {/* Nom de la recette */}
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Nom de la recette *</label>
              <input
                type="text"
                value={newRecipeName}
                onChange={(e) => setNewRecipeName(e.target.value)}
                placeholder="Ex: Poulet yassa maison"
                className="w-full px-4 py-3 rounded-xl focus:outline-none"
                style={{ border: '2px solid #e0d4f7' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
              />
            </div>

            {/* Catégorie */}
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Catégorie *</label>
              <select
                value={newRecipeCategory}
                onChange={(e) => setNewRecipeCategory(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none"
                style={{ border: '2px solid #e0d4f7' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
              >
                <option value="entree">Entrée</option>
                <option value="principal">Principal</option>
                <option value="accompagnement">Accompagnement</option>
                <option value="dessert">Dessert</option>
                <option value="boisson">Boisson</option>
              </select>
            </div>

            {/* Origine */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Continent *</label>
                <select
                  value={newRecipeContinent}
                  onChange={(e) => setNewRecipeContinent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none"
                  style={{ border: '2px solid #e0d4f7' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
                >
                  <option value="">Sélectionner...</option>
                  <option value="Africain">Africain</option>
                  <option value="Européen">Européen</option>
                  <option value="Asiatique">Asiatique</option>
                  <option value="Américain">Américain</option>
                  <option value="Universel">Universel</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Pays *</label>
                <input
                  type="text"
                  value={newRecipeCountry}
                  onChange={(e) => setNewRecipeCountry(e.target.value)}
                  placeholder="Ex: Ivoirien"
                  className="w-full px-4 py-3 rounded-xl focus:outline-none"
                  style={{ border: '2px solid #e0d4f7' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
                />
              </div>
            </div>

            {/* Description de la recette */}
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Description de la recette *</label>
              <textarea
                value={newRecipeDescription}
                onChange={(e) => setNewRecipeDescription(e.target.value)}
                placeholder="Ex: Poulet mariné au citron et oignons, mijoté lentement avec des légumes..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl focus:outline-none resize-none"
                style={{ border: '2px solid #e0d4f7' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
              />
            </div>

            {/* Ingrédients */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm" style={{ color: '#5a4a7c' }}>Ingrédients *</span>
                <button
                  onClick={openIngredientModal}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                  style={{
                    backgroundColor: '#5a4a7c',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a6a9c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5a4a7c'}
                >
                  + Ajouter
                </button>
              </div>

              {newRecipeIngredients.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#999' }}>
                  Aucun ingrédient ajouté
                </p>
              ) : (
                <div className="space-y-2">
                  {newRecipeIngredients.map((ing) => (
                    <div key={ing.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <div className="font-semibold" style={{ color: '#333' }}>{ing.name}</div>
                        <div className="text-sm" style={{ color: '#666' }}>
                          {ing.quantity} {ing.unit} - {ing.price.toLocaleString()} FCFA
                        </div>
                      </div>
                      <button
                        onClick={() => removeIngredientFromNewRecipe(ing.id)}
                        className="text-white w-6 h-6 rounded-full text-sm flex items-center justify-center transition-all"
                        style={{ backgroundColor: '#ef4444' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ef4444';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prix total */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>💰 Prix total (par personne)</div>
              <div className="text-2xl font-bold text-center" style={{ color: '#5a4a7c' }}>
                {calculateNewRecipePrice().toLocaleString()} FCFA
              </div>
            </div>

            {/* Information de validation */}
            {!editingRecipeId && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#fff4e6', border: '1px solid #ffd699' }}>
                <div className="flex gap-3">
                  <span className="text-2xl">ℹ️</span>
                  <div>
                    <div className="font-semibold mb-1" style={{ color: '#d97706' }}>Validation nécessaire</div>
                    <div className="text-sm" style={{ color: '#92400e' }}>
                      Votre recette sera visible dans votre compte immédiatement. Elle sera également soumise aux administrateurs pour validation avant d'être ajoutée à la bibliothèque publique.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={backFromCreateRecipe} className="flex-1">
              Retour
            </Button>
            <Button 
              variant="primary" 
              onClick={saveNewRecipe} 
              className="flex-[2]"
            >
              {editingRecipeId ? 'Modifier la recette' : 'Créer la recette'}
            </Button>
          </div>
        </div>
      )}

      {/* MODALE: Liste d'ingrédients consolidée avec modification/suppression */}
      {showIngredientsListModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[650px] max-w-[750px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-2 text-center" style={{ color: '#333' }}>
            📋 Liste d'ingrédients consolidée
          </h2>
          
          <p className="text-center text-sm mb-6" style={{ color: '#666' }}>
            📅 Uniquement les repas planifiés à partir d'aujourd'hui
          </p>

          {editableIngredients.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🍽️</span>
              <p className="text-lg" style={{ color: '#999' }}>
                Aucun repas planifié pour les jours à venir
              </p>
              <p className="text-sm mt-2" style={{ color: '#bbb' }}>
                Les repas des dates passées ne sont pas inclus
              </p>
            </div>
          ) : (
            <>
              {/* Section des ingrédients exclus */}
              {editableIngredients.some(ing => ing.isExcluded) && (
                <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#fff4e6', border: '1px solid #ffd699' }}>
                  <div className="text-sm font-semibold mb-2" style={{ color: '#d97706' }}>
                    🗑️ Ingrédients exclus ({editableIngredients.filter(ing => ing.isExcluded).length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editableIngredients.filter(ing => ing.isExcluded).map((ing) => (
                      <span
                        key={ing.id}
                        onClick={() => restoreIngredient(ing.id)}
                        className="px-3 py-1 rounded-full text-xs cursor-pointer transition-all"
                        style={{ backgroundColor: '#ffd699', color: '#92400e' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffcc80'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffd699'}
                      >
                        {ing.name} <span className="ml-1">↩️</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Liste des ingrédients actifs */}
              <div className="space-y-2 mb-6 max-h-[350px] overflow-y-auto">
                {editableIngredients.filter(ing => !ing.isExcluded).map((ing) => (
                  <div 
                    key={ing.id} 
                    className="flex justify-between items-center p-4 rounded-lg transition-all"
                    style={{ 
                      backgroundColor: editingIngredientId === ing.id ? '#f0e8ff' : '#f9f7fc', 
                      border: editingIngredientId === ing.id ? '2px solid #9b7ec9' : '1px solid #e0d4f7'
                    }}
                  >
                    <div className="flex-1">
                      <div className="font-semibold" style={{ color: '#333' }}>{ing.name}</div>
                      
                      {editingIngredientId === ing.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="number"
                            value={tempQuantity}
                            onChange={(e) => setTempQuantity(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                            min="0.1"
                            step="0.1"
                            className="w-20 px-2 py-1 rounded-lg text-center text-sm"
                            style={{ border: '2px solid #9b7ec9' }}
                            autoFocus
                          />
                          <span className="text-sm" style={{ color: '#666' }}>{ing.unit}</span>
                          <button
                            onClick={() => saveIngredientQuantity(ing.id)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                            style={{ backgroundColor: '#22c55e' }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditingIngredient}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                            style={{ backgroundColor: '#ef4444' }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm" style={{ color: '#666' }}>
                          {ing.quantity.toFixed(2)} {ing.unit}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-right" style={{ color: '#5a4a7c', minWidth: '90px' }}>
                        {ing.price.toLocaleString()} FCFA
                      </div>
                      
                      {editingIngredientId !== ing.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditingIngredient(ing.id, ing.quantity)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm"
                            style={{ backgroundColor: '#3b82f6', color: 'white' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#2563eb';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#3b82f6';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Modifier la quantité"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => excludeIngredient(ing.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm"
                            style={{ backgroundColor: '#ef4444', color: 'white' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#dc2626';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ef4444';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Exclure de la commande"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="p-6 rounded-xl text-white mb-6" style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xl font-bold">Total</span>
                    <div className="text-sm opacity-80">
                      {getActiveIngredients().length} ingrédient(s) actif(s)
                    </div>
                  </div>
                  <span className="text-3xl font-bold">{calculateActiveIngredientsTotal().toLocaleString()} FCFA</span>
                </div>
              </div>

              {/* Bouton Commander */}
              <button
                onClick={handleOrderIngredients}
                disabled={isOrdering || getActiveIngredients().length === 0}
                className="w-full py-4 rounded-xl font-bold text-base transition-all mb-4"
                style={{
                  background: isOrdering || getActiveIngredients().length === 0
                    ? 'linear-gradient(135deg, #ccc 0%, #999 100%)'
                    : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  cursor: isOrdering || getActiveIngredients().length === 0 ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!isOrdering && getActiveIngredients().length > 0) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {isOrdering ? '⏳ Ajout en cours...' : `🛒 Ajouter ${getActiveIngredients().length} ingrédient(s) au panier`}
              </button>
            </>
          )}

          <Button variant="secondary" onClick={() => setShowIngredientsListModal(false)} className="w-full">
            Fermer
          </Button>
        </div>
      )}
    </div>
  );
}
