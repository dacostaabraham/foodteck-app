'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  loadRestaurantOrders,
  saveRestaurantOrder,
  deleteRestaurantOrder,
  loadDeliveryAddress,
  saveDeliveryAddress,
  saveCompleteOrder,
  generateOrderNumber,
  loadFamilySize,
  updateFamilySize,
} from '@/services/restoService';

// Types TypeScript
interface DishFromDB {
  id: string;
  nom: string;
  description: string;
  type_cuisine: string;
  type_repas: string;
  prix_fcfa: number;
  image_url: string | null;
  temps_preparation: number | null;
  niveau_difficulte: string | null;
  calories: number | null;
  category: string;
  country: string | null;
  ingredients: string[] | null;
  recipe: string | null;
  is_custom: boolean;
  is_validated: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  price: number;
  cuisine: string;
  country: string;
  ingredients: string[];
  recipe: string;
  isCustom: boolean;
  isValidated: boolean;
}

interface Meal {
  id: number | string;
  name: string;
  price: number;
  category: 'entree' | 'principal' | 'accompagnement' | 'dessert' | 'boisson';
  quantity: number;
  quality: 'standard' | 'premium' | 'bio';
  cuisine?: string;
  country?: string;
  ingredients?: string[];
  recipe?: string;
  orderId?: string;
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

// Mapping type_repas DB -> MealType
const DB_TO_MEAL_TYPE: Record<string, MealType> = {
  'petit-dejeuner': 'breakfast',
  'dejeuner': 'lunch',
  'gouter': 'snack',
  'diner': 'dinner'
};

// Mapping category DB -> category code
const DB_TO_CATEGORY: Record<string, string> = {
  'Entrée': 'entree',
  'Principal': 'principal',
  'Accompagnement': 'accompagnement',
  'Dessert': 'dessert',
  'Boisson': 'boisson'
};

const CATEGORY_TO_DB: Record<string, string> = {
  'entree': 'Entrée',
  'principal': 'Principal',
  'accompagnement': 'Accompagnement',
  'dessert': 'Dessert',
  'boisson': 'Boisson'
};

export default function RestoPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  // États
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMealType, setCurrentMealType] = useState<MealType>('breakfast');
  const [showMainModal, setShowMainModal] = useState(false);
  const [showMenuListModal, setShowMenuListModal] = useState(false);
  const [showMealDetailsModal, setShowMealDetailsModal] = useState(false);
  const [selectedMenuDetails, setSelectedMenuDetails] = useState<MenuItem | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState<'standard' | 'premium' | 'bio'>('standard');
  const [familySize, setFamilySize] = useState(1);
  const [currentCategory, setCurrentCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [mealsByDate, setMealsByDate] = useState<MealsByDate>({});

  // ✅ NOUVEAU: État pour les plats depuis Supabase
  const [dishesFromDB, setDishesFromDB] = useState<MenuItem[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(true);

  // États pour le flux de commande
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3 | 4>(1);
  const [deliveryInfo, setDeliveryInfo] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: 'Abidjan',
    district: '',
    deliveryDate: '',
    deliveryTime: '12:00'
  });
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'cash' | ''>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // ✅ NOUVEAU: Charger les plats depuis Supabase
  useEffect(() => {
    loadDishesFromSupabase();
  }, []);

  const loadDishesFromSupabase = async () => {
    setLoadingDishes(true);
    try {
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .eq('is_validated', true)
        .order('category', { ascending: true })
        .order('nom', { ascending: true });

      if (error) {
        console.error('Erreur chargement plats:', error);
        return;
      }

      if (data) {
        const formattedDishes: MenuItem[] = data.map((dish: DishFromDB) => ({
          id: dish.id,
          name: dish.nom,
          category: (DB_TO_CATEGORY[dish.category] || 'principal') as MenuItem['category'],
          price: dish.prix_fcfa,
          cuisine: dish.type_cuisine || 'Africaine',
          country: dish.country || 'Côte d\'Ivoire',
          ingredients: dish.ingredients || [],
          recipe: dish.recipe || '',
          isCustom: dish.is_custom,
          isValidated: dish.is_validated
        }));
        
        setDishesFromDB(formattedDishes);
        console.log(`✅ ${formattedDishes.length} plats chargés depuis Supabase`);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoadingDishes(false);
    }
  };

  // ✅ Chargement des données utilisateur au montage
  useEffect(() => {
    if (authLoading) return;
    
    if (user?.id) {
      loadDataFromSupabase();
    } else {
      setLoading(false);
      console.log('💡 Mode invité : Utilisation locale');
    }
  }, [user?.id, authLoading]);

  // ✅ Fonction de chargement depuis Supabase
  const loadDataFromSupabase = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Charger la taille de famille
      const loadedFamilySize = await loadFamilySize(user.id);
      setFamilySize(loadedFamilySize);

      // Charger les commandes restaurant
      const loadedOrders = await loadRestaurantOrders(user.id);
      
      // Transformer en MealsByDate
      const mealsByDateTemp: MealsByDate = {};
      loadedOrders.forEach((order) => {
        const dateKey = order.orderDate;
        if (!mealsByDateTemp[dateKey]) {
          mealsByDateTemp[dateKey] = {
            breakfast: [],
            lunch: [],
            snack: [],
            dinner: [],
          };
        }
        
        const meal: Meal = {
          id: order.id,
          name: order.dishName,
          price: order.dishPrice,
          category: order.dishCategory,
          quantity: order.quantity,
          quality: order.quality,
          cuisine: order.dishCuisine,
          country: order.dishCountry,
          ingredients: order.dishIngredients,
          recipe: order.dishRecipe,
          orderId: order.id,
        };
        
        mealsByDateTemp[dateKey][order.mealType].push(meal);
      });
      
      setMealsByDate(mealsByDateTemp);

      // Charger l'adresse de livraison sauvegardée
      const savedAddress = await loadDeliveryAddress(user.id);
      if (savedAddress) {
        setDeliveryInfo({
          fullName: savedAddress.fullName,
          phone: savedAddress.phone,
          address: savedAddress.address,
          city: savedAddress.city,
          district: savedAddress.district,
          deliveryDate: '',
          deliveryTime: '12:00'
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Debouncing pour la taille de famille
  useEffect(() => {
    if (user?.id && familySize > 0) {
      const timer = setTimeout(async () => {
        await updateFamilySize(user.id, familySize);
        console.log('✅ Taille famille sauvegardée:', familySize);
      }, 500);
      return () => clearTimeout(timer);
    } else if (!user?.id && familySize > 0) {
      localStorage.setItem('restoFamilySize', familySize.toString());
      console.log('💡 Mode invité : Taille famille en mémoire:', familySize);
    }
  }, [familySize, user?.id]);

  // Fonctions utilitaires
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

  const selectDate = (date: Date) => {
    setSelectedDate(date);
  };

  // ✅ Vérifier si une date est dans le passé
  const isDateInPast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Récupérer les repas de la date sélectionnée
  const getCurrentMeals = () => {
    const dateKey = formatDate(selectedDate);
    return mealsByDate[dateKey] || { breakfast: [], lunch: [], snack: [], dinner: [] };
  };

  // Calculer le total d'un type de repas
  const getMealTotal = (mealType: MealType): number => {
    const meals = getCurrentMeals()[mealType];
    return meals.reduce((sum, meal) => {
      const qualityMultiplier = meal.quality === 'standard' ? 1 : meal.quality === 'premium' ? 1.5 : 2;
      return sum + (meal.price * meal.quantity * qualityMultiplier * familySize);
    }, 0);
  };

  // Calculer le total de la journée
  const getDayTotal = (): number => {
    return getMealTotal('breakfast') + getMealTotal('lunch') + getMealTotal('snack') + getMealTotal('dinner');
  };

  // Gestion des modales
  const openAddModal = (mealType: MealType) => {
    if (isDateInPast(selectedDate)) {
      alert('❌ Impossible de commander pour une date passée. Veuillez sélectionner une date future.');
      return;
    }
    
    setCurrentMealType(mealType);
    setCurrentCategory('');
    setShowMainModal(true);
  };

  const closeAllModals = () => {
    setShowMainModal(false);
    setShowMenuListModal(false);
    setShowMealDetailsModal(false);
    setSelectedMenuDetails(null);
    setSelectedQuantity(1);
    setSelectedQuality('standard');
    setCurrentCategory('');
    setSearchQuery('');
  };

  const showMenuList = () => {
    if (!currentCategory) {
      alert('Veuillez d\'abord sélectionner une catégorie');
      return;
    }
    setShowMainModal(false);
    setShowMenuListModal(true);
  };

  const backToMainModal = () => {
    setShowMenuListModal(false);
    setShowMealDetailsModal(false);
    setShowMainModal(true);
    setSearchQuery('');
  };

  const backToMenuList = () => {
    setShowMealDetailsModal(false);
    setShowMenuListModal(true);
  };

  const showMealDetails = (menu: MenuItem) => {
    setSelectedMenuDetails(menu);
    setSelectedQuantity(1);
    setSelectedQuality('standard');
    setShowMenuListModal(false);
    setShowMealDetailsModal(true);
  };

  const changeQuantity = (delta: number) => {
    const newQuantity = selectedQuantity + delta;
    if (newQuantity >= 1 && newQuantity <= 20) {
      setSelectedQuantity(newQuantity);
    }
  };

  const selectQuality = (quality: 'standard' | 'premium' | 'bio') => {
    setSelectedQuality(quality);
  };

  const calculateTotalPrice = (): number => {
    if (!selectedMenuDetails) return 0;
    const qualityMultiplier = selectedQuality === 'standard' ? 1 : selectedQuality === 'premium' ? 1.5 : 2;
    return Math.round(selectedMenuDetails.price * selectedQuantity * qualityMultiplier * familySize);
  };

  // ✅ Confirmation de sélection de repas
  const confirmMealSelection = async () => {
    if (!selectedMenuDetails) return;

    const dateKey = formatDate(selectedDate);
    const newMeal: Meal = {
      id: Date.now(),
      name: selectedMenuDetails.name,
      price: selectedMenuDetails.price,
      category: selectedMenuDetails.category,
      quantity: selectedQuantity,
      quality: selectedQuality,
      cuisine: selectedMenuDetails.cuisine,
      country: selectedMenuDetails.country,
      ingredients: selectedMenuDetails.ingredients,
      recipe: selectedMenuDetails.recipe,
    };

    // ✅ MODE INVITÉ : Mémoire locale
    if (!user?.id) {
      setMealsByDate(prev => {
        const dateMeals = prev[dateKey] || { breakfast: [], lunch: [], snack: [], dinner: [] };
        const updatedMeals = {
          ...prev,
          [dateKey]: {
            ...dateMeals,
            [currentMealType]: [...dateMeals[currentMealType], newMeal]
          }
        };
        
        localStorage.setItem('restoMeals', JSON.stringify(updatedMeals));
        return updatedMeals;
      });
      console.log('💡 Mode invité : Repas ajouté en mémoire');
      closeAllModals();
      return;
    }

    // ✅ MODE CONNECTÉ : Supabase
    try {
      const orderId = await saveRestaurantOrder(
        user.id,
        dateKey,
        currentMealType,
        newMeal,
        familySize
      );

      if (orderId) {
        newMeal.orderId = orderId;
        
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
        console.log('✅ Repas sauvegardé dans Supabase');
      } else {
        alert('❌ Erreur lors de la sauvegarde du repas');
        return;
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('❌ Erreur lors de la sauvegarde du repas');
      return;
    }

    closeAllModals();
  };

  // ✅ Suppression de repas
  const removeMeal = async (mealType: MealType, mealId: number | string) => {
    const dateKey = formatDate(selectedDate);
    const meal = mealsByDate[dateKey]?.[mealType].find(m => m.id === mealId);
    
    // ✅ MODE INVITÉ
    if (!user?.id) {
      setMealsByDate(prev => {
        const dateMeals = prev[dateKey];
        if (!dateMeals) return prev;

        const updatedState = {
          ...prev,
          [dateKey]: {
            ...dateMeals,
            [mealType]: dateMeals[mealType].filter(meal => meal.id !== mealId)
          }
        };

        localStorage.setItem('restoMeals', JSON.stringify(updatedState));
        return updatedState;
      });

      console.log('💡 Mode invité : Suppression mémoire');
      return;
    }

    // ✅ MODE CONNECTÉ
    if (meal?.orderId) {
      try {
        const success = await deleteRestaurantOrder(meal.orderId, user.id);
        
        if (!success) {
          alert('❌ Erreur lors de la suppression du repas');
          return;
        }
        
        console.log('✅ Repas supprimé de Supabase');
      } catch (error) {
        console.error('❌ Erreur suppression:', error);
        alert('❌ Erreur lors de la suppression du repas');
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
          [mealType]: dateMeals[mealType].filter(meal => meal.id !== mealId)
        }
      };
    });
  };

  // ✅ NOUVEAU: Filtrer les menus depuis Supabase
  const getFilteredMenus = () => {
    return dishesFromDB.filter(menu => {
      const matchesCategory = menu.category === currentCategory;
      const matchesSearch = searchQuery === '' || 
        menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        menu.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
        menu.country.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  // Vérifier si une date a des repas
  const dateHasMeals = (date: Date): boolean => {
    const dateKey = formatDate(date);
    const meals = mealsByDate[dateKey];
    if (!meals) return false;
    return meals.breakfast.length > 0 || meals.lunch.length > 0 || meals.snack.length > 0 || meals.dinner.length > 0;
  };

  // ✅ NOUVEAU: Intégration Paystack
  const initiatePaystackPayment = async () => {
    const totalAmount = getDayTotal() + 500; // + frais de livraison
    
    // @ts-ignore - Paystack est chargé via script
    const handler = window.PaystackPop?.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: user?.email || 'guest@talier.ci',
      amount: totalAmount * 100, // Paystack utilise les centimes
      currency: 'XOF',
      ref: `TALIER-${Date.now()}`,
      metadata: {
        custom_fields: [
          {
            display_name: "Commande",
            variable_name: "order_type",
            value: "Restaurant"
          },
          {
            display_name: "Date livraison",
            variable_name: "delivery_date",
            value: formatDate(selectedDate)
          }
        ]
      },
      callback: function(response: any) {
        console.log('✅ Paiement réussi:', response.reference);
        finalizeCompleteOrder(response.reference);
        setCheckoutStep(4);
      },
      onClose: function() {
        setIsProcessingPayment(false);
        console.log('❌ Paiement annulé');
      }
    });

    if (handler) {
      handler.openIframe();
    } else {
      alert('Erreur: Paystack non chargé. Veuillez réessayer.');
      setIsProcessingPayment(false);
    }
  };

  // ✅ Finalisation complète de la commande
  const finalizeCompleteOrder = async (paymentRef?: string) => {
    if (!user?.id) {
      console.log('💡 Mode invité : Commande non sauvegardée');
      resetCheckout();
      return;
    }

    try {
      const orderNumber = await generateOrderNumber();
      
      const orderData = {
        orderNumber,
        orderDate: formatDate(selectedDate),
        deliveryTime: deliveryInfo.deliveryTime,
        fullName: deliveryInfo.fullName,
        phone: deliveryInfo.phone,
        address: deliveryInfo.address,
        city: deliveryInfo.city,
        district: deliveryInfo.district,
        paymentMethod,
        paymentRef: paymentRef || null,
        subtotal: getDayTotal(),
        deliveryFee: 500,
        totalAmount: getDayTotal() + 500,
        status: paymentMethod === 'paystack' ? 'paid' : 'pending' as const,
        orderItems: getCurrentMeals(),
      };

      const completeOrderId = await saveCompleteOrder(user.id, orderData);
      
      if (completeOrderId) {
        console.log('✅ Commande complète sauvegardée:', orderNumber);
        
        await saveDeliveryAddress(user.id, {
          fullName: deliveryInfo.fullName,
          phone: deliveryInfo.phone,
          address: deliveryInfo.address,
          city: deliveryInfo.city,
          district: deliveryInfo.district,
          isDefault: true,
        });
      } else {
        alert('Erreur lors de la sauvegarde de la commande');
      }
    } catch (error) {
      console.error('Erreur finalizeCompleteOrder:', error);
    }
  };

  const resetCheckout = () => {
    setShowCheckoutModal(false);
    setCheckoutStep(1);
    setPaymentMethod('');
    setIsProcessingPayment(false);
  };

  const weekDates = getWeekDates(currentDate);
  const currentMeals = getCurrentMeals();

  // ✅ Afficher loader pendant chargement
  if (loading || authLoading || loadingDishes) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #d4c5f0 0%, #c9b5e8 100%)' }}>
        <Header />
        <main className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-xl font-semibold" style={{ color: '#5a4a7c' }}>
              {loadingDishes ? 'Chargement des plats...' : authLoading ? 'Initialisation...' : 'Chargement de vos commandes...'}
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

      {/* Script Paystack */}
      <script src="https://js.paystack.co/v1/inline.js" async></script>

      {/* ✅ Bannière mode invité */}
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
                  Vos commandes ne seront pas sauvegardées. Créez un compte pour les conserver !
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
              <span className="text-3xl">🍽️</span>
              <h1 className="text-3xl font-bold">Plan Resto</h1>
            </div>
            <p className="text-lg opacity-95 text-center max-w-3xl">
              Commande et livraison de repas • {dishesFromDB.length} plats disponibles
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
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden">
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
                    {isDateInPast(selectedDate) ? 'Date passée' : '+ Commander un plat'}
                  </span>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      {currentMeals[mealType].map((meal) => {
                        const categoryLabel = 
                          meal.category === 'entree' ? 'Entrée' :
                          meal.category === 'principal' ? 'Principal' :
                          meal.category === 'accompagnement' ? 'Accompagnement' :
                          meal.category === 'dessert' ? 'Dessert' :
                          'Boisson';
                        
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
                        + Ajouter un autre plat
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

        {/* Bouton de finalisation */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => {
              const meals = getCurrentMeals();
              const hasOrders = meals.breakfast.length > 0 || meals.lunch.length > 0 || meals.snack.length > 0 || meals.dinner.length > 0;
              
              if (!hasOrders) {
                alert('Veuillez faire vos commandes de la journée');
              } else if (isDateInPast(selectedDate)) {
                alert('❌ Impossible de finaliser une commande pour une date passée');
              } else {
                setCheckoutStep(1);
                setShowCheckoutModal(true);
              }
            }}
            className="px-12 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl"
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
            Finaliser la commande du jour
          </button>
        </div>
      </main>

      <Footer />

      {/* Modal overlay */}
      {(showMainModal || showMenuListModal || showMealDetailsModal || showCheckoutModal) && (
        <div
          onClick={() => {
            if (showCheckoutModal) {
              setShowCheckoutModal(false);
              setCheckoutStep(1);
            } else {
              closeAllModals();
            }
          }}
          className="fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* Modal principal */}
      {showMainModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[400px]" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            Ajouter un plat - {MEAL_TYPE_LABELS[currentMealType]}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Catégorie</label>
              <select
                value={currentCategory}
                onChange={(e) => setCurrentCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none"
                style={{ border: '2px solid #e0d4f7' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
              >
                <option value="">Sélectionner une catégorie</option>
                <option value="entree">Entrée</option>
                <option value="principal">Principal</option>
                <option value="dessert">Dessert</option>
                <option value="boisson">Boisson</option>
                <option value="accompagnement">Accompagnement</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Sélectionner un plat</label>
              <button
                onClick={showMenuList}
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
                <span className="text-sm font-semibold" style={{ color: '#5a4a7c' }}>Voir nos plats disponibles</span>
              </button>
            </div>
          </div>
          <Button variant="secondary" onClick={closeAllModals} className="w-full mt-6">
            Annuler
          </Button>
        </div>
      )}

      {/* Modal liste de menus */}
      {showMenuListModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[600px] max-w-[700px] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            🍽️ Nos plats disponibles ({getFilteredMenus().length})
          </h2>
          
          <input
            type="text"
            placeholder="🔍 Rechercher un plat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-xl mb-4 focus:outline-none"
            style={{ border: '2px solid #e0d4f7' }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
          />

          <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
            {getFilteredMenus().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun plat trouvé dans cette catégorie
              </div>
            ) : (
              getFilteredMenus().map((menu) => (
                <div
                  key={menu.id}
                  onClick={() => showMealDetails(menu)}
                  className="flex justify-between items-center p-4 rounded-xl cursor-pointer transition-all"
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
                  <div>
                    <div className="font-semibold" style={{ color: '#5a4a7c' }}>{menu.name}</div>
                    <div className="text-sm" style={{ color: '#999' }}>{menu.cuisine} - {menu.country}</div>
                  </div>
                  <div className="font-bold" style={{ color: '#5a4a7c' }}>{menu.price.toLocaleString()} FCFA</div>
                </div>
              ))
            )}
          </div>

          <Button variant="secondary" onClick={backToMainModal} className="w-full">
            Retour
          </Button>
        </div>
      )}

      {/* Modal détails du plat */}
      {showMealDetailsModal && selectedMenuDetails && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 min-w-[600px] max-w-[700px] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#333' }}>
            {selectedMenuDetails.name}
          </h2>

          <div className="space-y-5 mb-6">
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>🌍 Origine</div>
              <div style={{ color: '#333' }}>{selectedMenuDetails.cuisine} - {selectedMenuDetails.country}</div>
            </div>

            {selectedMenuDetails.ingredients && selectedMenuDetails.ingredients.length > 0 && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
                <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>🥗 Ingrédients</div>
                <div className="text-sm" style={{ color: '#333' }}>
                  {selectedMenuDetails.ingredients.join(', ')}
                </div>
              </div>
            )}

            {selectedMenuDetails.recipe && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
                <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>📖 Recette</div>
                <div className="text-sm" style={{ color: '#666' }}>{selectedMenuDetails.recipe}</div>
              </div>
            )}

            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>👥 Nombre de personnes</div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => changeQuantity(-1)}
                  className="text-white w-10 h-10 rounded-full text-xl font-bold transition-all"
                  style={{ backgroundColor: '#5a4a7c' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a6a9c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5a4a7c'}
                >
                  -
                </button>
                <input
                  type="number"
                  value={selectedQuantity}
                  readOnly
                  className="w-16 px-3 py-2 text-center text-lg font-bold rounded-lg"
                  style={{ border: '2px solid #e0d4f7' }}
                />
                <button
                  onClick={() => changeQuantity(1)}
                  className="text-white w-10 h-10 rounded-full text-xl font-bold transition-all"
                  style={{ backgroundColor: '#5a4a7c' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7a6a9c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5a4a7c'}
                >
                  +
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-3" style={{ color: '#5a4a7c' }}>⭐ Qualité</div>
              <div className="flex gap-3">
                {(['standard', 'premium', 'bio'] as const).map((quality) => (
                  <button
                    key={quality}
                    onClick={() => selectQuality(quality)}
                    className="flex-1 p-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: selectedQuality === quality ? '#5a4a7c' : 'white',
                      color: selectedQuality === quality ? 'white' : '#5a4a7c',
                      border: `2px solid ${selectedQuality === quality ? '#5a4a7c' : '#e0d4f7'}`
                    }}
                    onMouseEnter={(e) => {
                      if (selectedQuality !== quality) {
                        e.currentTarget.style.borderColor = '#9b7ec9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedQuality !== quality) {
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

            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
              <div className="font-bold text-sm mb-2" style={{ color: '#5a4a7c' }}>💰 Prix total</div>
              <div className="text-3xl font-bold text-center" style={{ color: '#5a4a7c' }}>
                {calculateTotalPrice().toLocaleString()} FCFA
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={backToMenuList} className="flex-1">
              Retour
            </Button>
            <Button variant="primary" onClick={confirmMealSelection} className="flex-[2]">
              Commander pour livraison
            </Button>
          </div>
        </div>
      )}

      {/* Modal Checkout */}
      {showCheckoutModal && (
        <div 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-4xl max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header avec stepper */}
          <div className="p-6 border-b" style={{ borderColor: '#e0d4f7' }}>
            <div className="flex items-center justify-between mb-6">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                    style={{
                      backgroundColor: checkoutStep >= step ? '#5a4a7c' : '#e0d4f7',
                      color: checkoutStep >= step ? 'white' : '#999'
                    }}
                  >
                    {checkoutStep > step ? '✓' : step}
                  </div>
                  {step < 4 && (
                    <div 
                      className="flex-1 h-1 mx-2"
                      style={{ backgroundColor: checkoutStep > step ? '#5a4a7c' : '#e0d4f7' }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold" style={{ color: '#333' }}>
                {checkoutStep === 1 && '📋 Récapitulatif de votre commande'}
                {checkoutStep === 2 && '🚚 Informations de livraison'}
                {checkoutStep === 3 && '💳 Mode de paiement'}
                {checkoutStep === 4 && '✅ Confirmation de commande'}
              </h2>
            </div>
          </div>

          <div className="p-8">
            {/* Étape 1: Récapitulatif */}
            {checkoutStep === 1 && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold" style={{ color: '#5a4a7c' }}>📅 Date de commande</span>
                    <span className="font-semibold" style={{ color: '#333' }}>
                      {getDayName(selectedDate)} {selectedDate.getDate()} {getMonthNameFull(selectedDate)} {selectedDate.getFullYear()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold" style={{ color: '#5a4a7c' }}>👥 Nombre de personnes</span>
                    <span className="font-semibold" style={{ color: '#333' }}>{familySize} personne{familySize > 1 ? 's' : ''}</span>
                  </div>
                </div>

                {(['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).map((mealType) => {
                  const meals = getCurrentMeals()[mealType];
                  if (meals.length === 0) return null;

                  return (
                    <div key={mealType} className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
                      <h3 className="font-bold mb-3 text-lg" style={{ color: '#5a4a7c' }}>
                        {MEAL_TYPE_LABELS[mealType]}
                      </h3>
                      <div className="space-y-2">
                        {meals.map((meal) => {
                          const categoryLabel = 
                            meal.category === 'entree' ? 'Entrée' :
                            meal.category === 'principal' ? 'Principal' :
                            meal.category === 'accompagnement' ? 'Accompagnement' :
                            meal.category === 'dessert' ? 'Dessert' :
                            'Boisson';
                          
                          const qualityMultiplier = meal.quality === 'standard' ? 1 : meal.quality === 'premium' ? 1.5 : 2;
                          const totalPrice = Math.round(meal.price * meal.quantity * qualityMultiplier * familySize);

                          return (
                            <div key={meal.id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                              <div>
                                <div className="font-semibold" style={{ color: '#333' }}>
                                  <span style={{ color: '#5a4a7c' }}>{categoryLabel}:</span> {meal.name}
                                </div>
                                <div className="text-sm" style={{ color: '#666' }}>
                                  {meal.quantity} pers. × {meal.quality === 'standard' ? 'Standard' : meal.quality === 'premium' ? 'Premium' : 'Bio'}
                                  {familySize > 1 && ` × ${familySize} (famille)`}
                                </div>
                              </div>
                              <div className="font-bold" style={{ color: '#5a4a7c' }}>
                                {totalPrice.toLocaleString()} FCFA
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center" style={{ borderColor: '#e0d4f7' }}>
                        <span className="font-semibold" style={{ color: '#666' }}>Sous-total</span>
                        <span className="font-bold text-lg" style={{ color: '#5a4a7c' }}>
                          {getMealTotal(mealType).toLocaleString()} FCFA
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div className="p-6 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold">Total de la commande</span>
                    <span className="text-3xl font-bold">{getDayTotal().toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setShowCheckoutModal(false);
                      setCheckoutStep(1);
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => setCheckoutStep(2)}
                    className="flex-[2]"
                  >
                    Continuer vers la livraison
                  </Button>
                </div>
              </div>
            )}

            {/* Étape 2: Formulaire de livraison */}
            {checkoutStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Nom complet *</label>
                    <input
                      type="text"
                      value={deliveryInfo.fullName}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, fullName: e.target.value})}
                      placeholder="Ex: Kouassi Jean"
                      className="w-full px-4 py-3 rounded-xl focus:outline-none"
                      style={{ border: '2px solid #e0d4f7' }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Téléphone *</label>
                    <input
                      type="tel"
                      value={deliveryInfo.phone}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, phone: e.target.value})}
                      placeholder="Ex: +225 07 XX XX XX XX"
                      className="w-full px-4 py-3 rounded-xl focus:outline-none"
                      style={{ border: '2px solid #e0d4f7' }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Adresse de livraison *</label>
                  <input
                    type="text"
                    value={deliveryInfo.address}
                    onChange={(e) => setDeliveryInfo({...deliveryInfo, address: e.target.value})}
                    placeholder="Ex: Cocody, Angré 8ème tranche, Villa 123"
                    className="w-full px-4 py-3 rounded-xl focus:outline-none"
                    style={{ border: '2px solid #e0d4f7' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Commune *</label>
                    <select
                      value={deliveryInfo.district}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, district: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none"
                      style={{ border: '2px solid #e0d4f7' }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
                    >
                      <option value="">Sélectionner une commune</option>
                      <option value="Cocody">Cocody</option>
                      <option value="Plateau">Plateau</option>
                      <option value="Marcory">Marcory</option>
                      <option value="Koumassi">Koumassi</option>
                      <option value="Treichville">Treichville</option>
                      <option value="Adjamé">Adjamé</option>
                      <option value="Yopougon">Yopougon</option>
                      <option value="Abobo">Abobo</option>
                      <option value="Attécoubé">Attécoubé</option>
                      <option value="Port-Bouët">Port-Bouët</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Ville</label>
                    <input
                      type="text"
                      value={deliveryInfo.city}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl bg-gray-100"
                      style={{ border: '2px solid #e0d4f7', color: '#666' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Date de livraison</label>
                    <input
                      type="text"
                      value={`${getDayName(selectedDate)} ${selectedDate.getDate()} ${getMonthNameFull(selectedDate)}`}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl bg-gray-100"
                      style={{ border: '2px solid #e0d4f7', color: '#666' }}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2" style={{ color: '#5a4a7c' }}>Heure de livraison *</label>
                    <select
                      value={deliveryInfo.deliveryTime}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, deliveryTime: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none"
                      style={{ border: '2px solid #e0d4f7' }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
                    >
                      <option value="08:00">08h00 - 09h00</option>
                      <option value="09:00">09h00 - 10h00</option>
                      <option value="10:00">10h00 - 11h00</option>
                      <option value="11:00">11h00 - 12h00</option>
                      <option value="12:00">12h00 - 13h00</option>
                      <option value="13:00">13h00 - 14h00</option>
                      <option value="14:00">14h00 - 15h00</option>
                      <option value="15:00">15h00 - 16h00</option>
                      <option value="16:00">16h00 - 17h00</option>
                      <option value="17:00">17h00 - 18h00</option>
                      <option value="18:00">18h00 - 19h00</option>
                      <option value="19:00">19h00 - 20h00</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-xl" style={{ backgroundColor: '#fff4e6', border: '1px solid #ffd699' }}>
                  <div className="flex gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <div className="font-semibold mb-1" style={{ color: '#d97706' }}>Frais de livraison</div>
                      <div className="text-sm" style={{ color: '#92400e' }}>
                        Frais de livraison fixe : 500 FCFA
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="secondary" 
                    onClick={() => setCheckoutStep(1)}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      if (!deliveryInfo.fullName || !deliveryInfo.phone || !deliveryInfo.address || !deliveryInfo.district) {
                        alert('Veuillez remplir tous les champs obligatoires');
                      } else {
                        setCheckoutStep(3);
                      }
                    }}
                    className="flex-[2]"
                  >
                    Continuer vers le paiement
                  </Button>
                </div>
              </div>
            )}

            {/* Étape 3: Paiement */}
            {checkoutStep === 3 && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold" style={{ color: '#666' }}>Montant de la commande</span>
                    <span className="font-bold text-lg" style={{ color: '#5a4a7c' }}>{getDayTotal().toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold" style={{ color: '#666' }}>Frais de livraison</span>
                    <span className="font-bold text-lg" style={{ color: '#5a4a7c' }}>500 FCFA</span>
                  </div>
                  <div className="pt-2 border-t flex justify-between items-center" style={{ borderColor: '#e0d4f7' }}>
                    <span className="font-bold text-lg" style={{ color: '#333' }}>Total à payer</span>
                    <span className="font-bold text-2xl" style={{ color: '#5a4a7c' }}>{(getDayTotal() + 500).toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-4 text-lg" style={{ color: '#5a4a7c' }}>Choisissez votre mode de paiement</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setPaymentMethod('paystack')}
                      className="p-6 rounded-xl transition-all"
                      style={{
                        border: `3px solid ${paymentMethod === 'paystack' ? '#00C3F7' : '#e0d4f7'}`,
                        backgroundColor: paymentMethod === 'paystack' ? '#E6F9FF' : 'white'
                      }}
                    >
                      <div className="text-4xl mb-2">💳</div>
                      <div className="font-semibold" style={{ color: '#333' }}>Paystack</div>
                      <div className="text-xs mt-1" style={{ color: '#666' }}>Wave, Orange Money, MTN, Carte</div>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className="p-6 rounded-xl transition-all"
                      style={{
                        border: `3px solid ${paymentMethod === 'cash' ? '#22c55e' : '#e0d4f7'}`,
                        backgroundColor: paymentMethod === 'cash' ? '#ecfdf5' : 'white'
                      }}
                    >
                      <div className="text-4xl mb-2">💵</div>
                      <div className="font-semibold" style={{ color: '#333' }}>Paiement à la livraison</div>
                      <div className="text-xs mt-1" style={{ color: '#666' }}>Espèces uniquement</div>
                    </button>
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#ecfdf5', border: '1px solid #86efac' }}>
                    <div className="flex gap-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <div className="font-semibold mb-1" style={{ color: '#166534' }}>Paiement à la livraison</div>
                        <div className="text-sm" style={{ color: '#14532d' }}>
                          Vous paierez en espèces lors de la réception de votre commande.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'paystack' && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd' }}>
                    <div className="flex gap-3">
                      <span className="text-2xl">ℹ️</span>
                      <div>
                        <div className="font-semibold mb-1" style={{ color: '#1e40af' }}>Paiement sécurisé Paystack</div>
                        <div className="text-sm" style={{ color: '#1e3a8a' }}>
                          Vous serez redirigé vers la plateforme Paystack pour finaliser votre paiement (Wave, Orange Money, MTN, Carte bancaire).
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button 
                    variant="secondary" 
                    onClick={() => setCheckoutStep(2)}
                    className="flex-1"
                    disabled={isProcessingPayment}
                  >
                    Retour
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      if (!paymentMethod) {
                        alert('Veuillez sélectionner un mode de paiement');
                        return;
                      }
                      
                      if (paymentMethod === 'paystack') {
                        setIsProcessingPayment(true);
                        initiatePaystackPayment();
                      } else {
                        finalizeCompleteOrder();
                        setCheckoutStep(4);
                      }
                    }}
                    className="flex-[2]"
                    disabled={!paymentMethod || isProcessingPayment}
                  >
                    {isProcessingPayment ? 'Traitement...' : 'Confirmer et payer'}
                  </Button>
                </div>
              </div>
            )}

            {/* Étape 4: Confirmation */}
            {checkoutStep === 4 && (
              <div className="text-center space-y-6 py-8">
                <div className="text-8xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold" style={{ color: '#5a4a7c' }}>
                  Commande confirmée !
                </h2>
                <p className="text-lg" style={{ color: '#666' }}>
                  Merci pour votre commande. Vous recevrez une confirmation par SMS.
                </p>

                <div className="p-6 rounded-xl max-w-md mx-auto" style={{ backgroundColor: '#f9f7fc', border: '1px solid #e0d4f7' }}>
                  <div className="space-y-3 text-left">
                    <div className="flex justify-between">
                      <span className="font-semibold" style={{ color: '#666' }}>N° de commande</span>
                      <span className="font-bold" style={{ color: '#5a4a7c' }}>#{Date.now().toString().slice(-6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold" style={{ color: '#666' }}>Date de livraison</span>
                      <span className="font-bold" style={{ color: '#5a4a7c' }}>
                        {selectedDate.getDate()} {getMonthNameFull(selectedDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold" style={{ color: '#666' }}>Heure</span>
                      <span className="font-bold" style={{ color: '#5a4a7c' }}>{deliveryInfo.deliveryTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold" style={{ color: '#666' }}>Paiement</span>
                      <span className="font-bold" style={{ color: '#5a4a7c' }}>
                        {paymentMethod === 'paystack' ? 'Payé ✅' : 'À la livraison'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold" style={{ color: '#666' }}>Montant total</span>
                      <span className="font-bold text-xl" style={{ color: '#5a4a7c' }}>{(getDayTotal() + 500).toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      resetCheckout();
                    }}
                    className="w-full max-w-md mx-auto"
                  >
                    Retour à l'accueil
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
