// services/restoService.ts
import { supabase } from '@/lib/supabase';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface RestaurantOrderFromDB {
  id: string;
  orderDate: string;
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  dishName: string;
  dishPrice: number;
  dishCategory: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  quantity: number;
  quality: 'standard' | 'premium' | 'bio';
  dishCuisine?: string;
  dishCountry?: string;
  dishIngredients?: string[]; // ✅ Changé en string[] pour cohérence
  dishRecipe?: string;
}

export interface MealForSave {
  name: string;
  price: number;
  category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  quantity: number;
  quality: 'standard' | 'premium' | 'bio';
  cuisine?: string;
  country?: string;
  ingredients?: string[]; // ✅ Changé en string[] pour cohérence
  recipe?: string;
}

export interface DeliveryInfo {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  isDefault?: boolean;
}

// ============================================
// FONCTIONS - RESTAURANT ORDERS
// ============================================

/**
 * Charger toutes les commandes restaurant d'un utilisateur
 */
export async function loadRestaurantOrders(userId: string): Promise<RestaurantOrderFromDB[]> {
  try {
    console.log('📥 Chargement des commandes restaurant depuis Supabase...');

    const { data: orders, error } = await supabase
      .from('restaurant_orders')
      .select('*')
      .eq('user_id', userId)
      .order('delivery_date', { ascending: true });

    if (error) {
      console.error('❌ Erreur chargement commandes:', error);
      return [];
    }

    if (!orders || orders.length === 0) {
      console.log('💡 Aucune commande trouvée');
      return [];
    }

    // Transformer les données en format attendu par la page
    const formattedOrders: RestaurantOrderFromDB[] = orders.map(order => ({
      id: order.id,
      orderDate: order.delivery_date,
      mealType: order.meal_type,
      dishName: order.dish_name,
      dishPrice: order.dish_price,
      dishCategory: order.dish_category,
      quantity: order.quantity || 1,
      quality: order.quality || 'standard',
      dishCuisine: order.dish_cuisine,
      dishCountry: order.dish_country,
      // ✅ Convertir string DB → string[] pour l'application
      dishIngredients: order.dish_ingredients 
        ? (typeof order.dish_ingredients === 'string' 
            ? order.dish_ingredients.split(', ').filter(Boolean)
            : order.dish_ingredients)
        : undefined,
      dishRecipe: order.dish_recipe,
    }));

    console.log(`✅ ${orders.length} commandes chargées`);
    return formattedOrders;

  } catch (error) {
    console.error('❌ Erreur lors du chargement:', error);
    return [];
  }
}

/**
 * Sauvegarder une commande restaurant
 */
export async function saveRestaurantOrder(
  userId: string,
  deliveryDate: string,
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner',
  meal: MealForSave,
  familySize: number
): Promise<string | null> {
  try {
    console.log('💾 Sauvegarde commande restaurant...');

    const qualityMultiplier = meal.quality === 'standard' ? 1 : 
                              meal.quality === 'premium' ? 1.5 : 2;
    const totalPrice = Math.round(meal.price * meal.quantity * qualityMultiplier * familySize);

    const { data, error } = await supabase
      .from('restaurant_orders')
      .insert({
        user_id: userId,
        delivery_date: deliveryDate,
        meal_type: mealType,
        dish_name: meal.name,
        dish_price: meal.price,
        dish_category: meal.category,
        dish_cuisine: meal.cuisine || null,
        dish_country: meal.country || null,
        // ✅ Convertir string[] → string pour la DB
        dish_ingredients: meal.ingredients?.join(', ') || null,
        dish_recipe: meal.recipe || null,
        quantity: meal.quantity,
        quality: meal.quality,
        family_size: familySize,
        total_price: totalPrice,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erreur sauvegarde:', error);
      return null;
    }

    console.log('✅ Commande sauvegardée:', data.id);
    return data.id;

  } catch (error) {
    console.error('❌ Erreur:', error);
    return null;
  }
}

/**
 * Supprimer une commande restaurant
 */
export async function deleteRestaurantOrder(orderId: string, userId: string): Promise<boolean> {
  try {
    console.log('🗑️ Suppression commande...');

    const { error } = await supabase
      .from('restaurant_orders')
      .delete()
      .eq('id', orderId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erreur suppression:', error);
      return false;
    }

    console.log('✅ Commande supprimée');
    return true;

  } catch (error) {
    console.error('❌ Erreur:', error);
    return false;
  }
}

// ============================================
// FONCTIONS - ADRESSES DE LIVRAISON
// ============================================

/**
 * Charger l'adresse de livraison par défaut
 * ✅ ADAPTÉ AUX COLONNES FRANÇAISES DE VOTRE BDD
 */
export async function loadDeliveryAddress(userId: string): Promise<DeliveryInfo | null> {
  try {
    console.log('📥 Chargement adresse de livraison...');

    // ✅ Utilisation des VRAIS noms de colonnes de votre BDD
    const { data: user, error } = await supabase
      .from('users')
      .select('nom_famille, telephone, adresse_livraison')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Erreur chargement adresse:', error);
      return null;
    }

    if (!user) {
      console.log('💡 Utilisateur non trouvé');
      return null;
    }

    // L'adresse peut être soit une string, soit un objet JSON
    let addressData = {
      address: '',
      city: 'Abidjan',
      district: '',
    };

    if (user.adresse_livraison) {
      if (typeof user.adresse_livraison === 'string') {
        // Si c'est une string simple, on la met dans address
        addressData.address = user.adresse_livraison;
      } else if (typeof user.adresse_livraison === 'object') {
        // Si c'est un objet JSON
        addressData = {
          address: user.adresse_livraison.address || user.adresse_livraison.adresse || '',
          city: user.adresse_livraison.city || user.adresse_livraison.ville || 'Abidjan',
          district: user.adresse_livraison.district || user.adresse_livraison.commune || '',
        };
      }
    }
    
    return {
      fullName: user.nom_famille || '',
      phone: user.telephone || '',
      address: addressData.address,
      city: addressData.city,
      district: addressData.district,
    };

  } catch (error) {
    console.error('❌ Erreur:', error);
    return null;
  }
}

/**
 * Sauvegarder l'adresse de livraison
 * ✅ ADAPTÉ AUX COLONNES FRANÇAISES DE VOTRE BDD
 */
export async function saveDeliveryAddress(
  userId: string,
  deliveryInfo: DeliveryInfo
): Promise<boolean> {
  try {
    console.log('💾 Sauvegarde adresse de livraison...');

    // ✅ Utilisation des VRAIS noms de colonnes de votre BDD
    const { error } = await supabase
      .from('users')
      .update({
        nom_famille: deliveryInfo.fullName,
        telephone: deliveryInfo.phone,
        adresse_livraison: {
          address: deliveryInfo.address,
          city: deliveryInfo.city,
          district: deliveryInfo.district,
        },
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Erreur sauvegarde adresse:', error);
      return false;
    }

    console.log('✅ Adresse sauvegardée');
    return true;

  } catch (error) {
    console.error('❌ Erreur:', error);
    return false;
  }
}

// ============================================
// FONCTIONS - COMMANDES COMPLÈTES
// ============================================

/**
 * Générer un numéro de commande unique
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CMD${year}${month}${day}${random}`;
}

/**
 * Sauvegarder une commande complète
 * ✅ CORRIGÉ - Utilise les noms de colonnes français de la table orders
 */
export async function saveCompleteOrder(
  userId: string,
  orderData: {
    orderNumber: string;
    orderDate: string;
    deliveryTime: string;
    fullName: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    district: string;
    paymentMethod: string;
    paymentReference?: string;
    subtotal: number;
    deliveryFee: number;
    totalAmount: number;
    status: string;
    paymentStatus?: string;
    orderItems: {
      breakfast: any[];
      lunch: any[];
      snack: any[];
      dinner: any[];
    };
  }
): Promise<string | null> {
  try {
    console.log('💾 Sauvegarde commande complète...');

    const adresseComplete = `${orderData.fullName} - ${orderData.phone}\n${orderData.address}\n${orderData.district}, ${orderData.city}`;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const itemsForDB: any[] = [];
    (['breakfast', 'lunch', 'snack', 'dinner'] as const).forEach((mealType) => {
      orderData.orderItems[mealType]?.forEach((item: any) => {
        const q = item.quality === 'standard' ? 1 : item.quality === 'premium' ? 1.5 : 2;
        const unitPrice = Math.round(item.price * item.quantity * q);

        itemsForDB.push({
          product_name: item.name,
          product_type: 'dish',
          quantity: item.quantity,
          unit: 'portion',
          quality: item.quality,
          prix_unitaire: item.price,
          prix_total: unitPrice,
          metadata: {
            mealType,
            category: item.category,
            cuisine: item.cuisine,
            country: item.country,
            // ✅ Convertir ingredients array en string pour la DB
            ingredients: Array.isArray(item.ingredients) 
              ? item.ingredients.join(', ') 
              : item.ingredients,
            emoji: '🍽️',
          },
        });
      });
    });

    const safe = (value: any, fallback: string = '') =>
      value !== undefined && value !== null ? value : fallback;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        numero_commande: orderData.orderNumber,
        total_fcfa: orderData.totalAmount,
        sous_total: orderData.subtotal,
        frais_livraison: orderData.deliveryFee,
        statut: safe(orderData.status, 'en_attente'),
        statut_paiement: safe(orderData.paymentStatus, 'en_attente'),
        methode_paiement: safe(orderData.paymentMethod, 'inconnu'),
        adresse_livraison: safe(adresseComplete, 'Adresse inconnue'),
        heure_livraison: safe(orderData.deliveryTime, '12:00'),
        nom_client: safe(orderData.fullName, 'Client'),
        telephone: safe(orderData.phone, '00000000'),
      
        items: itemsForDB,
      
        date_livraison_prevue: tomorrow.toISOString(),
        notes: null,
      })
      .select('id, numero_commande')
      .single();
      
    console.log("🚨 SUPABASE ERROR RAW:", orderError);

    if (orderError || !order) {
      console.error('❌ Erreur création commande:', orderError);
      return null;
    }

    console.log('✅ Commande complète sauvegardée:', order.numero_commande);
    return order.id;

  } catch (error) {
    console.error('❌ Erreur dans saveCompleteOrder:', error);
    return null;
  }
}



// ============================================
// FONCTIONS - TAILLE DE FAMILLE
// ============================================

/**
 * Charger la taille de famille
 * ✅ ADAPTÉ AUX COLONNES FRANÇAISES DE VOTRE BDD
 */
export async function loadFamilySize(userId: string): Promise<number> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('taille_famille')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('💡 Erreur chargement taille famille, valeur par défaut: 1');
      return 1;
    }

    return user?.taille_famille || 1;

  } catch (error) {
    console.error('❌ Erreur:', error);
    return 1;
  }
}

/**
 * Mettre à jour la taille de famille
 * ✅ ADAPTÉ AUX COLONNES FRANÇAISES DE VOTRE BDD
 */
export async function updateFamilySize(
  userId: string,
  familySize: number
): Promise<boolean> {
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
// EXPORT PAR DÉFAUT
// ============================================

export default {
  loadRestaurantOrders,
  saveRestaurantOrder,
  deleteRestaurantOrder,
  loadDeliveryAddress,
  saveDeliveryAddress,
  generateOrderNumber,
  saveCompleteOrder,
  loadFamilySize,
  updateFamilySize,
};