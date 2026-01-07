// ============================================
// TALIER - Planning Data Service
// Chargement des ingrédients, recettes et menus depuis Supabase
// ============================================

import { createClient } from '@supabase/supabase-js';

// Types pour les données
export interface PlanningIngredient {
  id: string;
  name: string;
  category: string;
  unit: string;
  price_per_unit: number;
}

export interface RecipeIngredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface PlanningRecipe {
  id: string;
  name: string;
  category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  continent: string;
  country: string;
  instructions: string;
  ingredients: RecipeIngredient[];
  total_price: number;
  is_custom: boolean;
  is_validated: boolean;
  created_by?: string;
}

export interface MenuRecipeRef {
  type: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  recipe_name: string;
}

export interface PlanningMenu {
  id: string;
  name: string;
  description: string;
  recipes: MenuRecipeRef[];
  total_price: number;
  is_active: boolean;
}

// Interface pour les ingrédients groupés par catégorie (format frontend)
export interface IngredientsByCategory {
  [category: string]: {
    name: string;
    unit: string;
    pricePerUnit: number;
  }[];
}

// Interface pour les recettes formatées (format frontend)
export interface FormattedRecipe {
  id: string | number;
  name: string;
  category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  continent: string;
  country: string;
  recipe: string; // instructions
  ingredients: {
    id: number;
    name: string;
    quantity: number;
    unit: string;
    price: number;
  }[];
  totalPrice: number;
  isCustom: boolean;
  isValidated: boolean;
  createdBy?: string;
}

// Interface pour les menus formatés (format frontend)
export interface FormattedMenu {
  id: string | number;
  name: string;
  description: string;
  meals: {
    type: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
    recipeId?: string;
    recipeName: string;
  }[];
  totalPrice: number;
}

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// FONCTIONS DE CHARGEMENT
// ============================================

/**
 * Charger tous les ingrédients depuis Supabase
 */
export async function loadPlanningIngredients(): Promise<PlanningIngredient[]> {
  try {
    const { data, error } = await supabase
      .from('planning_ingredients')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Erreur chargement ingrédients:', error);
      return [];
    }

    console.log(`✅ ${data?.length || 0} ingrédients chargés depuis Supabase`);
    return data || [];
  } catch (error) {
    console.error('❌ Exception chargement ingrédients:', error);
    return [];
  }
}

/**
 * Charger les ingrédients groupés par catégorie (format frontend)
 */
export async function loadIngredientsByCategory(): Promise<IngredientsByCategory> {
  const ingredients = await loadPlanningIngredients();
  
  const grouped: IngredientsByCategory = {};
  
  ingredients.forEach(ing => {
    if (!grouped[ing.category]) {
      grouped[ing.category] = [];
    }
    grouped[ing.category].push({
      name: ing.name,
      unit: ing.unit,
      pricePerUnit: ing.price_per_unit
    });
  });

  return grouped;
}

/**
 * Charger toutes les recettes depuis Supabase
 * @param includeCustom - Inclure les recettes personnalisées de l'utilisateur
 * @param userId - ID de l'utilisateur pour les recettes personnalisées
 */
export async function loadPlanningRecipes(
  includeCustom: boolean = true,
  userId?: string
): Promise<PlanningRecipe[]> {
  try {
    let query = supabase
      .from('planning_recipes')
      .select('*')
      .order('name', { ascending: true });

    // Si on veut inclure les recettes custom de l'utilisateur
    if (includeCustom && userId) {
      query = query.or(`is_custom.eq.false,and(is_custom.eq.true,created_by.eq.${userId})`);
    } else {
      // Sinon, seulement les recettes prédéfinies validées
      query = query.eq('is_custom', false).eq('is_validated', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erreur chargement recettes:', error);
      return [];
    }

    console.log(`✅ ${data?.length || 0} recettes chargées depuis Supabase`);
    return data || [];
  } catch (error) {
    console.error('❌ Exception chargement recettes:', error);
    return [];
  }
}

/**
 * Charger les recettes formatées pour le frontend
 */
export async function loadFormattedRecipes(userId?: string): Promise<FormattedRecipe[]> {
  const recipes = await loadPlanningRecipes(true, userId);
  
  return recipes.map(recipe => ({
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    continent: recipe.continent || 'Universel',
    country: recipe.country || 'International',
    recipe: recipe.instructions || '',
    ingredients: recipe.ingredients || [],
    totalPrice: recipe.total_price,
    isCustom: recipe.is_custom,
    isValidated: recipe.is_validated,
    createdBy: recipe.created_by
  }));
}

/**
 * Charger tous les menus depuis Supabase
 */
export async function loadPlanningMenus(): Promise<PlanningMenu[]> {
  try {
    const { data, error } = await supabase
      .from('planning_menus')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Erreur chargement menus:', error);
      return [];
    }

    console.log(`✅ ${data?.length || 0} menus chargés depuis Supabase`);
    return data || [];
  } catch (error) {
    console.error('❌ Exception chargement menus:', error);
    return [];
  }
}

/**
 * Charger les menus formatés pour le frontend
 * Résout les références aux recettes par leur nom
 */
export async function loadFormattedMenus(): Promise<FormattedMenu[]> {
  const [menus, recipes] = await Promise.all([
    loadPlanningMenus(),
    loadPlanningRecipes(false) // Seulement les recettes prédéfinies pour les menus
  ]);

  // Créer un map des recettes par nom pour résolution rapide
  const recipesByName = new Map<string, PlanningRecipe>();
  recipes.forEach(r => recipesByName.set(r.name, r));

  return menus.map(menu => ({
    id: menu.id,
    name: menu.name,
    description: menu.description || '',
    meals: (menu.recipes || []).map((ref: MenuRecipeRef) => {
      const recipe = recipesByName.get(ref.recipe_name);
      return {
        type: ref.type,
        recipeId: recipe?.id,
        recipeName: ref.recipe_name
      };
    }),
    totalPrice: menu.total_price
  }));
}

// ============================================
// FONCTIONS CRUD POUR RECETTES PERSONNALISÉES
// ============================================

/**
 * Créer une nouvelle recette personnalisée
 */
export async function createCustomRecipe(
  userId: string,
  recipeData: {
    name: string;
    category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
    continent: string;
    country: string;
    instructions: string;
    ingredients: RecipeIngredient[];
    total_price: number;
  }
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('planning_recipes')
      .insert({
        ...recipeData,
        is_custom: true,
        is_validated: false,
        created_by: userId
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erreur création recette:', error);
      return null;
    }

    console.log('✅ Recette créée:', data.id);
    return data.id;
  } catch (error) {
    console.error('❌ Exception création recette:', error);
    return null;
  }
}

/**
 * Mettre à jour une recette personnalisée
 */
export async function updateCustomRecipe(
  recipeId: string,
  userId: string,
  recipeData: {
    name?: string;
    category?: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
    continent?: string;
    country?: string;
    instructions?: string;
    ingredients?: RecipeIngredient[];
    total_price?: number;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('planning_recipes')
      .update(recipeData)
      .eq('id', recipeId)
      .eq('created_by', userId);

    if (error) {
      console.error('❌ Erreur mise à jour recette:', error);
      return false;
    }

    console.log('✅ Recette mise à jour:', recipeId);
    return true;
  } catch (error) {
    console.error('❌ Exception mise à jour recette:', error);
    return false;
  }
}

/**
 * Supprimer une recette personnalisée
 */
export async function deleteCustomRecipe(
  recipeId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('planning_recipes')
      .delete()
      .eq('id', recipeId)
      .eq('created_by', userId);

    if (error) {
      console.error('❌ Erreur suppression recette:', error);
      return false;
    }

    console.log('✅ Recette supprimée:', recipeId);
    return true;
  } catch (error) {
    console.error('❌ Exception suppression recette:', error);
    return false;
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Trouver une recette par son nom
 */
export async function findRecipeByName(name: string): Promise<PlanningRecipe | null> {
  try {
    const { data, error } = await supabase
      .from('planning_recipes')
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      console.error('❌ Recette non trouvée:', name);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Exception recherche recette:', error);
    return null;
  }
}

/**
 * Rechercher des recettes par critères
 */
export async function searchRecipes(
  searchTerm: string,
  category?: string
): Promise<PlanningRecipe[]> {
  try {
    let query = supabase
      .from('planning_recipes')
      .select('*')
      .eq('is_validated', true)
      .ilike('name', `%${searchTerm}%`);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('❌ Erreur recherche recettes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception recherche recettes:', error);
    return [];
  }
}

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

export default {
  loadPlanningIngredients,
  loadIngredientsByCategory,
  loadPlanningRecipes,
  loadFormattedRecipes,
  loadPlanningMenus,
  loadFormattedMenus,
  createCustomRecipe,
  updateCustomRecipe,
  deleteCustomRecipe,
  findRecipeByName,
  searchRecipes
};