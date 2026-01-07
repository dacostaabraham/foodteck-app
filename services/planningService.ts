// src/services/planningService.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

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
  id: string; // UUID de Supabase
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
  id: string; // UUID de Supabase ou number local
  name: string;
  category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  price: number;
  ingredients?: Ingredient[];
  isCustom: boolean;
  dishId?: string; // Référence au dish dans la BDD
}

export interface PlanningEntry {
  id: string;
  userId: string;
  dateRepas: string; // Format YYYY-MM-DD
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

const MEAL_TYPE_REVERSE_MAP = {
  'petit-dejeuner': 'breakfast',
  'dejeuner': 'lunch',
  'gouter': 'snack',
  'diner': 'dinner',
} as const;

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
        is_validated,
        ingredients:ingredients(
          id,
          quantite,
          unite,
          prix_custom,
          product:products(
            nom,
            prix_base_fcfa
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_custom', true);

    if (error) {
      console.error('Erreur lors du chargement des recettes personnalisées:', error);
      return [];
    }

    return (data || []).map((dish: any) => ({
      id: dish.id,
      name: dish.nom,
      category: mapCategoryFromDB(dish.type_repas),
      continent: dish.type_cuisine || '',
      country: '',
      recipe: dish.description || '',
      ingredients: (dish.ingredients || []).map((ing: any, idx: number) => ({
        id: idx + 1,
        name: ing.product?.nom || '',
        quantity: ing.quantite,
        unit: ing.unite,
        price: ing.prix_custom || ing.product?.prix_base_fcfa || 0,
      })),
      totalPrice: dish.prix_fcfa,
      isCustom: true,
      isValidated: dish.is_validated,
      userId: userId,
    }));
  } catch (error) {
    console.error('Erreur lors du chargement des recettes:', error);
    return [];
  }
}

export async function saveCustomRecipe(userId: string, recipe: Omit<Recipe, 'id' | 'userId'>): Promise<string | null> {
  try {
    // 1. Créer le plat
    const { data: dishData, error: dishError } = await supabase
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
      .select()
      .single();

    if (dishError || !dishData) {
      console.error('Erreur lors de la création du plat:', dishError);
      return null;
    }

    // 2. Créer les ingrédients (si nécessaire, créer les produits)
    for (const ingredient of recipe.ingredients) {
      // Chercher si le produit existe déjà
      const { data: productData } = await supabase
        .from('products')
        .select('id')
        .eq('nom', ingredient.name)
        .single();

      let productId = productData?.id;

      // Si le produit n'existe pas, le créer
      if (!productId) {
        const { data: newProduct } = await supabase
          .from('products')
          .insert({
            nom: ingredient.name,
            categorie: 'Autres',
            prix_base_fcfa: ingredient.price,
            unite: ingredient.unit,
            disponible_marche_normal: true,
            disponible_marche_gros: true,
          })
          .select()
          .single();

        productId = newProduct?.id;
      }

      if (productId) {
        // Créer l'ingrédient
        await supabase.from('ingredients').insert({
          dish_id: dishData.id,
          product_id: productId,
          quantite: ingredient.quantity,
          unite: ingredient.unit,
          prix_custom: ingredient.price,
        });
      }
    }

    return dishData.id;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la recette:', error);
    return null;
  }
}

export async function updateCustomRecipe(
  recipeId: string,
  userId: string,
  recipe: Omit<Recipe, 'id' | 'userId'>
): Promise<boolean> {
  try {
    // 1. Mettre à jour le plat
    const { error: dishError } = await supabase
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

    if (dishError) {
      console.error('Erreur lors de la mise à jour du plat:', dishError);
      return false;
    }

    // 2. Supprimer les anciens ingrédients
    await supabase.from('ingredients').delete().eq('dish_id', recipeId);

    // 3. Recréer les ingrédients
    for (const ingredient of recipe.ingredients) {
      const { data: productData } = await supabase
        .from('products')
        .select('id')
        .eq('nom', ingredient.name)
        .single();

      let productId = productData?.id;

      if (!productId) {
        const { data: newProduct } = await supabase
          .from('products')
          .insert({
            nom: ingredient.name,
            categorie: 'Autres',
            prix_base_fcfa: ingredient.price,
            unite: ingredient.unit,
            disponible_marche_normal: true,
            disponible_marche_gros: true,
          })
          .select()
          .single();

        productId = newProduct?.id;
      }

      if (productId) {
        await supabase.from('ingredients').insert({
          dish_id: recipeId,
          product_id: productId,
          quantite: ingredient.quantity,
          unite: ingredient.unit,
          prix_custom: ingredient.price,
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la recette:', error);
    return false;
  }
}

export async function deleteCustomRecipe(recipeId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur lors de la suppression de la recette:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de la recette:', error);
    return false;
  }
}

// ============================================
// GESTION DU PLANNING
// ============================================

export async function loadPlanning(userId: string): Promise<PlanningEntry[]> {
  try {
    const { data, error } = await supabase
      .from('planning')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur lors du chargement du planning:', error);
      return [];
    }

    return (data || []).map((entry: any) => ({
      id: entry.id,
      userId: entry.user_id,
      dateRepas: entry.date_repas,
      typeRepas: MEAL_TYPE_REVERSE_MAP[entry.type_repas as keyof typeof MEAL_TYPE_REVERSE_MAP],
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
  } catch (error) {
    console.error('Erreur lors du chargement du planning:', error);
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
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la sauvegarde du repas:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du repas:', error);
    return null;
  }
}

export async function removeMealFromPlanning(planningId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('planning')
      .delete()
      .eq('id', planningId)
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur lors de la suppression du repas:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression du repas:', error);
    return false;
  }
}

export async function updateFamilySize(userId: string, familySize: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ taille_famille: familySize })
      .eq('id', userId);

    if (error) {
      console.error('Erreur lors de la mise à jour de la taille de famille:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la taille de famille:', error);
    return false;
  }
}

export async function loadFamilySize(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('taille_famille')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Erreur lors du chargement de la taille de famille:', error);
      return 1;
    }

    return data.taille_famille || 1;
  } catch (error) {
    console.error('Erreur lors du chargement de la taille de famille:', error);
    return 1;
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function mapCategoryFromDB(dbCategory: string): 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson' {
  const mapping: { [key: string]: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson' } = {
    'petit-dejeuner': 'principal',
    'dejeuner': 'principal',
    'diner': 'principal',
    'gouter': 'dessert',
  };
  return mapping[dbCategory] || 'principal';
}

function mapCategoryToDB(category: string): string {
  // Pour l'instant, on mappe toutes les catégories vers 'dejeuner'
  // Car le schéma actuel utilise type_repas pour le moment de la journée
  return 'dejeuner';
}
