/**
 * SERVICE LOCAL STORAGE - Gestion de la persistance en mode invité
 * 
 * Ce service gère le stockage local dans le navigateur pour :
 * - La planification des repas restaurant (mealsByDate)
 * - Les informations de livraison
 * - La taille de famille
 * - La date sélectionnée
 */

// ============================================
// CLÉS DE STOCKAGE
// ============================================

const STORAGE_KEYS = {
  RESTO_MEALS: 'popoteapp_resto_meals',
  RESTO_DELIVERY: 'popoteapp_resto_delivery',
  RESTO_FAMILY_SIZE: 'popoteapp_resto_family_size',
  RESTO_SELECTED_DATE: 'popoteapp_resto_selected_date',
  PLANNING_MEALS: 'popoteapp_planning_meals', // Pour Planning si besoin
  PLANNING_FAMILY_SIZE: 'popoteapp_planning_family_size',
} as const;

// ============================================
// TYPES
// ============================================

interface Meal {
  id: number | string;
  name: string;
  price: number;
  category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  quantity: number;
  quality: 'standard' | 'premium' | 'bio';
  cuisine?: string;
  country?: string;
  ingredients?: string;
  recipe?: string;
}

interface MealsByDate {
  [dateKey: string]: {
    breakfast: Meal[];
    lunch: Meal[];
    snack: Meal[];
    dinner: Meal[];
  };
}

interface DeliveryInfo {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  deliveryTime: string;
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Vérifier si localStorage est disponible
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sauvegarder dans localStorage avec gestion d'erreur
 */
function safeSetItem(key: string, value: any): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn('💡 localStorage non disponible');
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    console.log(`💾 localStorage sauvegardé: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur sauvegarde localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Charger depuis localStorage avec gestion d'erreur
 */
function safeGetItem<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`❌ Erreur chargement localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Supprimer un élément du localStorage
 */
function safeRemoveItem(key: string): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    console.log(`🗑️ localStorage supprimé: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur suppression localStorage (${key}):`, error);
    return false;
  }
}

// ============================================
// FONCTIONS : MEALS BY DATE (RESTO)
// ============================================

/**
 * Charger les repas restaurant depuis localStorage
 */
export function loadRestoMealsFromLocalStorage(): MealsByDate {
  const meals = safeGetItem<MealsByDate>(STORAGE_KEYS.RESTO_MEALS, {});
  console.log('📖 Repas restaurant chargés depuis localStorage:', Object.keys(meals).length, 'dates');
  return meals;
}

/**
 * Sauvegarder les repas restaurant dans localStorage
 */
export function saveRestoMealsToLocalStorage(meals: MealsByDate): boolean {
  return safeSetItem(STORAGE_KEYS.RESTO_MEALS, meals);
}

/**
 * Effacer tous les repas restaurant du localStorage
 */
export function clearRestoMealsFromLocalStorage(): boolean {
  return safeRemoveItem(STORAGE_KEYS.RESTO_MEALS);
}

// ============================================
// FONCTIONS : DELIVERY INFO
// ============================================

/**
 * Charger les infos de livraison depuis localStorage
 */
export function loadDeliveryInfoFromLocalStorage(): DeliveryInfo | null {
  const info = safeGetItem<DeliveryInfo | null>(STORAGE_KEYS.RESTO_DELIVERY, null);
  if (info) {
    console.log('📖 Infos livraison chargées depuis localStorage');
  }
  return info;
}

/**
 * Sauvegarder les infos de livraison dans localStorage
 */
export function saveDeliveryInfoToLocalStorage(info: DeliveryInfo): boolean {
  return safeSetItem(STORAGE_KEYS.RESTO_DELIVERY, info);
}

/**
 * Effacer les infos de livraison du localStorage
 */
export function clearDeliveryInfoFromLocalStorage(): boolean {
  return safeRemoveItem(STORAGE_KEYS.RESTO_DELIVERY);
}

// ============================================
// FONCTIONS : FAMILY SIZE
// ============================================

/**
 * Charger la taille de famille depuis localStorage
 */
export function loadFamilySizeFromLocalStorage(): number {
  const size = safeGetItem<number>(STORAGE_KEYS.RESTO_FAMILY_SIZE, 1);
  console.log('📖 Taille famille chargée depuis localStorage:', size);
  return size;
}

/**
 * Sauvegarder la taille de famille dans localStorage
 */
export function saveFamilySizeToLocalStorage(size: number): boolean {
  return safeSetItem(STORAGE_KEYS.RESTO_FAMILY_SIZE, size);
}

// ============================================
// FONCTIONS : SELECTED DATE
// ============================================

/**
 * Charger la date sélectionnée depuis localStorage
 */
export function loadSelectedDateFromLocalStorage(): Date | null {
  const dateStr = safeGetItem<string | null>(STORAGE_KEYS.RESTO_SELECTED_DATE, null);
  
  if (dateStr) {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        console.log('📖 Date sélectionnée chargée depuis localStorage:', dateStr);
        return date;
      }
    } catch (error) {
      console.error('❌ Date invalide dans localStorage');
    }
  }
  
  return null;
}

/**
 * Sauvegarder la date sélectionnée dans localStorage
 */
export function saveSelectedDateToLocalStorage(date: Date): boolean {
  const dateStr = date.toISOString();
  return safeSetItem(STORAGE_KEYS.RESTO_SELECTED_DATE, dateStr);
}

// ============================================
// FONCTIONS : NETTOYAGE
// ============================================

/**
 * Nettoyer toutes les données restaurant du localStorage
 */
export function clearAllRestoDataFromLocalStorage(): boolean {
  let success = true;
  success = clearRestoMealsFromLocalStorage() && success;
  success = clearDeliveryInfoFromLocalStorage() && success;
  success = safeRemoveItem(STORAGE_KEYS.RESTO_FAMILY_SIZE) && success;
  success = safeRemoveItem(STORAGE_KEYS.RESTO_SELECTED_DATE) && success;
  
  if (success) {
    console.log('🧹 Toutes les données restaurant effacées du localStorage');
  }
  
  return success;
}

/**
 * Migrer les données du localStorage vers Supabase (appelé après connexion)
 */
export function getRestoDataForMigration(): {
  meals: MealsByDate;
  deliveryInfo: DeliveryInfo | null;
  familySize: number;
} {
  return {
    meals: loadRestoMealsFromLocalStorage(),
    deliveryInfo: loadDeliveryInfoFromLocalStorage(),
    familySize: loadFamilySizeFromLocalStorage(),
  };
}

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

export default {
  // Meals
  loadRestoMealsFromLocalStorage,
  saveRestoMealsToLocalStorage,
  clearRestoMealsFromLocalStorage,
  
  // Delivery
  loadDeliveryInfoFromLocalStorage,
  saveDeliveryInfoToLocalStorage,
  clearDeliveryInfoFromLocalStorage,
  
  // Family Size
  loadFamilySizeFromLocalStorage,
  saveFamilySizeToLocalStorage,
  
  // Selected Date
  loadSelectedDateFromLocalStorage,
  saveSelectedDateToLocalStorage,
  
  // Cleanup
  clearAllRestoDataFromLocalStorage,
  getRestoDataForMigration,
};
