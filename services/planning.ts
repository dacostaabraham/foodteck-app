// src/types/planning.ts

// ======================================================
// ENUMS & ALIAS
// ======================================================

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type MealCategory =
  | 'entree'
  | 'principal'
  | 'accompagnement'
  | 'dessert'
  | 'boisson';

export type IngredientQuality = 'standard' | 'premium' | 'bio';

// ======================================================
// INGREDIENT
// ======================================================

export interface Ingredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

// ======================================================
// RECIPE
// ======================================================

export interface Recipe {
    id: string;  // ← Changer de 'number | string' à 'string'
    name: string;
    category: MealCategory;
  
    ingredients: Ingredient[];
  
    totalPrice: number;
  
    continent: string;
    country: string;
    recipe: string;
  
    isCustom: boolean;
    isValidated: boolean;
    createdBy?: string;
  }
  
  // ======================================================
  // MEAL
  // ======================================================
  
  export interface Meal {
    id: string;  // ← Changer de 'number | string' à 'string'
    name: string;
    category: MealCategory;
  
    price: number;
  
    ingredients?: Ingredient[];
  
    isCustom: boolean;
  
    planningId?: string;
  }

// ======================================================
// PLANNING STRUCTURE
// ======================================================

export interface MealsByDate {
  [dateKey: string]: {
    breakfast: Meal[];
    lunch: Meal[];
    snack: Meal[];
    dinner: Meal[];
  };
}

// ======================================================
// MENUS
// ======================================================

export interface FormattedMenu {
  id: string;
  name: string;
  description: string;

  meals: {
    type: MealCategory;
    recipeName: string;
  }[];

  totalPrice: number;
}

// ======================================================
// INGREDIENTS DISPONIBLES (SUPABASE)
// ======================================================

export interface AvailableIngredient {
  name: string;
  unit: string;
  pricePerUnit: number;
}

export interface AvailableIngredientsByCategory {
  [category: string]: AvailableIngredient[];
}

// ======================================================
// INGREDIENT CONSOLIDÉ (LISTE DE COURSES)
// ======================================================

export interface ConsolidatedIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  pricePerUnit: number;
  isExcluded: boolean;
}
