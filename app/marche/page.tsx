'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';

interface Produit {
  id: number;
  name: string;
  type: string;
  price: number;
  unit: string;
  emoji: string;
  origin: string;
  quality: string;
  qualities: string[]; // Toutes les qualités disponibles
  season: 'saison' | 'hors-saison';
  description?: string;
}

export default function MarchePage() {
  // États
  const { addItem } = useCart();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: 'tous',
    origin: 'tous',
    quality: 'tous',
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
        .eq('disponible_marche_normal', true)
        .order('categorie', { ascending: true });

      if (supabaseError) {
        throw supabaseError;
      }

      // Mapper les données de Supabase vers le format attendu par le frontend
      const produitsFormatted: Produit[] = (data || []).map((product: any) => ({
        id: product.id,
        name: product.nom,
        type: product.categorie,
        price: product.prix_base_fcfa,
        unit: product.unite,
        emoji: getEmojiForProduct(product.nom, product.categorie),
        origin: product.origin || 'local',
        quality: getQualityFromArray(product.qualites_disponibles), // Pour l'affichage du badge
        qualities: product.qualites_disponibles || ['Standard'], // Toutes les qualités pour le filtrage
        season: product.season || 'saison',
        description: product.description || `${product.nom} frais et de qualité`,
      }));

      setProduits(produitsFormatted);
    } catch (err: any) {
      console.error('Erreur lors du chargement des produits:', err);
      setError(err.message || 'Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  }

  // Fonction pour obtenir l'emoji approprié
  function getEmojiForProduct(nom: string, categorie: string): string {
    const nomLower = nom.toLowerCase();
    
    // Emojis spécifiques par nom
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
    };

    // Chercher un emoji spécifique
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (nomLower.includes(key)) {
        return emoji;
      }
    }

    // Emojis par catégorie
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

  // Fonction pour extraire la qualité principale depuis le tableau
  function getQualityFromArray(qualites: string[] | null | undefined): string {
    if (!qualites || qualites.length === 0) {
      return 'standard';
    }
    
    // Priorité: Bio > Premium > Standard
    if (qualites.includes('Bio')) return 'bio';
    if (qualites.includes('Premium')) return 'premium';
    return 'standard';
  }

  // Fonction pour normaliser les chaînes (enlever accents et mettre en minuscule)
  const normalizeString = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Filtrer les produits (insensible à la casse et aux accents)
  const filteredProduits = produits.filter(produit => {
    // Filtre par type
    if (filters.type !== 'tous' && normalizeString(produit.type) !== normalizeString(filters.type)) return false;
    
    // Filtre par origine
    if (filters.origin !== 'tous' && normalizeString(produit.origin) !== normalizeString(filters.origin)) return false;
    
    // Filtre par qualité - VÉRIFIER DANS LE TABLEAU
    if (filters.quality !== 'tous') {
      const hasQuality = produit.qualities.some(q => 
        normalizeString(q) === normalizeString(filters.quality)
      );
      if (!hasQuality) return false;
    }
    
    // Filtre par saison
    if (filters.season !== 'tous' && normalizeString(produit.season) !== normalizeString(filters.season)) return false;
    
    return true;
  });

  const handleAddToCart = async (produit: Produit) => {
  try {
    await addItem({
      product_id: produit.id,
      product_name: produit.name,
      product_type: 'ingredient',
      quantity: 1,
      unit: produit.unit,
      quality: produit.quality === 'bio' ? 'Bio' : produit.quality === 'premium' ? 'Premium' : 'Standard',
      prix_unitaire: produit.price,
      metadata: {
        emoji: produit.emoji,
        category: produit.type,
        origin: produit.origin,
      },
    });
    alert(`✅ ${produit.name} ajouté au panier !`);
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
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
            <p className="text-xl font-semibold text-purple-600">
              Chargement des produits frais...
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
            <p className="text-sm text-gray-600 mb-6">
              {error}
            </p>
            <button
              onClick={loadProducts}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
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
            🛒 Marché - Ingrédients Frais
          </h1>
          <p className="text-sm text-white/90 mb-4">
            Commandez vos ingrédients frais directement auprès de nos producteurs locaux
          </p>
          
          {/* Badge nombre de produits */}
          <div className="inline-block px-4 py-2 bg-white/20 rounded-lg text-white font-semibold mb-4">
            ✅ {produits.length} produits disponibles
          </div>

          {/* Boutons de navigation */}
          <div className="flex items-center justify-center gap-3">
            <button
              className="px-4 py-2 text-sm font-medium rounded-lg shadow-md transition"
              style={{ backgroundColor: '#5a4a7c', color: 'white' }}
            >
              🛒 Marché de détail
            </button>
            <Link href="/marche-gros">
              <button
                className="px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gray-100 transition"
                style={{ color: '#5a4a7c' }}
              >
                🏭 Marché de Gros
              </button>
            </Link>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#5a4a7c' }}>
            🔍 Filtrer les produits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
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
                <option value="pret a l'emploi">🍱 Prêt à l'emploi</option>
                <option value="autres">📦 Autres</option>
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
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
              >
                <option value="tous">Toutes origines</option>
                <option value="local">📍 Local (Abidjan)</option>
                <option value="national">🇨🇮 National (Côte d'Ivoire)</option>
                <option value="regional">🌍 Régional (Afrique de l'Ouest)</option>
                <option value="imported">✈️ Importé</option>
              </select>
            </div>

            {/* Qualité */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Qualité
              </label>
              <select
                value={filters.quality}
                onChange={(e) => setFilters({ ...filters, quality: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
              >
                <option value="tous">Toutes qualités</option>
                <option value="standard">⭐ Standard</option>
                <option value="premium">⭐⭐ Premium</option>
                <option value="bio">🌿 Bio</option>
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
                onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
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
            return (
              <div 
                key={produit.id} 
                className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 relative"
              >
                {/* Badge qualité */}
                {produit.quality === 'bio' && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-md" style={{ backgroundColor: '#22c55e', color: 'white' }}>
                    🌿 BIO
                  </div>
                )}
                {produit.quality === 'premium' && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-md" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                    ⭐ PREMIUM
                  </div>
                )}

                {/* Image du produit */}
                <div 
                  className="flex items-center justify-center p-8"
                  style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce6f0 100%)' }}
                >
                  <span className="text-7xl">{produit.emoji}</span>
                </div>

                {/* Informations du produit */}
                <div className="p-4">
                  <h3 className="text-base font-bold mb-1" style={{ color: '#5a4a7c' }}>
                    {produit.name}
                  </h3>
                  {produit.description && (
                    <p className="text-xs text-gray-600 mb-3">
                      {produit.description}
                    </p>
                  )}
                  <p className="text-xs mb-3" style={{ color: '#666' }}>
                    Prix au {produit.unit}
                  </p>
                  <div className="text-2xl font-bold mb-4" style={{ color: '#16a34a' }}>
                    {produit.price.toLocaleString()} FCFA
                  </div>

                  {/* Bouton Ajouter au panier */}
                  <button
                    onClick={() => handleAddToCart(produit)}
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg shadow-md transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
                  >
                    🛒 Ajouter au panier
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message si aucun produit */}
        {filteredProduits.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#5a4a7c' }}>
              Aucun produit trouvé
            </h3>
            <p className="text-gray-600">
              Essayez de modifier vos filtres pour voir plus de produits.
            </p>
          </div>
        )}

        {/* Bouton retour en haut */}
        {filteredProduits.length > 12 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transition"
            >
              ⬆️ Retour en haut
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}