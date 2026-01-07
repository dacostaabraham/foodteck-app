'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';

interface Produit {
  id: string; // UUID de Supabase
  name: string;
  type: string;
  price: number;
  unit: string;
  emoji: string;
  origin: string;
  quality: string;
  qualities: string[];
  season: 'saison' | 'hors-saison';
  description?: string;
  minQuantity: number;
}

export default function MarcheGrosPage() {
  const { addItem } = useCart();
  
  // États
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: 'tous',
    origin: 'tous',
    season: 'tous'
  });

  // Charger les produits depuis Supabase
  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('products')
        .select('*')
        .order('categorie', { ascending: true });

      if (supabaseError) {
        throw supabaseError;
      }

      // Mapper les données de Supabase vers le format attendu
      const produitsFormatted: Produit[] = (data || []).map((product: any) => ({
        id: product.id, // UUID de Supabase
        name: product.nom,
        type: product.categorie,
        price: product.prix_base_fcfa,
        unit: product.unite,
        emoji: getEmojiForProduct(product.nom, product.categorie),
        origin: product.origin || 'local',
        quality: getQualityFromArray(product.qualites_disponibles),
        qualities: product.qualites_disponibles || ['Standard'],
        season: product.season || 'saison',
        description: product.description || `${product.nom} frais et de qualité`,
        minQuantity: getMinQuantity(product.prix_base_fcfa, product.categorie),
      }));

      setProduits(produitsFormatted);
    } catch (err: any) {
      console.error('Erreur lors du chargement des produits:', err);
      setError(err.message || 'Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  }

  // Fonction pour calculer la quantité minimale
  function getMinQuantity(prix: number, categorie: string): number {
    // Plus le prix est bas, plus la quantité min est élevée
    if (prix < 500) return 25;
    if (prix < 1000) return 15;
    if (prix < 2000) return 10;
    return 5;
  }

  // Fonction pour obtenir l'emoji approprié
  function getEmojiForProduct(nom: string, categorie: string): string {
    const nomLower = nom.toLowerCase();
    
    const emojiMap: { [key: string]: string } = {
      'tomate': '🍅',
      'banane': '🍌',
      'plantain': '🍌',
      'poulet': '🐔',
      'poisson': '🐟',
      'aubergine': '🍆',
      'mangue': '🥭',
      'boeuf': '🥩',
      'crevette': '🦐',
      'oignon': '🧅',
      'ananas': '🍍',
      'agneau': '🐑',
      'carotte': '🥕',
      'gombo': '🌿',
      'piment': '🌶️',
      'ail': '🧄',
      'gingembre': '🫚',
      'chou': '🥬',
      'laitue': '🥬',
      'concombre': '🥒',
      'poivron': '🫑',
      'orange': '🍊',
      'citron': '🍋',
      'papaye': '🫐',
      'avocat': '🥑',
      'maïs': '🌽',
      'igname': '🍠',
      'manioc': '🥔',
      'riz': '🍚',
      'huile': '🫙',
      'lait': '🥛',
      'fromage': '🧀',
      'œuf': '🥚',
      'sucre': '🧂',
      'sel': '🧂',
      'farine': '🌾',
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (nomLower.includes(key)) {
        return emoji;
      }
    }

    const categorieMap: { [key: string]: string } = {
      'legumes': '🥬',
      'fruits': '🍎',
      'viandes': '🥩',
      'poissons': '🐟',
      'fruits de mer': '🦐',
      'feculents et cereales': '🌾',
      'epices': '🌶️',
      'produits laitiers': '🥛',
      'condiments': '🧂',
      'produits transformes': '🥫',
      "pret a l'emploi": '🍱',
      'autres': '📦',
    };

    return categorieMap[categorie] || '🛒';
  }

  // Fonction pour extraire la qualité principale
  function getQualityFromArray(qualites: string[] | null | undefined): string {
    if (!qualites || qualites.length === 0) return 'standard';
    if (qualites.includes('Bio')) return 'bio';
    if (qualites.includes('Premium')) return 'premium';
    return 'standard';
  }

  // Normaliser les chaînes pour le filtrage
  const normalizeString = (str: string | null | undefined): string => {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Filtrer les produits
  const filteredProduits = produits.filter(produit => {
    if (filters.type !== 'tous' && normalizeString(produit.type) !== normalizeString(filters.type)) return false;
    if (filters.origin !== 'tous' && normalizeString(produit.origin) !== normalizeString(filters.origin)) return false;
    if (filters.season !== 'tous' && normalizeString(produit.season) !== normalizeString(filters.season)) return false;
    return true;
  });

  // ✅ FONCTION CORRIGÉE - Utilise le vrai UUID de Supabase
  const handleAddToCart = async (produit: Produit) => {
    const prixGros = Math.round(produit.price * 0.85); // -15%
    
    try {
      await addItem({
        product_id: produit.id, // ✅ C'est maintenant un UUID valide
        product_name: produit.name,
        product_type: 'ingredient',
        quantity: produit.minQuantity,
        unit: produit.unit,
        quality: produit.quality === 'bio' ? 'Bio' : produit.quality === 'premium' ? 'Premium' : 'Standard',
        prix_unitaire: prixGros,
        metadata: {
          emoji: produit.emoji,
          category: produit.type,
          origin: produit.origin,
          type_marche: 'gros',
          remise: '15%',
        },
      });
      alert(`✅ ${produit.name} ajouté au panier (${produit.minQuantity} ${produit.unit}) !`);
    } catch (error) {
      console.error('Erreur ajout panier:', error);
      alert('❌ Erreur lors de l\'ajout au panier');
    }
  };

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mb-4"></div>
            <p className="text-xl font-semibold text-orange-600">
              Chargement des produits en gros...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Connexion à la base de données...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-xl font-semibold text-red-600 mb-2">
              Erreur de chargement
            </p>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadProducts}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              🔄 Réessayer
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
            🏭 Marché de Gros - Prix Professionnels
          </h1>
          <p className="text-sm text-white/90 mb-4">
            Achetez en gros directement auprès des producteurs et profitez de -15% sur tous les produits
          </p>
          
          {/* Badge nombre de produits */}
          <div className="inline-block px-4 py-2 bg-white/20 rounded-lg text-white font-semibold mb-4">
            ✅ {produits.length} produits disponibles en gros
          </div>

          {/* Boutons de navigation */}
          <div className="flex items-center justify-center gap-3">
            <Link href="/marche">
              <button
                className="px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gray-100 transition"
                style={{ color: '#5a4a7c' }}
              >
                🛒 Marché de détail
              </button>
            </Link>
            <button
              className="px-4 py-2 text-sm font-medium rounded-lg shadow-md transition"
              style={{ backgroundColor: '#5a4a7c', color: 'white' }}
            >
              🏭 Marché de Gros
            </button>
          </div>
        </div>

        {/* Message d'information pour les professionnels */}
        <div 
          className="rounded-2xl p-5 mb-6 shadow-lg"
          style={{ backgroundColor: '#fff4e6', border: '2px solid #ffa726' }}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">🏭</div>
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-2" style={{ color: '#e65100' }}>
                Bienvenue dans le marché de gros
              </h2>
              <p className="text-sm mb-2" style={{ color: '#92400e' }}>
                Si vous êtes un consommateur de gros, un commerçant détaillant ou un transformateur, 
                achetez directement vos produits aux producteurs à des prix préférentiels.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#e65100' }}>Réduction automatique</p>
                    <p className="text-xs" style={{ color: '#92400e' }}>-15% sur tous les produits</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📦</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#e65100' }}>Quantités minimales</p>
                    <p className="text-xs" style={{ color: '#92400e' }}>Commandes en gros volumes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#5a4a7c' }}>
            🔍 Filtrer les produits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type de produit */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Type de produit
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
              >
                <option value="tous">Tous les produits</option>
                <option value="legumes">🥬 Légumes</option>
                <option value="fruits">🍎 Fruits</option>
                <option value="viandes">🥩 Viandes</option>
                <option value="poissons">🐟 Poissons</option>
                <option value="fruits de mer">🦐 Fruits de mer</option>
                <option value="feculents et cereales">🌾 Féculents et céréales</option>
                <option value="epices">🌶️ Épices</option>
                <option value="produits laitiers">🥛 Produits laitiers</option>
                <option value="condiments">🧂 Condiments</option>
                <option value="produits transformes">🥫 Produits transformés</option>
              </select>
            </div>

            {/* Origine */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Origine
              </label>
              <select
                value={filters.origin}
                onChange={(e) => setFilters({ ...filters, origin: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
              >
                <option value="tous">Toutes origines</option>
                <option value="local">📍 Local (Abidjan)</option>
                <option value="national">🇨🇮 National (Côte d'Ivoire)</option>
                <option value="regional">🌍 Régional (Afrique de l'Ouest)</option>
                <option value="imported">✈️ Importé</option>
              </select>
            </div>

            {/* Saison */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Saison
              </label>
              <select
                value={filters.season}
                onChange={(e) => setFilters({ ...filters, season: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
              >
                <option value="tous">Toutes saisons</option>
                <option value="saison">🌞 De saison</option>
                <option value="hors-saison">❄️ Hors saison</option>
              </select>
            </div>
          </div>

          {/* Compteur de résultats */}
          <div className="mt-4 text-sm" style={{ color: '#5a4a7c' }}>
            <span className="font-semibold">{filteredProduits.length}</span> produit{filteredProduits.length > 1 ? 's' : ''} trouvé{filteredProduits.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Grille des produits */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProduits.map((produit) => {
            const prixOriginal = produit.price;
            const prixGros = Math.round(prixOriginal * 0.85);
            const economie = prixOriginal - prixGros;

            return (
              <div 
                key={produit.id} 
                className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 relative"
              >
                {/* Badge de réduction */}
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-md z-10" style={{ backgroundColor: '#ffa726', color: 'white' }}>
                  -15%
                </div>

                {/* Badge qualité */}
                {produit.quality === 'bio' && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold shadow-md" style={{ backgroundColor: '#22c55e', color: 'white' }}>
                    🌿 BIO
                  </div>
                )}
                {produit.quality === 'premium' && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold shadow-md" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>
                    ⭐ PREMIUM
                  </div>
                )}

                {/* Image du produit */}
                <div 
                  className="flex items-center justify-center p-8"
                  style={{ background: 'linear-gradient(135deg, #fff4e6 0%, #ffe8cc 100%)' }}
                >
                  <span className="text-7xl">{produit.emoji}</span>
                </div>

                {/* Informations du produit */}
                <div className="p-4">
                  <h3 className="text-base font-bold mb-1" style={{ color: '#5a4a7c' }}>
                    {produit.name}
                  </h3>
                  {produit.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {produit.description}
                    </p>
                  )}

                  {/* Quantité minimale */}
                  <div className="mb-2">
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}>
                      Min: {produit.minQuantity} {produit.unit}
                    </span>
                  </div>

                  <p className="text-xs mb-2" style={{ color: '#666' }}>
                    Prix au {produit.unit}
                  </p>

                  {/* Prix avec comparaison */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 line-through">
                        {prixOriginal.toLocaleString()} FCFA
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                        -{economie.toLocaleString()} F
                      </span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: '#16a34a' }}>
                      {prixGros.toLocaleString()} FCFA
                    </div>
                  </div>

                  {/* Bouton Commander */}
                  <button
                    onClick={() => handleAddToCart(produit)}
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg shadow-md transition hover:opacity-90"
                    style={{ backgroundColor: '#ffa726' }}
                  >
                    🏭 Commander en gros
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message si aucun produit */}
        {filteredProduits.length === 0 && (
          <div 
            className="text-center py-12 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #fff4e6 0%, #ffe8cc 100%)' }}
          >
            <span className="text-6xl mb-4 block">🔍</span>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#e65100' }}>
              Aucun produit trouvé
            </h3>
            <p className="text-sm text-gray-600">
              Essayez de modifier vos filtres pour voir plus de produits
            </p>
          </div>
        )}

        {/* Bouton retour en haut */}
        {filteredProduits.length > 12 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-6 py-3 bg-white text-orange-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transition"
            >
              ⬆️ Retour en haut
            </button>
          </div>
        )}

        {/* Avantages du marché de gros */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div 
            className="bg-white rounded-2xl p-5 shadow-lg text-center"
            style={{ border: '2px solid #ffa726' }}
          >
            <div className="text-3xl mb-2">💰</div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#e65100' }}>
              -15% Automatique
            </h3>
            <p className="text-xs text-gray-600">
              Réduction sur tous les produits
            </p>
          </div>

          <div 
            className="bg-white rounded-2xl p-5 shadow-lg text-center"
            style={{ border: '2px solid #ffa726' }}
          >
            <div className="text-3xl mb-2">📦</div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#e65100' }}>
              Volumes importants
            </h3>
            <p className="text-xs text-gray-600">
              Commandes en grandes quantités
            </p>
          </div>

          <div 
            className="bg-white rounded-2xl p-5 shadow-lg text-center"
            style={{ border: '2px solid #ffa726' }}
          >
            <div className="text-3xl mb-2">🚛</div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#e65100' }}>
              Livraison rapide
            </h3>
            <p className="text-xs text-gray-600">
              Direct des producteurs
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}