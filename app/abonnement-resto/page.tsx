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
  mealsPerWeek: number;
  popular?: boolean;
}

interface ActiveSubscription {
  id: number;
  name: string;
  mealsPerWeek: number;
  planning: WeeklyPlanning;
  startDate: Date;
}

interface WeeklyPlanning {
  [dateStr: string]: number[]; // Array of menuIds
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
}

// ========== DONNÉES DES MENUS RESTO ==========

const menusDataResto: MenuItem[] = [
  // Petit-déjeuner
  { id: 101, name: 'Café + Pain beurré', price: 1500, description: 'Café noir avec pain beurré et confiture', category: 'petit-dejeuner' },
  { id: 102, name: 'Omelette + Jus d\'orange', price: 2000, description: 'Omelette nature et jus d\'orange frais', category: 'petit-dejeuner' },
  { id: 103, name: 'Croissant + Thé', price: 1800, description: 'Croissant frais et thé chaud au lait', category: 'petit-dejeuner' },
  { id: 104, name: 'Pancakes au sirop', price: 2500, description: 'Pancakes moelleux au sirop d\'érable', category: 'petit-dejeuner' },
  { id: 105, name: 'Yaourt & Fruits frais', price: 2200, description: 'Yaourt nature avec fruits frais de saison', category: 'petit-dejeuner' },
  
  // Déjeuner
  { id: 201, name: 'Riz + Poulet braisé', price: 3500, description: 'Riz blanc avec poulet braisé à l\'ivoirienne', category: 'dejeuner' },
  { id: 202, name: 'Attiéké Poisson', price: 4000, description: 'Attiéké avec poisson braisé et légumes', category: 'dejeuner' },
  { id: 203, name: 'Alloco + Sauce tomate', price: 2500, description: 'Bananes plantain frites avec sauce pimentée', category: 'dejeuner' },
  { id: 204, name: 'Spaghetti Bolognaise', price: 3000, description: 'Pâtes à la sauce bolognaise maison', category: 'dejeuner' },
  { id: 205, name: 'Foutou + Sauce graine', price: 3500, description: 'Foutou traditionnel avec sauce graine', category: 'dejeuner' },
  { id: 206, name: 'Poulet DG', price: 4500, description: 'Poulet Directeur Général aux légumes', category: 'dejeuner' },
  { id: 207, name: 'Garba', price: 3000, description: 'Attiéké avec thon et légumes', category: 'dejeuner' },
  { id: 208, name: 'Kedjenou de poulet', price: 4000, description: 'Poulet mijoté aux légumes et épices', category: 'dejeuner' },
  
  // Goûter
  { id: 401, name: 'Jus de fruits frais', price: 1200, description: 'Jus de fruits tropicaux pressés', category: 'gouter' },
  { id: 402, name: 'Smoothie énergétique', price: 1800, description: 'Smoothie banane, mangue et lait', category: 'gouter' },
  { id: 403, name: 'Beignets sucrés', price: 1000, description: 'Beignets moelleux saupoudrés de sucre', category: 'gouter' },
  { id: 404, name: 'Fruit de saison', price: 800, description: 'Assortiment de fruits frais découpés', category: 'gouter' },
  { id: 405, name: 'Cookies maison', price: 1500, description: 'Cookies au chocolat fait maison', category: 'gouter' },
  { id: 406, name: 'Pain au chocolat', price: 1200, description: 'Viennoiserie au chocolat', category: 'gouter' },
  
  // Dîner
  { id: 301, name: 'Salade César', price: 3000, description: 'Salade César au poulet grillé', category: 'diner' },
  { id: 302, name: 'Soupe de légumes', price: 2000, description: 'Soupe aux légumes frais du jour', category: 'diner' },
  { id: 303, name: 'Sandwich Poulet grillé', price: 2500, description: 'Sandwich au poulet grillé et crudités', category: 'diner' },
  { id: 304, name: 'Pizza Margherita', price: 4500, description: 'Pizza à la tomate et mozzarella fraîche', category: 'diner' },
  { id: 305, name: 'Riz Cantonnais', price: 3500, description: 'Riz sauté aux légumes et œufs', category: 'diner' },
  { id: 306, name: 'Wrap végétarien', price: 2800, description: 'Wrap aux légumes grillés et houmous', category: 'diner' },
  { id: 307, name: 'Quiche Lorraine', price: 3200, description: 'Quiche aux lardons et fromage', category: 'diner' },
  { id: 308, name: 'Burger Maison', price: 4000, description: 'Burger artisanal avec frites maison', category: 'diner' }
];

// ========== COMPOSANT PRINCIPAL ==========

export default function AbonnementRestoPage() {
  const { user, isAuthenticated } = useAuth();
  
  // États
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [currentPlanningSubscription, setCurrentPlanningSubscription] = useState<ActiveSubscription | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<{ date: string; name: string } | null>(null);
  const [tempSelection, setTempSelection] = useState<number[]>([]);
  const [showMealModal, setShowMealModal] = useState(false);

  // Plans d'abonnement
  const plans: SubscriptionPlan[] = [
    {
      id: 'standard',
      name: 'Repas Standard',
      price: 15000,
      mealsPerWeek: 7,
      features: [
        '7 repas prêts par semaine',
        'Repas équilibrés et variés',
        'Livraison hebdomadaire',
        'Modifier planning (48h avant)',
        'Emballages écologiques'
      ]
    },
    {
      id: 'actif',
      name: 'Repas Actif',
      price: 28500,
      mealsPerWeek: 14,
      popular: true,
      features: [
        '14 repas prêts par semaine',
        'Repas premium variés',
        'Livraison 2x/semaine',
        'Modification du planning (48h avant)',
        'Portions généreuses',
        'Support client'
      ]
    },
    {
      id: 'premium',
      name: 'Repas Premium',
      price: 40000,
      mealsPerWeek: 21,
      features: [
        '21 repas prêts par semaine',
        'Ingrédients premium',
        'Livraison 3x/semaine',
        'Modification du planning (48h avant)',
        'Recettes de Chef',
        'Support client prioritaire'
      ]
    },
    {
      id: 'sain',
      name: 'Repas Sain',
      emoji: '🥗',
      price: 60000,
      mealsPerWeek: 14,
      features: [
        '14 repas équilibrés par semaine',
        'Validés par nutritionniste',
        'Faible en calories',
        'Riche en nutriments',
        'Livraison 2x/semaine',
        'Modification du planning (48h avant)',
        'Fiches nutritionnelles'
      ]
    },
    {
      id: 'sante',
      name: 'Repas Santé',
      emoji: '💊',
      price: 60000,
      mealsPerWeek: 21,
      features: [
        '21 repas thérapeutiques par semaine',
        'Adaptés aux pathologies',
        'Diabète, hypertension, cholestérol',
        'Suivi diététique inclus',
        'Livraison 3x/semaine',
        'Modification du planning (48h avant)',
        'Consultations nutritionniste'
      ]
    },
    {
      id: 'chef',
      name: 'Repas de Chef',
      emoji: '👨‍🍳',
      price: 150000,
      mealsPerWeek: 14,
      features: [
        '14 repas gastronomiques par semaine',
        'Préparés par Chef étoilé',
        'Ingrédients d\'exception',
        'Présentation soignée',
        'Livraison quotidienne',
        'Menu personnalisé',
        'Service concierge inclus'
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
          .eq('subscription_type', 'resto')
          .eq('status', 'active');

        if (!error && data && data.length > 0) {
          const subscriptions: ActiveSubscription[] = data.map(sub => ({
            id: sub.id,
            name: sub.plan_name,
            mealsPerWeek: sub.meals_per_week || 7,
            planning: sub.planning || {},
            startDate: new Date(sub.start_date)
          }));
          setActiveSubscriptions(subscriptions);
          return;
        }
      }
      
      // Sinon charger depuis localStorage
      const saved = localStorage.getItem('popoteapp_subscriptions_resto');
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
      localStorage.removeItem('popoteapp_subscriptions_resto');
    } else {
      localStorage.setItem('popoteapp_subscriptions_resto', JSON.stringify(activeSubscriptions));
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
          .eq('subscription_type', 'resto')
          .single();

        if (existing) {
          // UPDATE si existe
          await supabase
            .from('subscriptions')
            .update({
              plan_price: plan?.price || 0,
              meals_per_week: sub.mealsPerWeek,
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
              subscription_type: 'resto',
              plan_name: sub.name,
              plan_price: plan?.price || 0,
              meals_per_week: sub.mealsPerWeek,
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

  const subscribeToPlans = (planName: string, mealsPerWeek: number) => {
    const existingIndex = activeSubscriptions.findIndex(sub => sub.name === planName);
    
    if (existingIndex !== -1) {
      alert(`Vous êtes déjà abonné au plan ${planName.toUpperCase()} !`);
      return;
    }

    const newSubscription: ActiveSubscription = {
      id: Date.now(),
      name: planName,
      mealsPerWeek: mealsPerWeek,
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
        .eq('subscription_type', 'resto');
    }
    
    localStorage.removeItem('popoteapp_subscriptions_resto');
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

  const getTotalMealsPlanned = () => {
    if (!currentPlanningSubscription) return 0;
    
    const weekDates = getWeekDates().map(d => d.toISOString().split('T')[0]);
    let total = 0;
    
    weekDates.forEach(dateStr => {
      const dayMeals = currentPlanningSubscription.planning[dateStr] || [];
      total += dayMeals.length;
    });
    
    return total;
  };

  const getRemainingMeals = () => {
    if (!currentPlanningSubscription) return 0;
    return currentPlanningSubscription.mealsPerWeek - getTotalMealsPlanned();
  };

  const selectDay = (date: Date, dayName: string) => {
    if (!currentPlanningSubscription) {
      alert('Veuillez d\'abord sélectionner un abonnement');
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    setSelectedDay({ date: dateStr, name: dayName });
    
    const existingMeals = currentPlanningSubscription.planning[dateStr] || [];
    setTempSelection([...existingMeals]);
    
    setShowMealModal(true);
  };

  const toggleMenuSelection = (menuId: number) => {
    const newSelection = [...tempSelection];
    const index = newSelection.indexOf(menuId);
    
    if (index > -1) {
      newSelection.splice(index, 1);
    } else {
      // Vérifier si on ne dépasse pas le quota
      const currentTotal = getTotalMealsPlanned();
      const currentDayMeals = currentPlanningSubscription?.planning[selectedDay?.date || '']?.length || 0;
      const newTotal = currentTotal - currentDayMeals + newSelection.length + 1;
      
      if (newTotal > (currentPlanningSubscription?.mealsPerWeek || 0)) {
        alert(`Vous avez atteint votre quota de ${currentPlanningSubscription?.mealsPerWeek} repas par semaine !`);
        return;
      }
      
      newSelection.push(menuId);
    }
    
    setTempSelection(newSelection);
  };

  const validateMealSelection = () => {
    if (!selectedDay || !currentPlanningSubscription) return;

    const updatedSubscription = { ...currentPlanningSubscription };
    updatedSubscription.planning[selectedDay.date] = [...tempSelection];
    
    setActiveSubscriptions(activeSubscriptions.map(sub => 
      sub.id === updatedSubscription.id ? updatedSubscription : sub
    ));
    
    setCurrentPlanningSubscription(updatedSubscription);
    setShowMealModal(false);
    setTempSelection([]);
    
    alert(`${tempSelection.length} repas planifiés pour ${selectedDay.name} ! ✓`);
  };

  const removePlannedMeal = (dateStr: string, menuId: number) => {
    if (!currentPlanningSubscription) return;

    const updatedSubscription = { ...currentPlanningSubscription };
    if (updatedSubscription.planning[dateStr]) {
      const meals = updatedSubscription.planning[dateStr];
      const index = meals.indexOf(menuId);
      if (index > -1) {
        meals.splice(index, 1);
      }
      
      if (meals.length === 0) {
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

    const totalMeals = getTotalMealsPlanned();
    
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

    alert(`✓ Planning validé ! ${totalMeals} repas planifiés. Livraison prévue ${deliveryDateStr} !`);
  };

  // ========== FONCTIONS UTILITAIRES ==========

  const findMenuById = (menuId: number): MenuItem | undefined => {
    return menusDataResto.find(menu => menu.id === menuId);
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'petit-dejeuner': '🌅 Petit-déjeuner',
      'dejeuner': '🍽️ Déjeuner',
      'gouter': '🍪 Goûter',
      'diner': '🌙 Dîner'
    };
    return labels[category] || category;
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
            Choisissez la formule qui correspond à vos besoins et profitez de repas prêts livrés chez vous
          </p>
          
          {/* Boutons de navigation */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex gap-3">
              <Link href="/abonnement">
                <button
                  className="px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gray-100 transition"
                  style={{ color: '#5a4a7c' }}
                >
                  Abonnement Menu
                </button>
              </Link>
              <button
                className="px-4 py-2 text-sm font-medium rounded-lg shadow-md transition"
                style={{ backgroundColor: '#5a4a7c', color: 'white' }}
              >
                Abonnement Resto
              </button>
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
                <div className="text-xs text-gray-500">
                  {plan.mealsPerWeek} repas/semaine
                </div>
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
                onClick={() => subscribeToPlans(plan.id, plan.mealsPerWeek)}
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
                        {sub.mealsPerWeek} repas/semaine
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
                    {sub.name.toUpperCase()} ({sub.mealsPerWeek} repas/sem)
                  </option>
                ))}
              </select>
            </div>

            {/* Compteur de repas */}
            <div 
              className="mb-4 p-4 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#5a4a7c' }}>
                    Quota de repas
                  </p>
                  <p className="text-xs text-gray-600">
                    Vous pouvez commander plusieurs repas par jour
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: '#5a4a7c' }}>
                    {getRemainingMeals()}/{currentPlanningSubscription.mealsPerWeek}
                  </div>
                  <p className="text-xs text-gray-600">repas restants</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Sélectionnez vos repas pour chaque jour. Vous pouvez commander autant de repas que vous voulez par jour dans la limite de votre quota hebdomadaire.
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
                const dayMeals = currentPlanningSubscription.planning[dateStr] || [];
                const mealsCount = dayMeals.length;
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
                      {mealsCount} repas
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
                  const dayMeals = currentPlanningSubscription.planning[dateStr];
                  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                  const dayName = dayNames[date.getDay()];
                  
                  if (!dayMeals || dayMeals.length === 0) return null;
                  
                  return (
                    <div key={dateStr} className="bg-white p-3 rounded-lg shadow-sm">
                      <h4 className="text-xs font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                        {dayName} {date.getDate()} - {dayMeals.length} repas
                      </h4>
                      {dayMeals.map((menuId, idx) => {
                        const menu = findMenuById(menuId);
                        if (!menu) return null;
                        
                        return (
                          <div key={`${menuId}-${idx}`} className="flex items-center justify-between py-1 text-xs border-b last:border-b-0">
                            <div className="flex-1">
                              <span className="text-gray-600 text-xs">{getCategoryLabel(menu.category)}: </span>
                              <span className="text-gray-900 font-medium">{menu.name}</span>
                              <span className="text-gray-500 ml-1">({menu.price.toLocaleString()} F)</span>
                            </div>
                            <button 
                              onClick={() => removePlannedMeal(dateStr, menuId)}
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

            {/* Info livraison */}
            <div 
              className="border-2 p-4 rounded-xl mb-4 shadow-sm"
              style={{ 
                borderColor: '#9b7ec9',
                background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)'
              }}
            >
              <h4 className="text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                🚚 Livraison des repas
              </h4>
              <p className="text-xs" style={{ color: '#5a4a7c' }}>
                Vos repas seront livrés prêts à réchauffer. 
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
            🎁 Avantages de nos abonnements Resto
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="text-center p-4 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <div className="text-3xl mb-2">🍽️</div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                Repas Prêts
              </h3>
              <p className="text-xs text-gray-700">
                Repas fraîchement préparés, prêts à réchauffer
              </p>
            </div>
            <div 
              className="text-center p-4 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                Gain de Temps
              </h3>
              <p className="text-xs text-gray-700">
                Plus besoin de cuisiner, tout est prêt
              </p>
            </div>
            <div 
              className="text-center p-4 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <div className="text-3xl mb-2">🌟</div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                Qualité Restaurant
              </h3>
              <p className="text-xs text-gray-700">
                Plats de qualité restaurant chez vous
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
                Comment commander plusieurs repas par jour ?
              </h3>
              <p className="text-xs text-gray-700">
                Cliquez sur un jour et sélectionnez autant de repas que vous voulez dans la limite de votre quota hebdomadaire.
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                Comment réchauffer les repas ?
              </h3>
              <p className="text-xs text-gray-700">
                Tous les repas sont livrés avec des instructions de réchauffage. Micro-ondes ou four selon le plat.
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                Quelle est la durée de conservation ?
              </h3>
              <p className="text-xs text-gray-700">
                Les repas se conservent 3-5 jours au réfrigérateur selon le type de plat.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de sélection de repas */}
      {showMealModal && selectedDay && currentPlanningSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div 
              className="flex items-center justify-between mb-4 pb-3 border-b-2"
              style={{ borderColor: '#b19cd9' }}
            >
              <div>
                <h2 className="text-lg font-semibold" style={{ color: '#5a4a7c' }}>
                  🍽️ Sélectionner vos repas - {selectedDay.name}
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  {tempSelection.length} repas sélectionnés • {getRemainingMeals() - (tempSelection.length - (currentPlanningSubscription.planning[selectedDay.date]?.length || 0))} repas restants
                </p>
              </div>
              <button 
                onClick={() => setShowMealModal(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl font-light"
              >
                ×
              </button>
            </div>

            {/* Grille de menus organisée par catégories */}
            <div className="space-y-6 mb-4">
              {/* Petit-déjeuner */}
              <div>
                <h3 className="text-base font-semibold mb-3 pb-2 border-b-2" style={{ color: '#5a4a7c', borderColor: '#9b7ec9' }}>
                  🌅 Petit-déjeuner
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {menusDataResto.filter(menu => menu.category === 'petit-dejeuner').map(menu => {
                    const isSelected = tempSelection.includes(menu.id);
                    const selectionCount = tempSelection.filter(id => id === menu.id).length;
                    
                    return (
                      <div
                        key={menu.id}
                        onClick={() => toggleMenuSelection(menu.id)}
                        className="p-3 rounded-xl cursor-pointer transition shadow-md hover:shadow-lg relative"
                        style={{
                          border: isSelected ? '2px solid #9b7ec9' : '2px solid #e5e7eb',
                          background: isSelected 
                            ? 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' 
                            : 'white'
                        }}
                      >
                        {selectionCount > 0 && (
                          <div 
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
                            style={{ backgroundColor: '#9b7ec9' }}
                          >
                            {selectionCount}
                          </div>
                        )}
                        <h4 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                          {menu.name}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">{menu.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold" style={{ color: '#5a4a7c' }}>
                            {menu.price.toLocaleString()} FCFA
                          </span>
                          {isSelected && (
                            <span className="text-lg" style={{ color: '#9b7ec9' }}>✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Déjeuner */}
              <div>
                <h3 className="text-base font-semibold mb-3 pb-2 border-b-2" style={{ color: '#5a4a7c', borderColor: '#9b7ec9' }}>
                  🍽️ Déjeuner
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {menusDataResto.filter(menu => menu.category === 'dejeuner').map(menu => {
                    const isSelected = tempSelection.includes(menu.id);
                    const selectionCount = tempSelection.filter(id => id === menu.id).length;
                    
                    return (
                      <div
                        key={menu.id}
                        onClick={() => toggleMenuSelection(menu.id)}
                        className="p-3 rounded-xl cursor-pointer transition shadow-md hover:shadow-lg relative"
                        style={{
                          border: isSelected ? '2px solid #9b7ec9' : '2px solid #e5e7eb',
                          background: isSelected 
                            ? 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' 
                            : 'white'
                        }}
                      >
                        {selectionCount > 0 && (
                          <div 
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
                            style={{ backgroundColor: '#9b7ec9' }}
                          >
                            {selectionCount}
                          </div>
                        )}
                        <h4 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                          {menu.name}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">{menu.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold" style={{ color: '#5a4a7c' }}>
                            {menu.price.toLocaleString()} FCFA
                          </span>
                          {isSelected && (
                            <span className="text-lg" style={{ color: '#9b7ec9' }}>✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Goûter */}
              <div>
                <h3 className="text-base font-semibold mb-3 pb-2 border-b-2" style={{ color: '#5a4a7c', borderColor: '#9b7ec9' }}>
                  🍪 Goûter
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {menusDataResto.filter(menu => menu.category === 'gouter').map(menu => {
                    const isSelected = tempSelection.includes(menu.id);
                    const selectionCount = tempSelection.filter(id => id === menu.id).length;
                    
                    return (
                      <div
                        key={menu.id}
                        onClick={() => toggleMenuSelection(menu.id)}
                        className="p-3 rounded-xl cursor-pointer transition shadow-md hover:shadow-lg relative"
                        style={{
                          border: isSelected ? '2px solid #9b7ec9' : '2px solid #e5e7eb',
                          background: isSelected 
                            ? 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' 
                            : 'white'
                        }}
                      >
                        {selectionCount > 0 && (
                          <div 
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
                            style={{ backgroundColor: '#9b7ec9' }}
                          >
                            {selectionCount}
                          </div>
                        )}
                        <h4 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                          {menu.name}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">{menu.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold" style={{ color: '#5a4a7c' }}>
                            {menu.price.toLocaleString()} FCFA
                          </span>
                          {isSelected && (
                            <span className="text-lg" style={{ color: '#9b7ec9' }}>✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dîner */}
              <div>
                <h3 className="text-base font-semibold mb-3 pb-2 border-b-2" style={{ color: '#5a4a7c', borderColor: '#9b7ec9' }}>
                  🌙 Dîner
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {menusDataResto.filter(menu => menu.category === 'diner').map(menu => {
                    const isSelected = tempSelection.includes(menu.id);
                    const selectionCount = tempSelection.filter(id => id === menu.id).length;
                    
                    return (
                      <div
                        key={menu.id}
                        onClick={() => toggleMenuSelection(menu.id)}
                        className="p-3 rounded-xl cursor-pointer transition shadow-md hover:shadow-lg relative"
                        style={{
                          border: isSelected ? '2px solid #9b7ec9' : '2px solid #e5e7eb',
                          background: isSelected 
                            ? 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' 
                            : 'white'
                        }}
                      >
                        {selectionCount > 0 && (
                          <div 
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
                            style={{ backgroundColor: '#9b7ec9' }}
                          >
                            {selectionCount}
                          </div>
                        )}
                        <h4 className="text-sm font-semibold mb-1" style={{ color: '#5a4a7c' }}>
                          {menu.name}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">{menu.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold" style={{ color: '#5a4a7c' }}>
                            {menu.price.toLocaleString()} FCFA
                          </span>
                          {isSelected && (
                            <span className="text-lg" style={{ color: '#9b7ec9' }}>✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={validateMealSelection}
              className="w-full py-3 px-4 text-sm font-semibold text-white rounded-xl shadow-lg transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
            >
              ✅ Valider ma sélection ({tempSelection.length} repas)
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}