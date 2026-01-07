'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { initializePaystack, generateReference } from '@/lib/paystack';

// Types
interface DeliveryInfo {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  deliveryTime: string;
  instructions: string;
}

type PaymentMethod = 'wave' | 'orange-money' | 'mtn-money' | 'cash' | '';

// Données statiques
const DISTRICTS = [
  'Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody',
  'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon',
];

const DELIVERY_TIMES = [
  '08h00 - 10h00', '10h00 - 12h00', '12h00 - 14h00',
  '14h00 - 16h00', '16h00 - 18h00', '18h00 - 20h00',
];

const PAYMENT_METHODS = [
  { id: 'wave', name: 'Wave', icon: '🌊' },
  { id: 'orange-money', name: 'Orange Money', icon: '🍊' },
  { id: 'mtn-money', name: 'MTN MoMo', icon: '💛' },
  { id: 'cash', name: 'Paiement à la livraison', icon: '💵' },
];

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TLR${year}${month}${day}${random}`;
}

// ============================================================
// NOUVELLE FONCTION: Vérifier le paiement côté serveur
// ============================================================
async function verifyPaymentServer(reference: string, expectedAmount: number): Promise<{
  success: boolean;
  error?: string;
  data?: {
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    paidAt: string;
  };
}> {
  try {
    const response = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference,
        expectedAmount,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Erreur de vérification du paiement',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error('Erreur appel API verify:', error);
    return {
      success: false,
      error: 'Impossible de vérifier le paiement. Veuillez contacter le support.',
    };
  }
}

export default function PanierPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart, loading: cartLoading } = useCart();

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Abidjan',
    district: '',
    deliveryTime: '',
    instructions: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('');

  const subtotal = totalPrice;
  const fraisLivraison = subtotal >= 5000 ? 0 : 1000;
  const total = subtotal + fraisLivraison;

  useEffect(() => {
    if (user?.id) {
      loadUserInfo();
    }
  }, [user]);

  async function loadUserInfo() {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('nom_famille, telephone, email, adresse_livraison')
        .eq('id', user.id)
        .single();

      if (data) {
        let addressData = data.adresse_livraison;
        if (typeof addressData === 'string') {
          try { addressData = JSON.parse(addressData); } catch { addressData = {}; }
        }
        setDeliveryInfo(prev => ({
          ...prev,
          fullName: data.nom_famille || '',
          phone: data.telephone || '',
          email: data.email || user.email || '',
          address: addressData?.address || '',
          district: addressData?.district || '',
        }));
      }
    } catch (error) {
      console.error('Erreur chargement infos:', error);
    }
  }

  const openCheckout = () => {
    if (items.length === 0) return alert('Votre panier est vide');
    setShowCheckoutModal(true);
    setCheckoutStep(1);
  };

  const closeCheckout = () => {
    setShowCheckoutModal(false);
    setCheckoutStep(1);
    setPaymentMethod('');
    setProcessingMessage('');
  };

  const validateStep2 = (): boolean => {
    if (!deliveryInfo.fullName.trim()) return (alert('Veuillez entrer votre nom complet'), false);
    if (!deliveryInfo.phone.trim() || deliveryInfo.phone.length < 10) return (alert('Numéro de téléphone invalide'), false);
    if (!deliveryInfo.email.trim() || !deliveryInfo.email.includes('@')) return (alert('Veuillez entrer une adresse email valide'), false);
    if (!deliveryInfo.address.trim()) return (alert('Veuillez entrer votre adresse'), false);
    if (!deliveryInfo.district) return (alert('Veuillez sélectionner votre quartier'), false);
    if (!deliveryInfo.deliveryTime) return (alert('Veuillez sélectionner un créneau'), false);
    return true;
  };

  // Créer la commande dans Supabase
  const createOrder = async (paymentReference: string, paymentStatus: string) => {
    const newOrderNumber = generateOrderNumber();
    setOrderNumber(newOrderNumber);

    const itemsForDB = items.map(item => ({
      product_name: item.product_name,
      product_type: item.product_type,
      quantity: item.quantity,
      unit: item.unit,
      quality: item.quality,
      prix_unitaire: item.prix_unitaire,
      prix_total: item.prix_total,
      metadata: item.metadata,
    }));

    const adresseComplete = `${deliveryInfo.fullName} - ${deliveryInfo.phone}\n${deliveryInfo.address}\n${deliveryInfo.district}, ${deliveryInfo.city}${deliveryInfo.instructions ? `\nInstructions: ${deliveryInfo.instructions}` : ''}`;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orderData = {
      user_id: user?.id || null,
      numero_commande: newOrderNumber,
      total_fcfa: total,
      sous_total: subtotal,
      frais_livraison: fraisLivraison,
      statut: 'confirmee',
      statut_paiement: paymentStatus,
      methode_paiement: paymentMethod,
      reference_paiement: paymentReference,
      adresse_livraison: adresseComplete,
      heure_livraison: deliveryInfo.deliveryTime,
      nom_client: deliveryInfo.fullName,
      telephone: deliveryInfo.phone,
      email_client: deliveryInfo.email,
      date_livraison_prevue: tomorrow.toISOString(),
      items: itemsForDB,
      notes: deliveryInfo.instructions || null,
    };

    const { error } = await supabase.from('orders').insert(orderData);
    if (error) {
      console.error('Erreur commande:', error);
      throw error;
    }

    if (user?.id) {
      await supabase.from('users').update({
        nom_famille: deliveryInfo.fullName,
        telephone: deliveryInfo.phone,
        adresse_livraison: JSON.stringify({
          address: deliveryInfo.address,
          city: deliveryInfo.city,
          district: deliveryInfo.district,
        }),
      }).eq('id', user.id);
    }

    await clearCart();
    return newOrderNumber;
  };

  // ============================================================
  // PAIEMENT PAYSTACK SÉCURISÉ (avec vérification serveur)
  // ============================================================
  const handlePaystackPayment = () => {
    if (!deliveryInfo.email) {
      alert('Veuillez entrer une adresse email pour le paiement');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Ouverture du paiement...');
    const reference = generateReference('TLR');

    initializePaystack({
      email: deliveryInfo.email,
      amount: total,
      reference: reference,
      metadata: {
        order_type: 'order',
        user_id: user?.id || 'guest',
        custom_fields: [
          { display_name: 'Nom Client', variable_name: 'customer_name', value: deliveryInfo.fullName },
          { display_name: 'Téléphone', variable_name: 'customer_phone', value: deliveryInfo.phone },
          { display_name: 'Adresse', variable_name: 'delivery_address', value: `${deliveryInfo.address}, ${deliveryInfo.district}` }
        ]
      },
      onSuccess: async (paymentReference) => {
        try {
          // ============================================================
          // ÉTAPE CRITIQUE: Vérifier le paiement côté serveur
          // ============================================================
          setProcessingMessage('Vérification du paiement...');
          console.log('🔐 Vérification du paiement:', paymentReference);

          const verification = await verifyPaymentServer(paymentReference, total);

          if (!verification.success) {
            // Paiement non vérifié - NE PAS créer la commande
            console.error('❌ Vérification échouée:', verification.error);
            alert(`Erreur de vérification: ${verification.error}\n\nSi vous avez été débité, contactez le support avec la référence: ${paymentReference}`);
            setIsProcessing(false);
            setProcessingMessage('');
            return;
          }

          // ============================================================
          // Paiement vérifié - Créer la commande
          // ============================================================
          console.log('✅ Paiement vérifié:', verification.data);
          setProcessingMessage('Création de la commande...');

          await createOrder(paymentReference, 'paye');
          setCheckoutStep(4);
          console.log('✅ Commande créée avec succès');

        } catch (error) {
          console.error('Erreur création commande:', error);
          alert('Paiement vérifié mais erreur lors de la création de la commande. Contactez le support.');
        } finally {
          setIsProcessing(false);
          setProcessingMessage('');
        }
      },
      onCancel: () => {
        setIsProcessing(false);
        setProcessingMessage('');
        console.log('❌ Paiement annulé par l\'utilisateur');
      }
    });
  };

  // Paiement à la livraison (Cash)
  const handleCashPayment = async () => {
    setIsProcessing(true);
    setProcessingMessage('Création de la commande...');
    try {
      const reference = generateReference('CASH');
      await createOrder(reference, 'en_attente');
      setCheckoutStep(4);
      console.log('✅ Commande créée (paiement à la livraison)');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la commande. Réessayez.');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Finaliser la commande selon le mode de paiement
  const finalizeOrder = () => {
    if (!paymentMethod) return alert('Veuillez sélectionner un mode de paiement');

    if (paymentMethod === 'cash') {
      handleCashPayment();
    } else {
      handlePaystackPayment();
    }
  };

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900">
        <Header />
        <main className="max-w-7xl mx-auto px-8 py-12 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-white">Chargement du panier...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900">
      <Header />

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🛒 Mon Panier</h1>
          <p className="text-gray-600 text-lg">{totalItems} article{totalItems > 1 ? 's' : ''} dans votre panier</p>
          
          {!user && items.length > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1">
                <div className="font-bold text-sm text-yellow-700">Mode invité</div>
                <div className="text-xs text-yellow-600">Connectez-vous pour suivre vos commandes.</div>
              </div>
              <Link href="/connexion">
                <button className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-yellow-600 hover:bg-yellow-700">Se connecter</button>
              </Link>
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{item.metadata?.emoji || '📦'}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{item.product_name}</h3>
                      <p className="text-gray-600 text-sm">
                        {item.product_type === 'ingredient' ? '📦 Ingrédient' : item.product_type === 'dish' ? '🍽️ Plat préparé' : '📋 Menu'}
                      </p>
                      <p className="text-sm text-gray-500">Qualité : <span className="font-semibold">{item.quality}</span></p>
                      <p className="text-lg font-bold text-green-600 mt-1">{item.prix_unitaire.toLocaleString('fr-FR')} FCFA / {item.unit}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-xl">−</button>
                      <span className="text-xl font-bold w-12 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xl">+</button>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">{item.prix_total.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 text-2xl">🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg p-6 sticky top-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">💰 Récapitulatif</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Sous-total</span>
                    <span className="font-semibold">{subtotal.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Frais de livraison</span>
                    <span className={`font-semibold ${fraisLivraison === 0 ? 'text-green-600' : ''}`}>
                      {fraisLivraison === 0 ? 'GRATUIT ✨' : `${fraisLivraison.toLocaleString('fr-FR')} FCFA`}
                    </span>
                  </div>
                  {fraisLivraison > 0 && subtotal < 5000 && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-gray-700">
                      💡 Livraison gratuite dès 5000 FCFA ! Plus que <strong>{(5000 - subtotal).toLocaleString('fr-FR')} FCFA</strong>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-200 pt-4">
                    <div className="flex justify-between text-xl font-bold text-gray-800">
                      <span>Total</span>
                      <span className="text-green-600">{total.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>
                </div>
                <Button variant="success" size="lg" fullWidth onClick={openCheckout}>✅ Valider la commande</Button>
                <Link href="/marche"><Button variant="outline" size="md" fullWidth className="mt-3">🔙 Continuer mes achats</Button></Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-12 text-center">
            <div className="text-8xl mb-6">🛒</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Votre panier est vide</h2>
            <p className="text-gray-600 text-lg mb-8">Découvrez nos produits frais et nos plats préparés !</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/marche"><Button variant="primary" size="lg">🛒 Aller au Marché</Button></Link>
              <Link href="/resto"><Button variant="success" size="lg">🍽️ Découvrir Le Resto</Button></Link>
            </div>
          </div>
        )}
      </main>

      {/* MODAL CHECKOUT */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeCheckout}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <button onClick={closeCheckout} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold">✕</button>
              <div className="flex items-center justify-between mb-6 max-w-md mx-auto">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${checkoutStep >= step ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {checkoutStep > step ? '✓' : step}
                    </div>
                    {step < 4 && <div className={`flex-1 h-1 mx-2 ${checkoutStep > step ? 'bg-purple-600' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
              <h2 className="text-2xl font-bold text-center text-gray-800">
                {checkoutStep === 1 && '📋 Récapitulatif'}
                {checkoutStep === 2 && '🚚 Livraison'}
                {checkoutStep === 3 && '💳 Paiement'}
                {checkoutStep === 4 && '✅ Confirmée !'}
              </h2>
            </div>

            <div className="p-6">
              {/* ÉTAPE 1 */}
              {checkoutStep === 1 && (
                <div className="space-y-6">
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{item.metadata?.emoji || '📦'}</span>
                          <div>
                            <div className="font-semibold text-gray-800">{item.product_name}</div>
                            <div className="text-sm text-gray-500">{item.quantity} × {item.prix_unitaire.toLocaleString()} FCFA</div>
                          </div>
                        </div>
                        <div className="font-bold text-purple-600">{item.prix_total.toLocaleString()} FCFA</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <div className="flex justify-between mb-2"><span className="text-gray-600">Sous-total</span><span className="font-semibold">{subtotal.toLocaleString()} FCFA</span></div>
                    <div className="flex justify-between mb-2"><span className="text-gray-600">Livraison</span><span className={`font-semibold ${fraisLivraison === 0 ? 'text-green-600' : ''}`}>{fraisLivraison === 0 ? 'GRATUIT' : `${fraisLivraison.toLocaleString()} FCFA`}</span></div>
                    <div className="pt-2 border-t border-purple-200 flex justify-between"><span className="font-bold text-lg">Total</span><span className="font-bold text-2xl text-purple-600">{total.toLocaleString()} FCFA</span></div>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="secondary" onClick={closeCheckout} className="flex-1">Retour</Button>
                    <Button variant="primary" onClick={() => setCheckoutStep(2)} className="flex-[2]">Continuer →</Button>
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 */}
              {checkoutStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-2 text-gray-700">Nom complet *</label>
                      <input type="text" value={deliveryInfo.fullName} onChange={(e) => setDeliveryInfo({...deliveryInfo, fullName: e.target.value})} placeholder="Ex: Kouassi Jean" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-2 text-gray-700">Téléphone *</label>
                      <input type="tel" value={deliveryInfo.phone} onChange={(e) => setDeliveryInfo({...deliveryInfo, phone: e.target.value})} placeholder="Ex: +225 07 XX XX XX XX" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-semibold mb-2 text-gray-700">Email * <span className="text-sm font-normal text-gray-500">(requis pour le paiement)</span></label>
                      <input type="email" value={deliveryInfo.email} onChange={(e) => setDeliveryInfo({...deliveryInfo, email: e.target.value})} placeholder="Ex: exemple@email.com" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-semibold mb-2 text-gray-700">Adresse *</label>
                      <input type="text" value={deliveryInfo.address} onChange={(e) => setDeliveryInfo({...deliveryInfo, address: e.target.value})} placeholder="Rue, résidence, bâtiment..." className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-2 text-gray-700">Commune *</label>
                      <select value={deliveryInfo.district} onChange={(e) => setDeliveryInfo({...deliveryInfo, district: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none">
                        <option value="">-- Sélectionnez --</option>
                        {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-2 text-gray-700">Créneau *</label>
                      <select value={deliveryInfo.deliveryTime} onChange={(e) => setDeliveryInfo({...deliveryInfo, deliveryTime: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none">
                        <option value="">-- Sélectionnez --</option>
                        {DELIVERY_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-semibold mb-2 text-gray-700">Instructions (optionnel)</label>
                      <input type="text" value={deliveryInfo.instructions} onChange={(e) => setDeliveryInfo({...deliveryInfo, instructions: e.target.value})} placeholder="Code portail, étage..." className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none" />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex gap-3">
                    <span className="text-2xl">🚚</span>
                    <div>
                      <div className="font-semibold text-green-700">Livraison à domicile</div>
                      <div className="text-sm text-green-600">{fraisLivraison === 0 ? 'Livraison GRATUITE !' : `Frais : ${fraisLivraison.toLocaleString()} FCFA`}</div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="secondary" onClick={() => setCheckoutStep(1)} className="flex-1">← Retour</Button>
                    <Button variant="primary" onClick={() => validateStep2() && setCheckoutStep(3)} className="flex-[2]">Continuer →</Button>
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 */}
              {checkoutStep === 3 && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <div className="flex justify-between mb-2"><span className="text-gray-600">Commande</span><span className="font-bold">{subtotal.toLocaleString()} FCFA</span></div>
                    <div className="flex justify-between mb-2"><span className="text-gray-600">Livraison</span><span className="font-bold">{fraisLivraison === 0 ? 'GRATUIT' : `${fraisLivraison.toLocaleString()} FCFA`}</span></div>
                    <div className="pt-2 border-t border-purple-200 flex justify-between"><span className="font-bold text-lg">Total</span><span className="font-bold text-2xl text-purple-600">{total.toLocaleString()} FCFA</span></div>
                  </div>
                  <div>
                    <h3 className="font-bold mb-4 text-lg text-gray-800">Mode de paiement</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {PAYMENT_METHODS.map((m) => (
                        <button key={m.id} onClick={() => setPaymentMethod(m.id as PaymentMethod)} className={`p-5 rounded-xl text-left border-2 transition-all ${paymentMethod === m.id ? 'border-purple-500 bg-purple-50 shadow-lg' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
                          <div className="text-4xl mb-2">{m.icon}</div>
                          <div className="font-semibold text-gray-800">{m.name}</div>
                          {m.id !== 'cash' && (
                            <div className="text-xs text-gray-500 mt-1">Paiement sécurisé</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  {paymentMethod === 'cash' && (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex gap-3">
                      <span className="text-2xl">💵</span>
                      <div>
                        <div className="font-semibold text-green-700">Paiement à la livraison</div>
                        <div className="text-sm text-green-600">Préparez <strong>{total.toLocaleString()} FCFA</strong> en espèces</div>
                      </div>
                    </div>
                  )}
                  {paymentMethod && paymentMethod !== 'cash' && (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex gap-3">
                      <span className="text-2xl">🔐</span>
                      <div>
                        <div className="font-semibold text-blue-700">Paiement sécurisé par Paystack</div>
                        <div className="text-sm text-blue-600">
                          Vous allez être redirigé vers {paymentMethod === 'wave' ? 'Wave' : paymentMethod === 'orange-money' ? 'Orange Money' : 'MTN MoMo'} pour valider le paiement de <strong>{total.toLocaleString()} FCFA</strong>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Message de traitement amélioré */}
                  {isProcessing && processingMessage && (
                    <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center gap-3">
                      <div className="animate-spin text-2xl">⏳</div>
                      <div>
                        <div className="font-semibold text-yellow-700">{processingMessage}</div>
                        <div className="text-sm text-yellow-600">Veuillez patienter...</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <Button variant="secondary" onClick={() => setCheckoutStep(2)} className="flex-1" disabled={isProcessing}>← Retour</Button>
                    <Button variant="success" onClick={finalizeOrder} className="flex-[2]" disabled={!paymentMethod || isProcessing}>
                      {isProcessing ? '⏳ Traitement...' : paymentMethod === 'cash' ? '✅ Confirmer la commande' : '💳 Payer maintenant'}
                    </Button>
                  </div>
                </div>
              )}

              {/* ÉTAPE 4 */}
              {checkoutStep === 4 && (
                <div className="text-center space-y-6 py-6">
                  <div className="text-8xl">🎉</div>
                  <h2 className="text-3xl font-bold text-purple-600">Commande confirmée !</h2>
                  <p className="text-lg text-gray-600">Merci ! Vous recevrez une confirmation par SMS.</p>
                  <div className="inline-block px-6 py-4 rounded-xl bg-purple-50 border-2 border-purple-200">
                    <div className="text-sm text-gray-500">N° commande</div>
                    <div className="text-2xl font-bold text-purple-600">{orderNumber}</div>
                  </div>
                  
                  {paymentMethod !== 'cash' && (
                    <div className="inline-block px-4 py-2 rounded-lg bg-green-100 border border-green-300">
                      <span className="text-green-700 font-semibold">✅ Paiement vérifié et sécurisé</span>
                    </div>
                  )}
                  
                  <div className="text-left p-6 rounded-xl bg-gray-50 border border-gray-200 max-w-md mx-auto">
                    <h3 className="font-bold mb-3 text-purple-600">📍 Livraison</h3>
                    <p className="text-sm text-gray-600">
                      <strong>{deliveryInfo.fullName}</strong><br />
                      {deliveryInfo.address}<br />
                      {deliveryInfo.district}, {deliveryInfo.city}<br />
                      📞 {deliveryInfo.phone}<br />
                      🕐 {deliveryInfo.deliveryTime}
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                      <span className="text-gray-500">Total {paymentMethod === 'cash' ? '(à payer)' : '(payé)'}</span>
                      <span className="font-bold text-purple-600">{total.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                  <div className="flex gap-4 justify-center flex-wrap">
                    <Link href="/marche"><Button variant="secondary">🛒 Continuer</Button></Link>
                    <Button variant="primary" onClick={() => { closeCheckout(); router.push('/'); }}>🏠 Accueil</Button>
                  </div>
                  {user && <p className="text-sm text-gray-500">Suivez vos commandes dans <Link href="/profil" className="underline text-purple-600">votre profil</Link></p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
