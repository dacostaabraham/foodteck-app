// src/services/planningService.ts
import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export interface Ingredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  ingredients: Ingredient[];
  totalPrice: number;
  continent: string;
  country: string;
  recipe: string;
  isCustom: boolean;
  isValidated: boolean;
  userId?: string;
}

export interface Meal {
  id: string;
  name: string;
  category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  price: number;
  ingredients?: Ingredient[];
  isCustom: boolean;
  dishId?: string;
  planningId?: string;
}

export interface PlanningEntry {
  id: string;
  userId: string;
  dateRepas: string;
  typeRepas: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  meal: Meal;
  nombrePersonnes: number;
}

// ============================================
// MAPPING DES TYPES DE REPAS
// ============================================

const MEAL_TYPE_MAP = {
  breakfast: 'petit-dejeuner',
  lunch: 'dejeuner',
  snack: 'gouter',
  dinner: 'diner',
} as const;

const MEAL_TYPE_REVERSE_MAP: Record<string, 'breakfast' | 'lunch' | 'snack' | 'dinner'> = {
  'petit-dejeuner': 'breakfast',
  'dejeuner': 'lunch',
  'gouter': 'snack',
  'diner': 'dinner',
};

const CATEGORY_MAP = {
  entree: 'Entrée',
  principal: 'Principal',
  accompagnement: 'Accompagnement',
  dessert: 'Dessert',
  boisson: 'Boisson',
} as const;

// ============================================
// GESTION DES RECETTES PERSONNALISÉES
// ============================================

export async function loadCustomRecipes(userId: string): Promise<Recipe[]> {
  try {
    console.log('📥 Chargement recettes personnalisées...');
    
    const { data, error } = await supabase
      .from('dishes')
      .select(`
        id,
        nom,
        description,
        type_cuisine,
        type_repas,
        prix_fcfa,
        is_custom,
        is_validated
      `)
      .eq('user_id', userId)
      .eq('is_custom', true);

    if (error) {
      console.error('❌ Erreur chargement recettes:', error);
      return [];
    }

    const recipes = (data || []).map((dish: any) => ({
      id: dish.id,
      name: dish.nom,
      category: mapCategoryFromDB(dish.type_repas),
      continent: dish.type_cuisine || '',
      country: '',
      recipe: dish.description || '',
      ingredients: [],
      totalPrice: dish.prix_fcfa,
      isCustom: true,
      isValidated: dish.is_validated,
      userId: userId,
    }));

    console.log(`✅ ${recipes.length} recettes personnalisées chargées`);
    return recipes;
  } catch (error) {
    console.error('❌ Exception chargement recettes:', error);
    return [];
  }
}

export async function saveCustomRecipe(
  userId: string, 
  recipe: Omit<Recipe, 'id' | 'userId'>
): Promise<string | null> {
  try {
    console.log('💾 Sauvegarde recette personnalisée...');

    const { data, error } = await supabase
      .from('dishes')
      .insert({
        user_id: userId,
        nom: recipe.name,
        description: recipe.recipe,
        type_cuisine: recipe.continent,
        type_repas: mapCategoryToDB(recipe.category),
        prix_fcfa: recipe.totalPrice,
        is_custom: true,
        is_validated: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erreur sauvegarde recette:', error);
      return null;
    }

    console.log('✅ Recette sauvegardée:', data.id);
    return data.id;
  } catch (error) {
    console.error('❌ Exception sauvegarde recette:', error);
    return null;
  }
}

export async function updateCustomRecipe(
  recipeId: string,
  userId: string,
  recipe: Omit<Recipe, 'id' | 'userId'>
): Promise<boolean> {
  try {
    console.log('💾 Mise à jour recette...');

    const { error } = await supabase
      .from('dishes')
      .update({
        nom: recipe.name,
        description: recipe.recipe,
        type_cuisine: recipe.continent,
        type_repas: mapCategoryToDB(recipe.category),
        prix_fcfa: recipe.totalPrice,
      })
      .eq('id', recipeId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erreur mise à jour recette:', error);
      return false;
    }

    console.log('✅ Recette mise à jour');
    return true;
  } catch (error) {
    console.error('❌ Exception mise à jour recette:', error);
    return false;
  }
}

export async function deleteCustomRecipe(recipeId: string, userId: string): Promise<boolean> {
  try {
    console.log('🗑️ Suppression recette...');

    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erreur suppression recette:', error);
      return false;
    }

    console.log('✅ Recette supprimée');
    return true;
  } catch (error) {
    console.error('❌ Exception suppression recette:', error);
    return false;
  }
}

// ============================================
// GESTION DU PLANNING
// ============================================

export async function loadPlanning(userId: string): Promise<PlanningEntry[]> {
  try {
    console.log('📥 Chargement planning...');

    const { data, error } = await supabase
      .from('planning')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erreur chargement planning:', error);
      return [];
    }

    const entries = (data || []).map((entry: any) => ({
      id: entry.id,
      userId: entry.user_id,
      dateRepas: entry.date_repas,
      typeRepas: MEAL_TYPE_REVERSE_MAP[entry.type_repas] || 'lunch',
      meal: {
        id: entry.id,
        name: entry.meal_name,
        category: entry.meal_category,
        price: entry.meal_price,
        ingredients: entry.meal_data?.ingredients || [],
        isCustom: entry.meal_data?.isCustom || false,
        dishId: entry.dish_id,
      },
      nombrePersonnes: entry.nombre_personnes,
    }));

    console.log(`✅ ${entries.length} entrées de planning chargées`);
    return entries;
  } catch (error) {
    console.error('❌ Exception chargement planning:', error);
    return [];
  }
}

export async function saveMealToPlanning(
  userId: string,
  date: string,
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner',
  meal: Meal,
  nombrePersonnes: number = 1
): Promise<string | null> {
  try {
    console.log('💾 Sauvegarde repas au planning...');

    const { data, error } = await supabase
      .from('planning')
      .insert({
        user_id: userId,
        date_repas: date,
        type_repas: MEAL_TYPE_MAP[mealType],
        meal_name: meal.name,
        meal_category: meal.category,
        meal_price: meal.price,
        meal_data: {
          ingredients: meal.ingredients || [],
          isCustom: meal.isCustom,
        },
        dish_id: meal.dishId || null,
        nombre_personnes: nombrePersonnes,
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erreur sauvegarde planning:', error);
      return null;
    }

    console.log('✅ Repas ajouté au planning:', data.id);
    return data.id;
  } catch (error) {
    console.error('❌ Exception sauvegarde planning:', error);
    return null;
  }
}

export async function removeMealFromPlanning(planningId: string, userId: string): Promise<boolean> {
  try {
    console.log('🗑️ Suppression repas du planning...');

    const { error } = await supabase
      .from('planning')
      .delete()
      .eq('id', planningId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erreur suppression planning:', error);
      return false;
    }

    console.log('✅ Repas supprimé du planning');
    return true;
  } catch (error) {
    console.error('❌ Exception suppression planning:', error);
    return false;
  }
}

// ============================================
// GESTION TAILLE FAMILLE
// ============================================

export async function loadFamilySize(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('taille_famille')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.log('💡 Taille famille par défaut: 1');
      return 1;
    }

    return data.taille_famille || 1;
  } catch (error) {
    console.error('❌ Erreur chargement taille famille:', error);
    return 1;
  }
}

export async function updateFamilySize(userId: string, familySize: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ taille_famille: familySize })
      .eq('id', userId);

    if (error) {
      console.error('❌ Erreur mise à jour taille famille:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur:', error);
    return false;
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function mapCategoryFromDB(dbCategory: string): 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson' {
  const mapping: Record<string, 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson'> = {
    'petit-dejeuner': 'principal',
    'dejeuner': 'principal',
    'diner': 'principal',
    'gouter': 'dessert',
    'Entrée': 'entree',
    'Principal': 'principal',
    'Accompagnement': 'accompagnement',
    'Dessert': 'dessert',
    'Boisson': 'boisson',
  };
  return mapping[dbCategory] || 'principal';
}

function mapCategoryToDB(category: string): string {
  return 'dejeuner';
}

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

export default {
  loadCustomRecipes,
  saveCustomRecipe,
  updateCustomRecipe,
  deleteCustomRecipe,
  loadPlanning,
  saveMealToPlanning,
  removeMealFromPlanning,
  loadFamilySize,
  updateFamilySize,
};