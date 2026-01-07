'use client';

// =============================================================================
// profil_page.tsx - VERSION 4 (Avec historique commandes ET dons)
// =============================================================================
// Date : 5 décembre 2025
// Ajout : Chargement des dons depuis la table donations
// =============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getUserProfile,
  updateUserProfile,
  addDietaryPreference,
  removeDietaryPreference,
  UserProfile,
} from '@/services/userService';
import { updateFamilySize } from '@/services/planningService';

// ============================================
// TYPES POUR LES COMMANDES
// ============================================

interface OrderItem {
  product_name: string;
  product_type: string;
  quantity: number;
  unit?: string;
  prix_unitaire: number;
  prix_total: number;
  metadata?: { emoji?: string };
}

interface Order {
  id: string;
  numero_commande: string;
  total_fcfa: number;
  sous_total?: number;
  frais_livraison?: number;
  statut: string;
  statut_paiement?: string;
  methode_paiement?: string;
  adresse_livraison: string;
  heure_livraison?: string;
  date_livraison_prevue: string;
  items: OrderItem[];
  notes?: string;
  created_at: string;
}

// ============================================
// TYPES POUR LES DONS
// ============================================

interface Donation {
  id: string;
  donor_name: string;
  donor_email: string;
  amount: number;
  donation_type: string;
  feeds_count: number;
  payment_method: string;
  payment_status: string;
  beneficiary_id: number | null;
  message: string | null;
  is_anonymous: boolean;
  created_at: string;
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function getStatusInfo(statut: string): { bg: string; text: string; label: string } {
  switch (statut) {
    case 'en_attente':
      return { bg: '#fef3c7', text: '#d97706', label: '⏳ En attente' };
    case 'confirmee':
      return { bg: '#dbeafe', text: '#2563eb', label: '✅ Confirmée' };
    case 'en_preparation':
      return { bg: '#e0e7ff', text: '#4f46e5', label: '👨‍🍳 En préparation' };
    case 'en_livraison':
      return { bg: '#fae8ff', text: '#a855f7', label: '🚚 En livraison' };
    case 'livree':
      return { bg: '#dcfce7', text: '#16a34a', label: '✅ Livrée' };
    case 'annulee':
      return { bg: '#fee2e2', text: '#dc2626', label: '❌ Annulée' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280', label: statut };
  }
}

function getPaymentLabel(method: string): string {
  switch (method) {
    case 'wave': return '📱 Wave';
    case 'orange-money': return '🍊 Orange Money';
    case 'mtn-money': return '📲 MTN MoMo';
    case 'cash': return '💵 Espèces';
    default: return method || 'Non spécifié';
  }
}

function getDonationTypeLabel(type: string): { emoji: string; label: string } {
  switch (type) {
    case 'petit': return { emoji: '🍞', label: 'Petit Geste' };
    case 'moyen': return { emoji: '🍱', label: 'Coup de Main' };
    case 'genereux': return { emoji: '🎁', label: 'Geste Généreux' };
    case 'solidaire': return { emoji: '❤️', label: 'Solidarité +' };
    case 'bienfaiteur': return { emoji: '🌟', label: 'Grand Bienfaiteur' };
    case 'custom': return { emoji: '💝', label: 'Don personnalisé' };
    default: return { emoji: '❤️', label: type };
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ProfilPage() {
  const router = useRouter();
  const { user, isAuthenticated, signOut, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'infos' | 'preferences' | 'commandes' | 'dons'>('infos');
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // États pour les commandes
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // ✅ États pour les dons
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    nom_famille: '',
    telephone: '',
    taille_famille: 1,
    adresse_livraison: '',
  });

  const availablePreferences = [
    'Végétarien',
    'Végan',
    'Sans gluten',
    'Sans lactose',
    'Halal',
    'Casher',
    'Sans porc',
    'Sans fruits de mer',
    'Allergique aux arachides',
    'Allergique aux œufs',
  ];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/connexion');
      return;
    }

    if (user?.id) {
      loadProfile();
    }
  }, [user, isAuthenticated, authLoading, router]);

  // Charger les commandes quand on clique sur l'onglet
  useEffect(() => {
    if (activeTab === 'commandes' && user?.id && orders.length === 0) {
      loadOrders();
    }
  }, [activeTab, user]);

  // ✅ Charger les dons quand on clique sur l'onglet
  useEffect(() => {
    if (activeTab === 'dons' && user?.id && donations.length === 0) {
      loadDonations();
    }
  }, [activeTab, user]);

  const loadProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await getUserProfile(user.id);
      
      if (data) {
        setProfile(data);
        setEditData({
          nom_famille: data.nom_famille,
          telephone: data.telephone,
          taille_famille: data.taille_famille,
          adresse_livraison: data.adresse_livraison || '',
        });
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      showMessage('error', 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  // Charger les commandes
  const loadOrders = async () => {
    if (!user?.id) return;

    try {
      setLoadingOrders(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement commandes:', error);
        return;
      }

      setOrders(data || []);
      console.log('✅ Commandes chargées:', data?.length || 0);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // ✅ Charger les dons
  const loadDonations = async () => {
    if (!user?.id) return;

    try {
      setLoadingDonations(true);
      
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement dons:', error);
        return;
      }

      setDonations(data || []);
      console.log('✅ Dons chargés:', data?.length || 0);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoadingDonations(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      
      const { taille_famille, ...dataWithoutFamilySize } = editData;
      const result = await updateUserProfile(user.id, dataWithoutFamilySize);

      if (!result.success) {
        showMessage('error', result.error || 'Erreur lors de la mise à jour');
        setSaving(false);
        return;
      }

      if (taille_famille !== profile?.taille_famille) {
        const familySizeUpdated = await updateFamilySize(user.id, taille_famille);
        if (!familySizeUpdated) {
          showMessage('error', 'Erreur mise à jour taille famille');
          setSaving(false);
          return;
        }
      }

      showMessage('success', 'Profil mis à jour avec succès !');
      await loadProfile();
      setIsEditing(false);
    } catch (error) {
      showMessage('error', 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePreference = async (preference: string) => {
    if (!user?.id || !profile) return;

    const currentPrefs = profile.preferences_alimentaires || [];
    const isActive = currentPrefs.includes(preference);

    const result = isActive
      ? await removeDietaryPreference(user.id, preference)
      : await addDietaryPreference(user.id, preference);

    if (result.success) {
      await loadProfile();
      showMessage('success', 'Préférences mises à jour !');
    } else {
      showMessage('error', result.error || 'Erreur');
    }
  };

  // ✅ Calculer le total des dons
  const getTotalDonations = (): number => {
    return donations.reduce((sum, d) => sum + d.amount, 0);
  };

  // ✅ Calculer le total des repas offerts
  const getTotalMealsOffered = (): number => {
    return donations.reduce((sum, d) => sum + d.feeds_count, 0);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-lg" style={{ color: '#5a4a7c' }}>Chargement du profil...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* En-tête du profil */}
        <div
          className="mb-6 rounded-3xl p-8 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
        >
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-5xl shadow-lg">
              👤
            </div>
            <div className="flex-1 min-w-[200px]">
              <h1 className="text-3xl font-bold text-white mb-2">
                {profile.nom_famille}
              </h1>
              <p className="text-white/90 text-base mb-3">{profile.email}</p>
              <div className="flex gap-3 flex-wrap">
                <span
                  className="px-4 py-2 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: 'white', color: '#5a4a7c' }}
                >
                  👨‍👩‍👧‍👦 {profile.taille_famille} personne{profile.taille_famille > 1 ? 's' : ''}
                </span>
                {profile.telephone && (
                  <span
                    className="px-4 py-2 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: 'white', color: '#5a4a7c' }}
                  >
                    📞 {profile.telephone}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition"
            >
              🚪 Déconnexion
            </button>
          </div>
        </div>

        {/* Message de notification */}
        {message && (
          <div
            className="mb-6 p-4 rounded-xl shadow-lg"
            style={{
              backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
              color: message.type === 'success' ? '#155724' : '#721c24',
            }}
          >
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* Onglets */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'infos', label: '📋 Informations' },
            { id: 'preferences', label: '⚙️ Préférences' },
            { id: 'commandes', label: '📦 Mes commandes' },
            { id: 'dons', label: '❤️ Mes dons' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="px-6 py-3 rounded-xl font-semibold transition whitespace-nowrap"
              style={{
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#5a4a7c' : '#666',
                boxShadow: activeTab === tab.id ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu des onglets */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          
          {/* Onglet Informations */}
          {activeTab === 'infos' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#5a4a7c' }}>
                  Informations personnelles
                </h2>
                <button
                  onClick={() => {
                    if (isEditing) {
                      loadProfile();
                    }
                    setIsEditing(!isEditing);
                  }}
                  className="px-4 py-2 rounded-xl font-semibold transition"
                  style={{
                    backgroundColor: isEditing ? '#f0f0f0' : '#9b7ec9',
                    color: isEditing ? '#666' : 'white',
                  }}
                >
                  {isEditing ? '❌ Annuler' : '✏️ Modifier'}
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                      Nom de famille
                    </label>
                    <input
                      type="text"
                      value={editData.nom_famille}
                      onChange={(e) => setEditData({ ...editData, nom_famille: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 text-sm rounded-xl border-2"
                      style={{
                        borderColor: '#e0d4f7',
                        backgroundColor: isEditing ? 'white' : '#f9f9f9',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-2 text-sm rounded-xl border-2 bg-gray-50"
                      style={{ borderColor: '#e0d4f7', color: '#666' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={editData.telephone}
                      onChange={(e) => setEditData({ ...editData, telephone: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 text-sm rounded-xl border-2"
                      style={{
                        borderColor: '#e0d4f7',
                        backgroundColor: isEditing ? 'white' : '#f9f9f9',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                      Taille de famille
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={editData.taille_famille}
                      onChange={(e) => setEditData({ ...editData, taille_famille: parseInt(e.target.value) })}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 text-sm rounded-xl border-2"
                      style={{
                        borderColor: '#e0d4f7',
                        backgroundColor: isEditing ? 'white' : '#f9f9f9',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                    Adresse de livraison
                  </label>
                  <textarea
                    value={editData.adresse_livraison}
                    onChange={(e) => setEditData({ ...editData, adresse_livraison: e.target.value })}
                    disabled={!isEditing}
                    rows={3}
                    className="w-full px-4 py-2 text-sm rounded-xl border-2 resize-none"
                    style={{
                      borderColor: '#e0d4f7',
                      backgroundColor: isEditing ? 'white' : '#f9f9f9',
                    }}
                    placeholder="Votre adresse complète..."
                  />
                </div>

                {isEditing && (
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full py-3 px-4 text-base font-bold text-white rounded-xl shadow-lg transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
                  >
                    {saving ? '💾 Enregistrement...' : '💾 Enregistrer les modifications'}
                  </button>
                )}

                {!isEditing && (
                  <Link href="/planning">
                    <button
                      className="w-full py-3 px-4 text-base font-bold text-white rounded-xl shadow-lg transition hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
                    >
                      📅 Accéder à mon planning
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Onglet Préférences */}
          {activeTab === 'preferences' && (
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#5a4a7c' }}>
                Préférences alimentaires
              </h2>

              <p className="text-sm text-gray-600 mb-6">
                Sélectionnez vos préférences et restrictions alimentaires pour personnaliser vos menus.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availablePreferences.map((pref) => {
                  const isActive = profile.preferences_alimentaires?.includes(pref) || false;
                  return (
                    <button
                      key={pref}
                      onClick={() => handleTogglePreference(pref)}
                      className="px-4 py-3 rounded-xl font-semibold transition text-left"
                      style={{
                        backgroundColor: isActive ? '#9b7ec9' : '#f0f0f0',
                        color: isActive ? 'white' : '#666',
                      }}
                    >
                      {isActive ? '✅' : '⬜'} {pref}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Onglet Commandes */}
          {activeTab === 'commandes' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#5a4a7c' }}>
                  Historique des commandes
                </h2>
                <button
                  onClick={loadOrders}
                  className="px-4 py-2 rounded-xl font-semibold transition bg-gray-100 hover:bg-gray-200"
                  style={{ color: '#5a4a7c' }}
                >
                  🔄 Actualiser
                </button>
              </div>

              {loadingOrders ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">⏳</div>
                  <p className="text-gray-600">Chargement des commandes...</p>
                </div>
              ) : orders.length === 0 ? (
                <div
                  className="text-center py-12 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
                >
                  <span className="text-6xl block mb-4">📦</span>
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#5a4a7c' }}>
                    Aucune commande
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Vous n'avez pas encore passé de commande
                  </p>
                  <Link href="/marche">
                    <button
                      className="px-6 py-3 text-sm font-semibold text-white rounded-xl shadow-lg transition hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
                    >
                      🛒 Faire mes courses
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const status = getStatusInfo(order.statut);
                    const isExpanded = selectedOrder?.id === order.id;
                    
                    return (
                      <div
                        key={order.id}
                        className="border-2 rounded-2xl overflow-hidden transition-all"
                        style={{ borderColor: '#e0d4f7' }}
                      >
                        <div
                          className="p-4 cursor-pointer hover:bg-purple-50 transition"
                          onClick={() => setSelectedOrder(isExpanded ? null : order)}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                              <div className="text-3xl">📦</div>
                              <div>
                                <div className="font-bold text-lg" style={{ color: '#5a4a7c' }}>
                                  {order.numero_commande}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatDate(order.created_at)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span
                                className="px-3 py-1 rounded-full text-sm font-semibold"
                                style={{ backgroundColor: status.bg, color: status.text }}
                              >
                                {status.label}
                              </span>
                              
                              <div className="text-right">
                                <div className="font-bold text-lg" style={{ color: '#5a4a7c' }}>
                                  {order.total_fcfa.toLocaleString()} FCFA
                                </div>
                                <div className="text-xs text-gray-500">
                                  {Array.isArray(order.items) ? order.items.length : 0} article(s)
                                </div>
                              </div>
                              
                              <span className="text-xl text-gray-400">
                                {isExpanded ? '▲' : '▼'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div 
                            className="border-t-2 p-4" 
                            style={{ borderColor: '#e0d4f7', backgroundColor: '#faf8fc' }}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-bold mb-3" style={{ color: '#5a4a7c' }}>
                                  📍 Livraison
                                </h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p className="whitespace-pre-line">{order.adresse_livraison}</p>
                                  {order.heure_livraison && (
                                    <p>🕐 Créneau : <strong>{order.heure_livraison}</strong></p>
                                  )}
                                  {order.date_livraison_prevue && (
                                    <p>📅 Prévu le : <strong>{new Date(order.date_livraison_prevue).toLocaleDateString('fr-FR')}</strong></p>
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-bold mb-3" style={{ color: '#5a4a7c' }}>
                                  💳 Paiement
                                </h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p>Mode : <strong>{getPaymentLabel(order.methode_paiement || '')}</strong></p>
                                  {order.sous_total !== undefined && (
                                    <p>Sous-total : {order.sous_total.toLocaleString()} FCFA</p>
                                  )}
                                  {order.frais_livraison !== undefined && (
                                    <p>Livraison : {order.frais_livraison === 0 ? 'Gratuite' : `${order.frais_livraison.toLocaleString()} FCFA`}</p>
                                  )}
                                  <p className="font-bold pt-1" style={{ color: '#5a4a7c' }}>
                                    Total : {order.total_fcfa.toLocaleString()} FCFA
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6">
                              <h4 className="font-bold mb-3" style={{ color: '#5a4a7c' }}>
                                🛒 Articles commandés
                              </h4>
                              <div className="space-y-2">
                                {Array.isArray(order.items) && order.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 bg-white rounded-xl border"
                                    style={{ borderColor: '#e0d4f7' }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-2xl">{item.metadata?.emoji || '📦'}</span>
                                      <div>
                                        <div className="font-semibold text-sm">{item.product_name}</div>
                                        <div className="text-xs text-gray-500">
                                          {item.quantity} × {item.prix_unitaire?.toLocaleString()} FCFA
                                        </div>
                                      </div>
                                    </div>
                                    <div className="font-bold" style={{ color: '#5a4a7c' }}>
                                      {item.prix_total?.toLocaleString()} FCFA
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {order.notes && (
                              <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                                <span className="font-semibold text-yellow-700">📝 Notes :</span>
                                <span className="text-sm text-yellow-600 ml-2">{order.notes}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* ✅ ONGLET DONS - AVEC HISTORIQUE */}
          {/* ============================================ */}
          {activeTab === 'dons' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#5a4a7c' }}>
                  Mes contributions solidaires
                </h2>
                <button
                  onClick={loadDonations}
                  className="px-4 py-2 rounded-xl font-semibold transition bg-gray-100 hover:bg-gray-200"
                  style={{ color: '#5a4a7c' }}
                >
                  🔄 Actualiser
                </button>
              </div>

              {loadingDonations ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">⏳</div>
                  <p className="text-gray-600">Chargement des dons...</p>
                </div>
              ) : donations.length === 0 ? (
                <div
                  className="text-center py-12 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
                >
                  <span className="text-6xl block mb-4">❤️</span>
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#5a4a7c' }}>
                    Aucun don enregistré
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Vous n'avez pas encore fait de don pour notre collecte alimentaire
                  </p>
                  <Link href="/collecte-alimentaire">
                    <button
                      className="px-6 py-3 text-sm font-semibold text-white rounded-xl shadow-lg transition hover:opacity-90"
                      style={{ backgroundColor: '#f04e4e' }}
                    >
                      🤲 Faire un don
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Statistiques */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                      className="rounded-xl p-4 text-center"
                      style={{ backgroundColor: '#f0e6ff', border: '2px solid #9b7ec9' }}
                    >
                      <div className="text-3xl font-bold" style={{ color: '#5a4a7c' }}>
                        {donations.length}
                      </div>
                      <div className="text-sm text-gray-600">Don(s) effectué(s)</div>
                    </div>
                    <div 
                      className="rounded-xl p-4 text-center"
                      style={{ backgroundColor: '#ecfdf5', border: '2px solid #86efac' }}
                    >
                      <div className="text-3xl font-bold" style={{ color: '#16a34a' }}>
                        {getTotalDonations().toLocaleString()} FCFA
                      </div>
                      <div className="text-sm text-gray-600">Total contribué</div>
                    </div>
                    <div 
                      className="rounded-xl p-4 text-center"
                      style={{ backgroundColor: '#fef3c7', border: '2px solid #fcd34d' }}
                    >
                      <div className="text-3xl font-bold" style={{ color: '#d97706' }}>
                        {getTotalMealsOffered()}
                      </div>
                      <div className="text-sm text-gray-600">Repas offerts</div>
                    </div>
                  </div>

                  {/* Liste des dons */}
                  <div className="space-y-4">
                    {donations.map((donation) => {
                      const typeInfo = getDonationTypeLabel(donation.donation_type);
                      const isExpanded = selectedDonation?.id === donation.id;
                      
                      return (
                        <div
                          key={donation.id}
                          className="border-2 rounded-2xl overflow-hidden transition-all"
                          style={{ borderColor: '#fce7f3' }}
                        >
                          <div
                            className="p-4 cursor-pointer hover:bg-pink-50 transition"
                            onClick={() => setSelectedDonation(isExpanded ? null : donation)}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-4">
                              <div className="flex items-center gap-4">
                                <div className="text-3xl">{typeInfo.emoji}</div>
                                <div>
                                  <div className="font-bold text-lg" style={{ color: '#5a4a7c' }}>
                                    {typeInfo.label}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {formatDateShort(donation.created_at)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div 
                                  className="px-3 py-1 rounded-full text-sm font-semibold"
                                  style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}
                                >
                                  🍽️ {donation.feeds_count} repas
                                </div>
                                
                                <div className="text-right">
                                  <div className="font-bold text-lg" style={{ color: '#16a34a' }}>
                                    {donation.amount.toLocaleString()} FCFA
                                  </div>
                                </div>
                                
                                <span className="text-xl text-gray-400">
                                  {isExpanded ? '▲' : '▼'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div 
                              className="border-t-2 p-4" 
                              style={{ borderColor: '#fce7f3', backgroundColor: '#fdf4f8' }}
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-bold mb-3" style={{ color: '#5a4a7c' }}>
                                    📋 Détails du don
                                  </h4>
                                  <div className="text-sm text-gray-600 space-y-2">
                                    <p>
                                      <span className="font-semibold">Date :</span>{' '}
                                      {formatDate(donation.created_at)}
                                    </p>
                                    <p>
                                      <span className="font-semibold">Montant :</span>{' '}
                                      <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                                        {donation.amount.toLocaleString()} FCFA
                                      </span>
                                    </p>
                                    <p>
                                      <span className="font-semibold">Repas offerts :</span>{' '}
                                      {donation.feeds_count} repas
                                    </p>
                                    <p>
                                      <span className="font-semibold">Paiement :</span>{' '}
                                      {getPaymentLabel(donation.payment_method)}
                                    </p>
                                    {donation.is_anonymous && (
                                      <p className="text-purple-600">
                                        🔒 Don anonyme
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-bold mb-3" style={{ color: '#5a4a7c' }}>
                                    🏠 Bénéficiaire
                                  </h4>
                                  <div className="text-sm text-gray-600">
                                    {donation.beneficiary_id ? (
                                      <p>Centre #{donation.beneficiary_id}</p>
                                    ) : (
                                      <p>🌍 Tous les bénéficiaires</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {donation.message && (
                                <div className="mt-4 p-3 bg-white rounded-xl border" style={{ borderColor: '#fce7f3' }}>
                                  <span className="font-semibold" style={{ color: '#5a4a7c' }}>💬 Votre message :</span>
                                  <p className="text-sm text-gray-600 mt-1 italic">"{donation.message}"</p>
                                </div>
                              )}

                              <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200">
                                <span className="text-green-700">
                                  ✅ Merci pour votre générosité ! Votre don a permis d'offrir {donation.feeds_count} repas.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bouton faire un autre don */}
                  <div className="text-center pt-4">
                    <Link href="/collecte-alimentaire">
                      <button
                        className="px-8 py-3 text-base font-semibold text-white rounded-xl shadow-lg transition hover:opacity-90"
                        style={{ backgroundColor: '#f04e4e' }}
                      >
                        🤲 Faire un autre don
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}