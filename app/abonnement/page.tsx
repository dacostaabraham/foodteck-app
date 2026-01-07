'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ========== TYPES ET INTERFACES ==========

interface SubscriptionPlan {
  id: string;
  name: string;
  emoji?: string;
  price: number;
  features: string[];
  mealsPerDay: number;
  popular?: boolean;
}

interface ActiveSubscription {
  id: number;
  name: string;
  mealsPerDay: number;
  planning: WeeklyPlanning;
  startDate: Date;
}

interface WeeklyPlanning {
  [dateStr: string]: {
    [mealType: string]: number; // menuId
  };
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  description: string;
}

interface MealSelection {
  [mealType: string]: number; // menuId
}

// ========== DONNÉES DES MENUS ==========

const menusDataSubscription: Record<string, MenuItem[]> = {
  'petit-dejeuner': [
    { id: 101, name: 'Café + Pain beurré', price: 1500, description: 'Café noir avec pain beurré et confiture' },
    { id: 102, name: 'Omelette + Jus d\'orange', price: 2000, description: 'Omelette nature et jus d\'orange frais' },
    { id: 103, name: 'Croissant + Thé', price: 1800, description: 'Croissant frais et thé chaud au lait' },
    { id: 104, name: 'Pancakes au sirop', price: 2500, description: 'Pancakes moelleux au sirop d\'érable' },
    { id: 105, name: 'Yaourt & Fruits frais', price: 2200, description: 'Yaourt nature avec fruits frais de saison' },
    { id: 106, name: 'Pain perdu', price: 2000, description: 'Pain perdu caramélisé' },
    { id: 107, name: 'Smoothie bowl', price: 2800, description: 'Smoothie bowl aux fruits et granola' }
  ],
  'dejeuner': [
    { id: 201, name: 'Riz + Poulet braisé', price: 3500, description: 'Riz blanc avec poulet braisé à l\'ivoirienne' },
    { id: 202, name: 'Attiéké Poisson', price: 4000, description: 'Attiéké avec poisson braisé et légumes' },
    { id: 203, name: 'Alloco + Sauce tomate', price: 2500, description: 'Bananes plantain frites avec sauce pimentée' },
    { id: 204, name: 'Spaghetti Bolognaise', price: 3000, description: 'Pâtes à la sauce bolognaise maison' },
    { id: 205, name: 'Foutou + Sauce graine', price: 3500, description: 'Foutou traditionnel avec sauce graine' },
    { id: 206, name: 'Poulet DG', price: 4500, description: 'Poulet Directeur Général aux légumes' },
    { id: 207, name: 'Garba', price: 3000, description: 'Attiéké avec thon et légumes' },
    { id: 208, name: 'Kedjenou de poulet', price: 4000, description: 'Poulet mijoté aux légumes et épices' }
  ],
  'diner': [
    { id: 301, name: 'Salade César', price: 3000, description: 'Salade César au poulet grillé' },
    { id: 302, name: 'Soupe de légumes', price: 2000, description: 'Soupe aux légumes frais du jour' },
    { id: 303, name: 'Sandwich Poulet grillé', price: 2500, description: 'Sandwich au poulet grillé et crudités' },
    { id: 304, name: 'Pizza Margherita', price: 4500, description: 'Pizza à la tomate et mozzarella fraîche' },
    { id: 305, name: 'Riz Cantonnais', price: 3500, description: 'Riz sauté aux légumes et œufs' },
    { id: 306, name: 'Wrap végétarien', price: 2800, description: 'Wrap aux légumes grillés et houmous' },
    { id: 307, name: 'Quiche Lorraine', price: 3200, description: 'Quiche aux lardons et fromage' }
  ]
};

// ========== COMPOSANT PRINCIPAL ==========

export default function AbonnementPage() {
  const { user, isAuthenticated } = useAuth();
  
  // États
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [currentPlanningSubscription, setCurrentPlanningSubscription] = useState<ActiveSubscription | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<{ date: string; name: string } | null>(null);
  const [selectedMealType, setSelectedMealType] = useState('petit-dejeuner');
  const [tempSelection, setTempSelection] = useState<MealSelection>({});
  const [showMealModal, setShowMealModal] = useState(false);
  const [familySize] = useState(4);

  // Plans d'abonnement
  const plans: SubscriptionPlan[] = [
    {
      id: 'standard',
      name: 'Menu Standard',
      price: 15000,
      mealsPerDay: 2,
      features: [
        'Planning de 2 menus/Jour (Déjeuner + Dîner)',
        'Ingrédients qualité standard',
        'Livraison/semaine',
        'Modifier planning (possible 48h avant)'
      ]
    },
    {
      id: 'actif',
      name: 'Menu Actif',
      price: 25000,
      mealsPerDay: 2,
      popular: true,
      features: [
        'Planning de 2 menus/jour (Déjeuner + Dîner)',
        'Ingrédients qualité premium',
        'Livraison hebdomadaire',
        'Modification du planning (48h avant)',
        'Recettes incluses',
        'Support client'
      ]
    },
    {
      id: 'premium',
      name: 'Menu Premium',
      price: 40000,
      mealsPerDay: 3,
      features: [
        'Planning de 3 menus/jour (Petit-Déjeuner + Déjeuner + Dîner)',
        'Ingrédients bio inclus',
        'Livraison hebdomadaire',
        'Modification du planning (48h avant)',
        'Recettes incluses',
        'Support client prioritaire'
      ]
    },
    {
      id: 'bio',
      name: 'Menu 100% Bio',
      emoji: '👑',
      price: 90000,
      mealsPerDay: 2,
      features: [
        'Planning de 2 menus/jour (Déjeuner + Dîner)',
        'Ingrédients bio exclusifs',
        'Ingrédients ultra frais',
        'Ingrédients du potager personnel',
        'Livraison hebdomadaire',
        'Modification du planning (48h avant)',
        'Recettes+conseil de Chef étoilé',
        'Support client prioritaire'
      ]
    },
    {
      id: 'sain',
      name: 'Menu Sain',
      emoji: '🥗',
      price: 60000,
      mealsPerDay: 3,
      features: [
        'Planning de 3 menus équilibrés/jour (Petit-Déjeuner + Déjeuner + Dîner)',
        'Sélection d\'ingrédients premium',
        'Menus validés par nutritionniste',
        'Portions ajustées aux besoins',
        'Suivi nutritionnel mensuel +15 000 FCFA',
        'Livraison hebdomadaire',
        'Modification du planning (48h avant)',
        'Fiches nutritionnelles détaillées'
      ]
    },
    {
      id: 'sante',
      name: 'Menu Santé',
      emoji: '💊',
      price: 40000,
      mealsPerDay: 3,
      features: [
        'Planning de 3 menus thérapeutiques/jour (Petit-Déjeuner + Déjeuner + Dîner)',
        'Menus adaptés aux pathologies',
        'Diabète, hypertension, cholestérol',
        'Consultations diététiques +30 000 FCFA',
        'Recettes à faible index glycémique',
        'Support nutritionniste dédié',
        'Livraison hebdomadaire',
        'Rapports nutritionnel mensuels'
      ]
    }
  ];

  // ========== EFFETS ==========

  useEffect(() => {
    loadSubscriptions();
  }, [user, isAuthenticated]);

  useEffect(() => {
    saveSubscriptions();
  }, [activeSubscriptions]);

  // ========== FONCTIONS DE GESTION DES ABONNEMENTS ==========

  const loadSubscriptions = async () => {
    try {
      // Si connecté, charger depuis Supabase
      if (isAuthenticated && user?.id) {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('subscription_type', 'menu')
          .eq('status', 'active');

        if (!error && data && data.length > 0) {
          const subscriptions: ActiveSubscription[] = data.map(sub => ({
            id: sub.id,
            name: sub.plan_name,
            mealsPerDay: sub.meals_per_day || 2,
            planning: sub.planning || {},
            startDate: new Date(sub.start_date)
          }));
          setActiveSubscriptions(subscriptions);
          return;
        }
      }
      
      // Sinon charger depuis localStorage
      const saved = localStorage.getItem('popoteapp_subscriptions');
      if (saved) {
        const subscriptions: ActiveSubscription[] = JSON.parse(saved);
        subscriptions.forEach(sub => {
          sub.startDate = new Date(sub.startDate);
        });
        setActiveSubscriptions(subscriptions);
      }
    } catch (e) {
      console.error('Erreur de chargement:', e);
    }
  };

  const saveSubscriptions = async () => {
  try {
    if (activeSubscriptions.length === 0) {
      localStorage.removeItem('popoteapp_subscriptions');
    } else {
      localStorage.setItem('popoteapp_subscriptions', JSON.stringify(activeSubscriptions));
    }

    // Si connecté, sauvegarder aussi dans Supabase
    if (isAuthenticated && user?.id && activeSubscriptions.length > 0) {
      for (const sub of activeSubscriptions) {
        const plan = plans.find(p => p.id === sub.name);
        
        // Chercher si cet abonnement existe déjà
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('plan_name', sub.name)
          .eq('subscription_type', 'menu')
          .single();

        if (existing) {
          // UPDATE si existe
          await supabase
            .from('subscriptions')
            .update({
              plan_price: plan?.price || 0,
              meals_per_day: sub.mealsPerDay,
              planning: sub.planning,
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          // INSERT si n'existe pas
          await supabase
            .from('subscriptions')
            .insert({
              user_id: user.id,
              subscription_type: 'menu',
              plan_name: sub.name,
              plan_price: plan?.price || 0,
              meals_per_day: sub.mealsPerDay,
              planning: sub.planning,
              status: 'active',
              start_date: sub.startDate.toISOString()
            });
        }
      }
    }
  } catch (e) {
    console.error('Erreur de sauvegarde:', e);
  }
};

  const subscribeToPlans = (planName: string, mealsPerDay: number) => {
    const existingIndex = activeSubscriptions.findIndex(sub => sub.name === planName);
    
    if (existingIndex !== -1) {
      alert(`Vous êtes déjà abonné au plan ${planName.toUpperCase()} !`);
      return;
    }

    const newSubscription: ActiveSubscription = {
      id: Date.now(),
      name: planName,
      mealsPerDay: mealsPerDay,
      planning: {},
      startDate: new Date()
    };

    setActiveSubscriptions([...activeSubscriptions, newSubscription]);
    setCurrentPlanningSubscription(newSubscription);
    setCurrentWeekOffset(0);
    
    alert(`Abonnement ${planName.toUpperCase()} activé avec succès ! 🎉`);
  };

  const unsubscribe = async (subscriptionId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir vous désabonner ?')) {
      return;
    }

    // Supprimer de Supabase si connecté
    if (isAuthenticated && user?.id) {
      await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId)
        .eq('user_id', user.id);
    }

    setActiveSubscriptions(activeSubscriptions.filter(sub => sub.id !== subscriptionId));
    
    if (currentPlanningSubscription && currentPlanningSubscription.id === subscriptionId) {
      setCurrentPlanningSubscription(null);
    }
    
    alert('Désabonnement effectué avec succès');
  };

  const selectSubscriptionForPlanning = (subscriptionId: number) => {
    const subscription = activeSubscriptions.find(sub => sub.id === subscriptionId);
    if (!subscription) return;

    setCurrentPlanningSubscription(subscription);
    setCurrentWeekOffset(0);
  };

  const resetAllSubscriptions = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer TOUS les abonnements ?')) {
      return;
    }
    
    // Supprimer de Supabase si connecté
    if (isAuthenticated && user?.id) {
      await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('subscription_type', 'menu');
    }
    
    localStorage.removeItem('popoteapp_subscriptions');
    setActiveSubscriptions([]);
    setCurrentPlanningSubscription(null);
    alert('Tous les abonnements ont été supprimés');
  };

  // ========== FONCTIONS DE PLANIFICATION ==========

  const changeWeek = (direction: number) => {
    setCurrentWeekOffset(currentWeekOffset + direction);
  };

  const getWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + (currentWeekOffset * 7));

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      dates.push(currentDate);
    }
    return dates;
  };

  const getWeekDisplayText = () => {
    const dates = getWeekDates();
    const monday = dates[0];
    const sunday = dates[6];
    
    const startDate = monday.getDate();
    const endDate = sunday.getDate();
    const monthStart = monday.toLocaleDateString('fr-FR', { month: 'short' });
    const monthEnd = sunday.toLocaleDateString('fr-FR', { month: 'short' });
    const year = monday.getFullYear();
    
    if (monday.getMonth() === sunday.getMonth()) {
      return `${startDate}-${endDate} ${monthStart} ${year}`;
    } else {
      return `${startDate} ${monthStart} - ${endDate} ${monthEnd} ${year}`;
    }
  };

  const selectDay = (date: Date, dayName: string) => {
    if (!currentPlanningSubscription) {
      alert('Veuillez d\'abord sélectionner un abonnement');
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    setSelectedDay({ date: dateStr, name: dayName });
    
    const existingPlanning = currentPlanningSubscription.planning[dateStr] || {};
    setTempSelection({ ...existingPlanning });
    
    setSelectedMealType('petit-dejeuner');
    setShowMealModal(true);
  };

  const toggleMenuSelection = (menuId: number) => {
    const newSelection = { ...tempSelection };
    
    if (newSelection[selectedMealType] === menuId) {
      delete newSelection[selectedMealType];
    } else {
      newSelection[selectedMealType] = menuId;
    }
    
    setTempSelection(newSelection);
  };

  const validateMealSelection = () => {
    if (!selectedDay || !currentPlanningSubscription) return;
    
    if (Object.keys(tempSelection).length === 0) {
      alert('Veuillez sélectionner au moins un repas');
      return;
    }

    const updatedSubscription = { ...currentPlanningSubscription };
    updatedSubscription.planning[selectedDay.date] = { ...tempSelection };
    
    setActiveSubscriptions(activeSubscriptions.map(sub => 
      sub.id === updatedSubscription.id ? updatedSubscription : sub
    ));
    
    setCurrentPlanningSubscription(updatedSubscription);
    setShowMealModal(false);
    setTempSelection({});
    
    alert(`Repas planifiés pour ${selectedDay.name} ! ✓`);
  };

  const removePlannedMeal = (dateStr: string, mealType: string) => {
    if (!currentPlanningSubscription) return;

    const updatedSubscription = { ...currentPlanningSubscription };
    if (updatedSubscription.planning[dateStr]) {
      delete updatedSubscription.planning[dateStr][mealType];
      
      if (Object.keys(updatedSubscription.planning[dateStr]).length === 0) {
        delete updatedSubscription.planning[dateStr];
      }
    }
    
    setActiveSubscriptions(activeSubscriptions.map(sub => 
      sub.id === updatedSubscription.id ? updatedSubscription : sub
    ));
    
    setCurrentPlanningSubscription(updatedSubscription);
  };

  const validateWeeklyPlanning = () => {
    if (!currentPlanningSubscription) {
      alert('Veuillez d\'abord sélectionner un abonnement');
      return;
    }

    const weekDates = getWeekDates().map(d => d.toISOString().split('T')[0]);
    
    let totalMeals = 0;
    let totalPrice = 0;
    
    weekDates.forEach(dateStr => {
      const dayPlanning = currentPlanningSubscription.planning[dateStr];
      if (dayPlanning) {
        totalMeals += Object.keys(dayPlanning).length;
        
        Object.entries(dayPlanning).forEach(([mealType, menuId]) => {
          const menu = findMenuById(menuId, mealType);
          if (menu) totalPrice += menu.price;
        });
      }
    });
    
    if (totalMeals === 0) {
      alert('Veuillez planifier au moins un repas pour cette semaine');
      return;
    }

    const deliveryDate = getWeekDates()[0];
    const deliveryDateStr = deliveryDate.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });

    alert(`✓ Planning validé ! ${totalMeals} repas planifiés pour un total de ${totalPrice.toLocaleString()} FCFA. Livraison prévue ${deliveryDateStr} à 8h00 !`);
  };

  // ========== FONCTIONS UTILITAIRES ==========

  const findMenuById = (menuId: number, category: string): MenuItem | undefined => {
    return menusDataSubscription[category]?.find(menu => menu.id === menuId);
  };

  const getMealTypeLabel = (mealType: string): string => {
    const labels: Record<string, string> = {
      'petit-dejeuner': 'Petit-Déjeuner',
      'dejeuner': 'Déjeuner',
      'diner': 'Dîner'
    };
    return labels[mealType] || mealType;
  };

  const getMealTypesForSubscription = (mealsPerDay: number) => {
    if (mealsPerDay === 2) {
      return [
        { id: 'dejeuner', label: 'Déjeuner' },
        { id: 'diner', label: 'Dîner' }
      ];
    } else if (mealsPerDay === 3) {
      return [
        { id: 'petit-dejeuner', label: 'Petit-Déjeuner' },
        { id: 'dejeuner', label: 'Déjeuner' },
        { id: 'diner', label: 'Dîner' }
      ];
    }
    return [];
  };

  // ========== RENDER ==========

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* En-tête avec navigation */}
        <div 
          className="mb-6 rounded-2xl p-6 shadow-lg text-center"
          style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
        >
          <h1 className="text-2xl font-bold text-white mb-3">
            💎 Nos Formules d'Abonnement
          </h1>
          <p className="text-sm text-white/90 mb-4">
            Choisissez la formule qui correspond à vos besoins et profitez de la livraison hebdomadaire
          </p>
          
          {/* Boutons de navigation */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex gap-3">
              <button
                className="px-4 py-2 text-sm font-medium rounded-lg shadow-md transition"
                style={{ backgroundColor: '#5a4a7c', color: 'white' }}
              >
                Abonnement Menu
              </button>
              <Link href="/abonnement-resto">
                <button
                  className="px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gray-100 transition"
                  style={{ color: '#5a4a7c' }}
                >
                  Abonnement Resto
                </button>
              </Link>
            </div>
            
            {activeSubscriptions.length > 0 && (
              <button
                onClick={resetAllSubscriptions}
                className="px-3 py-2 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition ml-2"
              >
                🗑️ Tout réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Grille des formules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl shadow-lg p-5 transition-all hover:shadow-xl hover:-translate-y-1 border border-gray-100"
            >
              {plan.popular && (
                <div className="mb-3">
                  <span 
                    className="inline-block text-white px-3 py-1 rounded-full text-xs font-bold shadow-md"
                    style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
                  >
                    ⭐ POPULAIRE
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                {plan.emoji && <span className="text-2xl">{plan.emoji}</span>}
                <h2 className="text-lg font-semibold" style={{ color: '#5a4a7c' }}>
                  {plan.name}
                </h2>
              </div>

              <div className="mb-4">
                <div className="text-3xl font-bold" style={{ color: '#5a4a7c' }}>
                  {plan.price.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-600">FCFA</span>
                </div>
                <div className="text-xs text-gray-500">par semaine</div>
              </div>

              <ul className="space-y-2 mb-5">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="flex-shrink-0 mt-0.5" style={{ color: '#9b7ec9' }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => subscribeToPlans(plan.id, plan.mealsPerDay)}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg shadow-md transition hover:opacity-90"
                style={{ backgroundColor: '#5a4a7c' }}
              >
                S'abonner maintenant
              </button>
            </div>
          ))}
        </div>

        {/* Mes abonnements actifs */}
        {activeSubscriptions.length > 0 && (
          <div 
            className="border-2 rounded-2xl p-5 mb-6 shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)',
              borderColor: '#9b7ec9'
            }}
          >
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#5a4a7c' }}>
              📌 Mes Abonnements Actifs
            </h2>
            <div className="space-y-3">
              {activeSubscriptions.map((sub) => (
                <div key={sub.id} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-md">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {plans.find(p => p.id === sub.name)?.emoji && (
                        <span className="text-xl">{plans.find(p => p.id === sub.name)?.emoji}</span>
                      )}
                      <h3 className="text-base font-semibold" style={{ color: '#5a4a7c' }}>
                        {sub.name.toUpperCase()}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-gray-700 font-medium">
                        {plans.find(p => p.id === sub.name)?.price.toLocaleString('fr-FR')} FCFA/sem
                      </p>
                      <p className="text-xs text-gray-500">
                        Depuis {sub.startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => selectSubscriptionForPlanning(sub.id)}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-md transition hover:opacity-90"
                      style={{ backgroundColor: '#5a4a7c' }}
                    >
                      📅 Planifier
                    </button>
                    <button 
                      onClick={() => unsubscribe(sub.id)}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-md transition hover:opacity-90"
                      style={{ backgroundColor: '#f04e4e' }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section Planification Hebdomadaire */}
        {currentPlanningSubscription && (
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-6 border-2" style={{ borderColor: '#b19cd9' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: '#5a4a7c' }}>
                📅 Planification Hebdomadaire
              </h2>
              <select 
                className="px-3 py-2 text-sm font-medium border-2 rounded-lg focus:outline-none"
                style={{ borderColor: '#9b7ec9', color: '#5a4a7c' }}
                value={currentPlanningSubscription.id}
                onChange={(e) => selectSubscriptionForPlanning(Number(e.target.value))}
              >
                {activeSubscriptions.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name.toUpperCase()} ({sub.mealsPerDay} repas/j)
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Sélectionnez vos repas pour chaque jour. Votre panier sera automatiquement composé et livré.
            </p>

            {/* Navigation semaine */}
            <div 
              className="flex items-center justify-between mb-4 p-4 rounded-xl shadow-sm"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <button 
                onClick={() => changeWeek(-1)}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-md transition hover:opacity-90"
                style={{ backgroundColor: '#5a4a7c' }}
              >
                ← Préc.
              </button>
              <span className="text-sm font-semibold" style={{ color: '#5a4a7c' }}>
                {getWeekDisplayText()}
              </span>
              <button 
                onClick={() => changeWeek(1)}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-md transition hover:opacity-90"
                style={{ backgroundColor: '#5a4a7c' }}
              >
                Suiv. →
              </button>
            </div>

            {/* Calendrier */}
            <div className="grid grid-cols-7 gap-2 mb-5">
              {getWeekDates().map((date, index) => {
                const dateStr = date.toISOString().split('T')[0];
                const dayPlanning = currentPlanningSubscription.planning[dateStr] || {};
                const mealsCount = Object.keys(dayPlanning).length;
                const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                const dayName = dayNames[date.getDay()];
                
                return (
                  <div 
                    key={index}
                    onClick={() => selectDay(date, dayName)}
                    className="bg-white border-2 p-2 rounded-lg hover:shadow-md transition cursor-pointer text-center"
                    style={{ 
                      borderColor: mealsCount > 0 ? '#9b7ec9' : '#e5e7eb',
                      background: mealsCount > 0 ? 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' : 'white'
                    }}
                  >
                    <div className="text-xs font-semibold mb-0.5" style={{ color: '#5a4a7c' }}>
                      {dayName}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      {date.getDate()}
                    </div>
                    <div 
                      className="text-xs font-medium px-1 py-0.5 rounded"
                      style={{ 
                        backgroundColor: mealsCount > 0 ? '#9b7ec9' : '#e5e7eb',
                        color: mealsCount > 0 ? 'white' : '#6b7280'
                      }}
                    >
                      {mealsCount}/{currentPlanningSubscription.mealsPerDay}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Récapitulatif */}
            <div 
              className="rounded-xl p-4 mb-4"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#5a4a7c' }}>
                📝 Récapitulatif des repas planifiés
              </h3>
              <div className="space-y-2">
                {getWeekDates().map((date) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayPlanning = currentPlanningSubscription.planning[dateStr];
                  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                  const dayName = dayNames[date.getDay()];
                  
                  if (!dayPlanning || Object.keys(dayPlanning).length === 0) return null;
                  
                  return (
                    <div key={dateStr} className="bg-white p-3 rounded-lg shadow-sm">
                      <h4 className="text-xs font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                        {dayName} {date.getDate()}
                      </h4>
                      {Object.entries(dayPlanning).map(([mealType, menuId]) => {
                        const menu = findMenuById(menuId, mealType);
                        if (!menu) return null;
                        
                        return (
                          <div key={mealType} className="flex items-center justify-between py-1 text-xs border-b last:border-b-0">
                            <div className="flex-1">
                              <span className="text-gray-600">{getMealTypeLabel(mealType)}:</span>
                              <span className="text-gray-900 font-medium ml-1">{menu.name}</span>
                              <span className="text-gray-500 ml-1">({menu.price.toLocaleString()} F)</span>
                            </div>
                            <button 
                              onClick={() => removePlannedMeal(dateStr, mealType)}
                              className="ml-2 transition"
                              style={{ color: '#f04e4e' }}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info panier auto */}
            <div 
              className="border-2 p-4 rounded-xl mb-4 shadow-sm"
              style={{ 
                borderColor: '#9b7ec9',
                background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)'
              }}
            >
              <h4 className="text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                🛒 Panier Automatique
              </h4>
              <p className="text-xs" style={{ color: '#5a4a7c' }}>
                Votre panier sera composé automatiquement pour {familySize} personnes. 
                Prochaine livraison: {getWeekDates()[0].toLocaleDateString('fr-FR', { weekday: 'long' })} à 8h00
              </p>
            </div>

            <button
              onClick={validateWeeklyPlanning}
              className="w-full py-3 px-4 text-sm font-semibold text-white rounded-xl shadow-lg transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
            >
              ✅ Valider mon planning de la semaine
            </button>
          </div>
        )}

        {/* Avantages */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
          <h2 className="text-lg font-semibold text-center mb-5" style={{ color: '#5a4a7c' }}>
            🎁 Avantages de nos abonnements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="text-center p-4 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <div className="text-3xl mb-2">📅</div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                Planning Automatique
              </h3>
              <p className="text-xs text-gray-700">
                Vos repas planifiés selon vos préférences
              </p>
            </div>
            <div 
              className="text-center p-4 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <div className="text-3xl mb-2">🚚</div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                Livraison Hebdomadaire
              </h3>
              <p className="text-xs text-gray-700">
                Ingrédients frais livrés chez vous
              </p>
            </div>
            <div 
              className="text-center p-4 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <div className="text-3xl mb-2">💰</div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                Économies Garanties
              </h3>
              <p className="text-xs text-gray-700">
                Jusqu'à 20% d'économies
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
        >
          <h2 className="text-lg font-semibold text-center mb-4" style={{ color: '#5a4a7c' }}>
            ❓ Questions fréquentes
          </h2>
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                Puis-je modifier mon planning ?
              </h3>
              <p className="text-xs text-gray-700">
                Oui, jusqu'à 48h avant la livraison.
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                Comment fonctionne la livraison ?
              </h3>
              <p className="text-xs text-gray-700">
                Livraison gratuite chaque lundi entre 8h et 12h à Abidjan.
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                Puis-je annuler mon abonnement ?
              </h3>
              <p className="text-xs text-gray-700">
                Oui, à tout moment sans frais.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de sélection de repas */}
      {showMealModal && selectedDay && currentPlanningSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div 
              className="flex items-center justify-between mb-4 pb-3 border-b-2"
              style={{ borderColor: '#b19cd9' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: '#5a4a7c' }}>
                🍽️ Repas - {selectedDay.name}
              </h2>
              <button 
                onClick={() => setShowMealModal(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl font-light"
              >
                ×
              </button>
            </div>

            {/* Onglets types de repas */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {getMealTypesForSubscription(currentPlanningSubscription.mealsPerDay).map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedMealType(type.id)}
                  className="px-4 py-2 text-sm font-medium rounded-lg shadow-md transition"
                  style={{
                    background: selectedMealType === type.id 
                      ? 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' 
                      : 'white',
                    color: selectedMealType === type.id ? 'white' : '#5a4a7c',
                    border: selectedMealType === type.id ? 'none' : '2px solid #e5e7eb'
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Grille de menus */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {menusDataSubscription[selectedMealType]?.map(menu => (
                <div
                  key={menu.id}
                  onClick={() => toggleMenuSelection(menu.id)}
                  className="p-3 rounded-xl cursor-pointer transition shadow-md hover:shadow-lg"
                  style={{
                    border: tempSelection[selectedMealType] === menu.id ? '2px solid #9b7ec9' : '2px solid #e5e7eb',
                    background: tempSelection[selectedMealType] === menu.id 
                      ? 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' 
                      : 'white'
                  }}
                >
                  <h4 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                    {menu.name}
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">{menu.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: '#5a4a7c' }}>
                      {menu.price.toLocaleString()} FCFA
                    </span>
                    {tempSelection[selectedMealType] === menu.id && (
                      <span className="text-lg" style={{ color: '#9b7ec9' }}>✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={validateMealSelection}
              className="w-full py-3 px-4 text-sm font-semibold text-white rounded-xl shadow-lg transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
            >
              ✅ Valider ma sélection
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}