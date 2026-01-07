'use client';

// =============================================================================
// collecte-alimentaire_page.tsx - VERSION COMPLÈTE FINALE
// =============================================================================
// Date : 8 décembre 2025
// Inclus : Toutes les sections + Menu déroulant bénéficiaires + Supabase
// =============================================================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Types
interface DonationOption {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  description: string;
  feeds: number;
}

interface Beneficiary {
  id: number;
  name: string;
  type: 'orphelinat' | 'centre' | 'association';
  location: string;
  beneficiaries: number;
  emoji: string;
}

type PaymentMethod = 'wave' | 'orange-money' | 'mtn-money' | 'cash' | '';

export default function CollecteAlimentairePage() {
  const { user } = useAuth();
  
  const [selectedDonation, setSelectedDonation] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorMessage, setDonorMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<number | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [donationId, setDonationId] = useState<string>('');

  // Pré-remplir email si connecté
  useEffect(() => {
    if (user?.email) {
      setDonorEmail(user.email);
    }
  }, [user]);

  // Options de don
  const donationOptions: DonationOption[] = [
    {
      id: 'petit',
      name: 'Petit Geste',
      emoji: '🍞',
      amount: 2000,
      description: '1 repas pour 1 personne',
      feeds: 1
    },
    {
      id: 'moyen',
      name: 'Coup de Main',
      emoji: '🍱',
      amount: 5000,
      description: '3 repas complets',
      feeds: 3
    },
    {
      id: 'genereux',
      name: 'Geste Généreux',
      emoji: '🎁',
      amount: 10000,
      description: '7 repas pour une semaine',
      feeds: 7
    },
    {
      id: 'solidaire',
      name: 'Solidarité +',
      emoji: '❤️',
      amount: 20000,
      description: '15 repas équilibrés',
      feeds: 15
    },
    {
      id: 'bienfaiteur',
      name: 'Grand Bienfaiteur',
      emoji: '🌟',
      amount: 50000,
      description: '40 repas pour un mois',
      feeds: 40
    }
  ];

  // Bénéficiaires
  const beneficiaries: Beneficiary[] = [
    {
      id: 1,
      name: 'Orphelinat Les Petits Anges',
      type: 'orphelinat',
      location: 'Yopougon',
      beneficiaries: 45,
      emoji: '👶'
    },
    {
      id: 2,
      name: 'Centre d\'Accueil Espoir',
      type: 'centre',
      location: 'Abobo',
      beneficiaries: 32,
      emoji: '🏠'
    },
    {
      id: 3,
      name: 'Association Cœur Solidaire',
      type: 'association',
      location: 'Adjamé',
      beneficiaries: 67,
      emoji: '🤝'
    },
    {
      id: 4,
      name: 'Foyer de la Miséricorde',
      type: 'orphelinat',
      location: 'Cocody',
      beneficiaries: 28,
      emoji: '🙏'
    },
    {
      id: 5,
      name: 'Maison de Partage',
      type: 'centre',
      location: 'Koumassi',
      beneficiaries: 54,
      emoji: '🏡'
    }
  ];

  // Modes de paiement
  const paymentMethods = [
    { id: 'wave', name: 'Wave', icon: '📱', color: '#00d4ff' },
    { id: 'orange-money', name: 'Orange Money', icon: '🍊', color: '#ff7900' },
    { id: 'mtn-money', name: 'MTN MoMo', icon: '📲', color: '#ffcb05' },
    { id: 'cash', name: 'Espèces', icon: '💵', color: '#22c55e' },
  ];

  // Calculer le montant du don
  const getDonationAmount = (): number => {
    if (customAmount) {
      return parseInt(customAmount) || 0;
    }
    if (selectedDonation) {
      const option = donationOptions.find(o => o.id === selectedDonation);
      return option?.amount || 0;
    }
    return 0;
  };

  // Calculer le nombre de personnes nourries
  const getFeedsCount = (): number => {
    const amount = getDonationAmount();
    if (customAmount) {
      return Math.floor(amount / 2000); // 2000 FCFA = 1 repas
    }
    if (selectedDonation) {
      const option = donationOptions.find(o => o.id === selectedDonation);
      return option?.feeds || 0;
    }
    return 0;
  };

  // Sauvegarder le don dans Supabase
  const handleDonation = async () => {
    const amount = getDonationAmount();
    
    if (amount <= 0) {
      alert('Veuillez sélectionner ou saisir un montant de don');
      return;
    }

    if (!donorName || !donorEmail) {
      alert('Veuillez renseigner votre nom et email');
      return;
    }

    if (!paymentMethod) {
      alert('Veuillez sélectionner un mode de paiement');
      return;
    }

    // Validation email basique
    if (!donorEmail.includes('@')) {
      alert('Veuillez entrer une adresse email valide');
      return;
    }

    setIsProcessing(true);

    try {
      // Préparer les données du don
      const donationData = {
        user_id: user?.id || null,
        donor_name: isAnonymous ? 'Donateur Anonyme' : donorName,
        donor_email: donorEmail,
        amount: amount,
        donation_type: selectedDonation || 'custom',
        feeds_count: getFeedsCount(),
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cash' ? 'pending' : 'pending',
        beneficiary_id: selectedBeneficiary,
        message: donorMessage || null,
        is_anonymous: isAnonymous,
      };

      // Sauvegarder dans Supabase
      const { data, error } = await supabase
        .from('donations')
        .insert(donationData)
        .select()
        .single();

      if (error) {
        console.error('Erreur sauvegarde don:', error);
        throw error;
      }

      console.log('✅ Don enregistré:', data);
      setDonationId(data.id);

      // Afficher la modale de succès
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setShowSuccessModal(false);
    setSelectedDonation(null);
    setCustomAmount('');
    setDonorName('');
    setDonorMessage('');
    setIsAnonymous(false);
    setPaymentMethod('');
    setSelectedBeneficiary(null);
    setDonationId('');
    // Garder l'email si connecté
    if (!user) {
      setDonorEmail('');
    }
  };

  const totalBeneficiaries = beneficiaries.reduce((sum, b) => sum + b.beneficiaries, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* En-tête Hero */}
        <div 
          className="mb-6 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
        >
          {/* Décoration */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="text-9xl absolute top-4 left-10">🍱</div>
            <div className="text-9xl absolute bottom-4 right-10">❤️</div>
          </div>

          <div className="relative z-10">
            <span className="text-6xl mb-4 block">🤲</span>
            <h1 className="text-3xl font-bold text-white mb-3">
              Collecte Alimentaire Solidaire
            </h1>
            <p className="text-base text-white/95 mb-4 max-w-2xl mx-auto">
              Ensemble, offrons un repas chaud et équilibré aux orphelins et personnes démunies. 
              Chaque don compte, chaque geste nourrit l'espoir.
            </p>
            
            {/* Statistiques en temps réel */}
            <div className="flex items-center justify-center gap-8 mt-6 flex-wrap">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3">
                <div className="text-3xl font-bold text-white">{totalBeneficiaries}</div>
                <div className="text-sm text-white/90">Bénéficiaires</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3">
                <div className="text-3xl font-bold text-white">1,234</div>
                <div className="text-sm text-white/90">Repas distribués</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3">
                <div className="text-3xl font-bold text-white">89</div>
                <div className="text-sm text-white/90">Donateurs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bannière utilisateur connecté */}
        {user && (
          <div 
            className="mb-6 rounded-xl p-4 flex items-center gap-3"
            style={{ backgroundColor: '#ecfdf5', border: '2px solid #86efac' }}
          >
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <div className="font-bold text-sm" style={{ color: '#166534' }}>
                Connecté en tant que {user.email}
              </div>
              <div className="text-xs" style={{ color: '#14532d' }}>
                Votre don sera enregistré dans votre historique
              </div>
            </div>
          </div>
        )}

        {/* Section: Pourquoi donner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div 
            className="bg-white rounded-2xl p-6 shadow-lg text-center"
            style={{ border: '2px solid #e0d4f7' }}
          >
            <span className="text-5xl block mb-3">🍲</span>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#5a4a7c' }}>
              Repas décents
            </h3>
            <p className="text-sm text-gray-700">
              Vous offrez des repas décents et équilibrés à des enfants et personnes vulnérables
            </p>
          </div>
          
          <div 
            className="bg-white rounded-2xl p-6 shadow-lg text-center"
            style={{ border: '2px solid #e0d4f7' }}
          >
            <span className="text-5xl block mb-3">🚚</span>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#5a4a7c' }}>
              Distribution Directe
            </h3>
            <p className="text-sm text-gray-700">
              100% de votre don est utilisé pour la distribution alimentaire aux personnes dans le besoin
            </p>
          </div>
          
          <div 
            className="bg-white rounded-2xl p-6 shadow-lg text-center"
            style={{ border: '2px solid #e0d4f7' }}
          >
            <span className="text-5xl block mb-3">📊</span>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#5a4a7c' }}>
              Transparence Totale
            </h3>
            <p className="text-sm text-gray-700">
              Suivez l'impact de votre contribution avec des rapports mensuels détaillés
            </p>
          </div>
        </div>

        {/* Section: Options de don */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-center mb-6" style={{ color: '#5a4a7c' }}>
            💝 Choisissez votre contribution
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {donationOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => {
                  setSelectedDonation(option.id);
                  setCustomAmount('');
                }}
                className="cursor-pointer rounded-2xl p-5 transition-all hover:shadow-xl hover:-translate-y-1"
                style={{
                  border: selectedDonation === option.id ? '3px solid #9b7ec9' : '2px solid #e0d4f7',
                  background: selectedDonation === option.id 
                    ? 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' 
                    : 'white'
                }}
              >
                <div className="text-center">
                  <span className="text-4xl block mb-2">{option.emoji}</span>
                  <h3 className="text-sm font-bold mb-2" style={{ color: '#5a4a7c' }}>
                    {option.name}
                  </h3>
                  <div className="text-2xl font-bold mb-2" style={{ color: '#16a34a' }}>
                    {option.amount.toLocaleString()} <span className="text-xs">FCFA</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{option.description}</p>
                  <div 
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{ backgroundColor: '#f0e6ff', color: '#5a4a7c' }}
                  >
                    Nourrit {option.feeds} personne{option.feeds > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Montant personnalisé */}
          <div 
            className="rounded-2xl p-5 mb-6"
            style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
          >
            <h3 className="text-base font-bold mb-3" style={{ color: '#5a4a7c' }}>
              💰 Ou choisissez votre montant personnalisé
            </h3>
            <input
              type="number"
              placeholder="Montant en FCFA (minimum 500)"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedDonation(null);
              }}
              min="500"
              className="w-full px-4 py-3 text-base rounded-xl border-2 focus:outline-none transition"
              style={{ borderColor: '#e0d4f7' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
            />
            {customAmount && parseInt(customAmount) >= 500 && (
              <p className="text-sm mt-2" style={{ color: '#5a4a7c' }}>
                ➜ Ce don permettra de nourrir environ <strong>{getFeedsCount()}</strong> personne{getFeedsCount() > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* ============================================ */}
          {/* MENU DÉROULANT BÉNÉFICIAIRES */}
          {/* ============================================ */}
          <div className="mb-6">
            <h3 className="text-base font-bold mb-3" style={{ color: '#5a4a7c' }}>
              🏠 Choisir un bénéficiaire (optionnel)
            </h3>
            <div className="relative">
              <select
                value={selectedBeneficiary ?? ''}
                onChange={(e) => setSelectedBeneficiary(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-4 rounded-xl border-2 text-base cursor-pointer bg-white focus:outline-none focus:border-purple-400"
                style={{ 
                  borderColor: '#e0d4f7',
                  color: '#5a4a7c',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              >
                <option value="">🌍 Tous les bénéficiaires (répartition équitable)</option>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.emoji} {b.name} - {b.location} ({b.beneficiaries} personnes)
                  </option>
                ))}
              </select>
              {/* Flèche personnalisée */}
              <div 
                className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none"
                style={{ color: '#9b7ec9' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Formulaire donateur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Votre nom complet *
              </label>
              <input
                type="text"
                placeholder="Ex: Jean Kouassi"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-xl border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Votre email *
              </label>
              <input
                type="email"
                placeholder="Ex: jean@example.com"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-xl border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
              />
            </div>
          </div>

          {/* Message optionnel */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
              Message d'encouragement (optionnel)
            </label>
            <textarea
              placeholder="Un petit mot pour les bénéficiaires..."
              value={donorMessage}
              onChange={(e) => setDonorMessage(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 text-sm rounded-xl border-2 focus:outline-none transition resize-none"
              style={{ borderColor: '#e0d4f7' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
            />
          </div>

          {/* Option anonyme */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-5 h-5 rounded"
                style={{ accentColor: '#9b7ec9' }}
              />
              <span className="text-sm" style={{ color: '#5a4a7c' }}>
                Je souhaite rester anonyme (votre nom ne sera pas affiché publiquement)
              </span>
            </label>
          </div>

          {/* Mode de paiement */}
          <div className="mb-6">
            <h3 className="text-base font-bold mb-3" style={{ color: '#5a4a7c' }}>
              💳 Mode de paiement *
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className="p-4 rounded-xl transition-all text-center"
                  style={{
                    border: `2px solid ${paymentMethod === method.id ? method.color : '#e0d4f7'}`,
                    backgroundColor: paymentMethod === method.id ? `${method.color}15` : 'white'
                  }}
                >
                  <div className="text-3xl mb-1">{method.icon}</div>
                  <div className="text-sm font-semibold" style={{ color: '#333' }}>{method.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Récapitulatif */}
          {getDonationAmount() > 0 && (
            <div 
              className="rounded-xl p-4 mb-6"
              style={{ backgroundColor: '#f0e6ff', border: '2px solid #9b7ec9' }}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color: '#5a4a7c' }}>Votre don :</span>
                <span className="text-2xl font-bold" style={{ color: '#16a34a' }}>
                  {getDonationAmount().toLocaleString()} FCFA
                </span>
              </div>
              <p className="text-sm mt-2" style={{ color: '#5a4a7c' }}>
                ❤️ Ce don permettra de nourrir <strong>{getFeedsCount()}</strong> personne{getFeedsCount() > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Bouton de don */}
          <button
            onClick={handleDonation}
            disabled={isProcessing || getDonationAmount() <= 0}
            className="w-full py-4 px-6 text-lg font-bold text-white rounded-xl shadow-2xl transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
          >
            {isProcessing ? '⏳ Traitement en cours...' : '❤️ Faire un don maintenant'}
          </button>
        </div>

        {/* Section: Bénéficiaires */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-center mb-6" style={{ color: '#5a4a7c' }}>
            🏠 Nos partenaires bénéficiaires
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {beneficiaries.map((beneficiary) => (
              <div
                key={beneficiary.id}
                className="rounded-2xl p-5 shadow-md transition-all hover:shadow-xl hover:-translate-y-1"
                style={{ border: '2px solid #e0d4f7' }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{beneficiary.emoji}</span>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: '#5a4a7c' }}>
                      {beneficiary.name}
                    </h3>
                    <p className="text-xs text-gray-600">📍 {beneficiary.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#666' }}>
                    {beneficiary.type === 'orphelinat' ? 'Orphelinat' : 
                     beneficiary.type === 'centre' ? 'Centre d\'accueil' : 'Association'}
                  </span>
                  <div 
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: '#f0e6ff', color: '#5a4a7c' }}
                  >
                    {beneficiary.beneficiaries} personnes
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Témoignages */}
        <div 
          className="rounded-2xl p-6 shadow-lg mb-8"
          style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
        >
          <h2 className="text-2xl font-bold text-center mb-6" style={{ color: '#5a4a7c' }}>
            💬 Témoignages
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl p-5 shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">👩‍🏫</span>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: '#5a4a7c' }}>
                    Marie Koné
                  </h4>
                  <p className="text-xs text-gray-600">Directrice - Orphelinat Les Petits Anges</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 italic">
                "Grâce à Talier, nos enfants reçoivent des repas équilibrés tous les jours. 
                C'est un vrai soulagement et les enfants sont en meilleure santé."
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">👨‍💼</span>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: '#5a4a7c' }}>
                    Amadou Traoré
                  </h4>
                  <p className="text-xs text-gray-600">Donateur régulier</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 italic">
                "Je contribue chaque mois et je sais exactement où va mon argent. 
                La transparence de Talier me donne confiance pour continuer à aider."
              </p>
            </div>
          </div>
        </div>

        {/* Section: FAQ */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-center mb-6" style={{ color: '#5a4a7c' }}>
            ❓ Questions fréquentes
          </h2>

          <div className="space-y-4">
            <div 
              className="rounded-xl p-4"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <h3 className="text-sm font-bold mb-2" style={{ color: '#5a4a7c' }}>
                Comment sont utilisés les dons ?
              </h3>
              <p className="text-sm text-gray-700">
                100% de votre don sert à l'achat et à la distribution d'ingrédients frais aux centres partenaires pour la préparation des repas.
              </p>
            </div>

            <div 
              className="rounded-xl p-4"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <h3 className="text-sm font-bold mb-2" style={{ color: '#5a4a7c' }}>
                Puis-je suivre l'impact de mon don ?
              </h3>
              <p className="text-sm text-gray-700">
                Oui ! Si vous êtes connecté, vous pouvez voir l'historique de vos dons dans votre profil. 
                Vous recevrez également un reçu par email.
              </p>
            </div>

            <div 
              className="rounded-xl p-4"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <h3 className="text-sm font-bold mb-2" style={{ color: '#5a4a7c' }}>
                Les dons sont-ils sécurisés ?
              </h3>
              <p className="text-sm text-gray-700">
                Absolument. Nous utilisons des plateformes de paiement sécurisées (Wave, Orange Money, MTN MoMo) pour traiter vos dons.
              </p>
            </div>

            <div 
              className="rounded-xl p-4"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <h3 className="text-sm font-bold mb-2" style={{ color: '#5a4a7c' }}>
                Puis-je faire un don régulier ?
              </h3>
              <p className="text-sm text-gray-700">
                Oui ! Vous pouvez configurer un don mensuel automatique pour soutenir durablement 
                nos bénéficiaires. Contactez-nous pour mettre en place votre contribution récurrente.
              </p>
            </div>

            <div 
              className="rounded-xl p-4"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <h3 className="text-sm font-bold mb-2" style={{ color: '#5a4a7c' }}>
                Comment puis-je suivre l'impact de mon don ?
              </h3>
              <p className="text-sm text-gray-700">
                Vous recevrez un reçu fiscal par email et un rapport mensuel avec photos et 
                statistiques sur les distributions effectuées grâce aux contributions de tous les donateurs.
              </p>
            </div>

            <div 
              className="rounded-xl p-4"
              style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
            >
              <h3 className="text-sm font-bold mb-2" style={{ color: '#5a4a7c' }}>
                Puis-je donner en nature ?
              </h3>
              <p className="text-sm text-gray-700">
                Nous privilégions les dons financiers pour garantir la fraîcheur et la qualité des repas. 
                Toutefois, pour des dons en nature (produits non périssables), contactez-nous directement.
              </p>
            </div>
          </div>
        </div>

        {/* Call to action final */}
        <div 
          className="mt-8 rounded-3xl p-8 shadow-2xl text-center"
          style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
        >
          <span className="text-5xl block mb-4">🙏</span>
          <h2 className="text-2xl font-bold text-white mb-3">
            Merci pour votre générosité !
          </h2>
          <p className="text-base text-white/95 mb-5 max-w-2xl mx-auto">
            Chaque contribution, aussi petite soit-elle, apporte espoir et dignité 
            à ceux qui en ont le plus besoin. Ensemble, construisons un avenir meilleur.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/marche">
              <button 
                className="px-6 py-3 bg-white text-sm font-bold rounded-xl shadow-lg transition hover:opacity-90"
                style={{ color: '#5a4a7c' }}
              >
                🛒 Faire mes courses
              </button>
            </Link>
            <Link href="/abonnement">
              <button 
                className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white text-sm font-bold rounded-xl shadow-lg transition hover:bg-white/30"
              >
                💎 Découvrir les abonnements
              </button>
            </Link>
          </div>
        </div>
      </main>

      {/* Modal de succès */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
          >
            <span className="text-7xl block mb-4">✅</span>
            <h2 className="text-2xl font-bold mb-3" style={{ color: '#5a4a7c' }}>
              Don enregistré avec succès !
            </h2>
            <p className="text-sm text-gray-700 mb-4">
              Merci infiniment pour votre générosité, <strong>{isAnonymous ? 'cher donateur' : donorName}</strong> !
            </p>
            
            <div 
              className="rounded-xl p-4 mb-4 text-left"
              style={{ backgroundColor: 'white', border: '2px solid #9b7ec9' }}
            >
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Montant :</span>
                <span className="font-bold" style={{ color: '#16a34a' }}>{getDonationAmount().toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Repas offerts :</span>
                <span className="font-bold" style={{ color: '#5a4a7c' }}>{getFeedsCount()} repas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Référence :</span>
                <span className="font-mono text-xs" style={{ color: '#5a4a7c' }}>{donationId.slice(0, 8)}...</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Un reçu sera envoyé à <strong>{donorEmail}</strong>
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="flex-1 py-3 px-4 text-sm font-bold rounded-xl transition"
                style={{ backgroundColor: 'white', color: '#5a4a7c', border: '2px solid #9b7ec9' }}
              >
                Faire un autre don
              </button>
              <Link href="/profil" className="flex-1">
                <button
                  className="w-full py-3 px-4 text-sm font-bold text-white rounded-xl transition"
                  style={{ backgroundColor: '#9b7ec9' }}
                >
                  Voir mes dons
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}