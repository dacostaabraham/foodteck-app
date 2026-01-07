'use client';

// =============================================================================
// Liste Menus Page - CONNECTÉE AU CARTCONTEXT
// =============================================================================
// Date : 2 décembre 2025
// Modifications :
// - Import useCart depuis CartContext
// - handleAddToCart utilise addItem() au lieu de alert()
// - Ajout état loading sur les boutons
// - product_type: 'menu' pour identifier les menus dans le panier
// =============================================================================

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { useCart } from '@/contexts/CartContext'; // ✅ AJOUTÉ

// Types
type QualityType = 'Standard' | 'Premium' | 'Bio';

interface Menu {
  id: string;
  name: string;
  emoji: string;
  country: string;
  flag: string;
  description: string;
  basePrice: number;
  category: string;
}

interface MenuCardProps {
  menu: Menu;
  onAddToCart: (menu: Menu, quantity: number, quality: QualityType, totalPrice: number) => Promise<void>;
  isAdding: boolean; // ✅ AJOUTÉ pour état loading
}

// Composant Card de Menu
function MenuCard({ menu, onAddToCart, isAdding }: MenuCardProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [quality, setQuality] = useState<QualityType>('Standard');

  // Multiplicateurs de prix selon la qualité
  const qualityMultipliers: Record<QualityType, number> = {
    Standard: 1,
    Premium: 1.5,
    Bio: 2
  };

  const totalPrice = menu.basePrice * quantity * qualityMultipliers[quality];

  const handleAddToCart = async () => {
    await onAddToCart(menu, quantity, quality, totalPrice);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 hover:shadow-2xl transition-all duration-300" style={{ border: '2px solid #e0d4f7' }}>
      {/* Emoji et titre */}
      <div className="text-center mb-4">
        <div className="text-4xl mb-2">{menu.emoji}</div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">{menu.name}</h3>
        <p className="text-xs font-semibold mb-1" style={{ color: '#9b7ec9' }}>
          {menu.flag} {menu.country}
        </p>
        <p className="text-gray-600 text-xs mb-3">{menu.description}</p>
      </div>

      {/* Sélecteur de qualité */}
      <div className="mb-3 flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">
          ✨ Qualité :
        </label>
        <div className="flex gap-2 flex-1">
          {(['Standard', 'Premium', 'Bio'] as QualityType[]).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all ${
                quality === q
                  ? 'text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              style={
                quality === q
                  ? { backgroundColor: '#5a4a7c' }
                  : {}
              }
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Sélecteur de nombre de personnes */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">
          👥 Nombre de personnes :
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 rounded-lg font-bold text-sm hover:opacity-80 transition-all text-white"
            style={{ backgroundColor: '#5a4a7c' }}
          >
            -
          </button>
          <input
            type="number"
            min="1"
            max="20"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 text-center py-1.5 px-2 rounded-lg font-semibold text-sm text-gray-800 focus:outline-none"
            style={{ border: '2px solid #e0d4f7' }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
          />
          <button
            onClick={() => setQuantity(Math.min(20, quantity + 1))}
            className="w-8 h-8 rounded-lg font-bold text-sm hover:opacity-80 transition-all text-white"
            style={{ backgroundColor: '#5a4a7c' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Prix et bouton */}
      <div className="border-t border-gray-100 pt-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">Prix total :</span>
          <span className="text-xl font-bold" style={{ color: '#5a4a7c' }}>
            {totalPrice.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
        <Button
          variant="success"
          onClick={handleAddToCart}
          className="w-full text-sm py-2"
          disabled={isAdding} // ✅ Désactiver pendant l'ajout
        >
          {isAdding ? '⏳ Ajout en cours...' : '🛒 Ajouter au panier'}
        </Button>
      </div>
    </div>
  );
}

// Composant principal
export default function ListeMenusPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Menus Africains'])
  );
  const [addingMenuId, setAddingMenuId] = useState<string | null>(null); // ✅ AJOUTÉ

  // ✅ AJOUTÉ : Hook du panier
  const { addItem } = useCart();

  // Données des menus
  const menus: Menu[] = [
    // Menus Africains
    {
      id: 'menu-afr-1',
      name: 'Menu Attiéké Complet',
      emoji: '🐟',
      country: 'Côte d\'Ivoire',
      flag: '🇨🇮',
      description: 'Attiéké, poisson braisé, alloco, salade',
      basePrice: 12000,
      category: 'Menus Africains'
    },
    {
      id: 'menu-afr-2',
      name: 'Menu Foutou Traditionnel',
      emoji: '🍲',
      country: 'Côte d\'Ivoire',
      flag: '🇨🇮',
      description: 'Foutou banane, sauce graine, viande de bœuf',
      basePrice: 13000,
      category: 'Menus Africains'
    },
    {
      id: 'menu-afr-3',
      name: 'Menu Kedjenou Royal',
      emoji: '🍗',
      country: 'Côte d\'Ivoire',
      flag: '🇨🇮',
      description: 'Kedjenou de poulet, riz blanc, plantain frit',
      basePrice: 12500,
      category: 'Menus Africains'
    },
    {
      id: 'menu-afr-4',
      name: 'Menu Placali Complet',
      emoji: '🥘',
      country: 'Côte d\'Ivoire',
      flag: '🇨🇮',
      description: 'Placali, sauce agouti, poisson fumé, légumes',
      basePrice: 14000,
      category: 'Menus Africains'
    },
    {
      id: 'menu-afr-5',
      name: 'Menu Riz Gombo',
      emoji: '🍚',
      country: 'Côte d\'Ivoire',
      flag: '🇨🇮',
      description: 'Riz sauce gombo, poisson fumé, alloco',
      basePrice: 11000,
      category: 'Menus Africains'
    },

    // Menus Européens
    {
      id: 'menu-eur-1',
      name: 'Menu Brasserie Française',
      emoji: '🥩',
      country: 'France',
      flag: '🇫🇷',
      description: 'Steak-frites, salade verte, dessert du jour',
      basePrice: 16000,
      category: 'Menus Européens'
    },
    {
      id: 'menu-eur-2',
      name: 'Menu Italien Complet',
      emoji: '🍝',
      country: 'Italie',
      flag: '🇮🇹',
      description: 'Pâtes carbonara, salade, tiramisu',
      basePrice: 14500,
      category: 'Menus Européens'
    },
    {
      id: 'menu-eur-3',
      name: 'Menu Pizza Classique',
      emoji: '🍕',
      country: 'Italie',
      flag: '🇮🇹',
      description: 'Pizza margherita, salade, dessert',
      basePrice: 12000,
      category: 'Menus Européens'
    },
    {
      id: 'menu-eur-4',
      name: 'Menu Paella Royale',
      emoji: '🥘',
      country: 'Espagne',
      flag: '🇪🇸',
      description: 'Paella fruits de mer, sangria, flan',
      basePrice: 18000,
      category: 'Menus Européens'
    },

    // Menus Asiatiques
    {
      id: 'menu-asi-1',
      name: 'Menu Thaï Complet',
      emoji: '🍜',
      country: 'Thaïlande',
      flag: '🇹🇭',
      description: 'Pad Thai, rouleaux de printemps, dessert coco',
      basePrice: 15500,
      category: 'Menus Asiatiques'
    },
    {
      id: 'menu-asi-2',
      name: 'Menu Sushi Premium',
      emoji: '🍱',
      country: 'Japon',
      flag: '🇯🇵',
      description: 'Assortiment sushis 18 pièces, soupe miso, salade',
      basePrice: 21000,
      category: 'Menus Asiatiques'
    },
    {
      id: 'menu-asi-3',
      name: 'Menu Chinois Tradition',
      emoji: '🥟',
      country: 'Chine',
      flag: '🇨🇳',
      description: 'Raviolis vapeur, riz cantonais, beignets',
      basePrice: 13000,
      category: 'Menus Asiatiques'
    },
    {
      id: 'menu-asi-4',
      name: 'Menu Curry Thaï',
      emoji: '🍛',
      country: 'Thaïlande',
      flag: '🇹🇭',
      description: 'Curry vert, riz jasmin, nems, dessert',
      basePrice: 15000,
      category: 'Menus Asiatiques'
    },

    // Menus FastFood
    {
      id: 'menu-fast-1',
      name: 'Menu Burger XXL',
      emoji: '🍔',
      country: 'USA',
      flag: '🇺🇸',
      description: 'Double burger, frites XXL, boisson, dessert',
      basePrice: 10000,
      category: 'Menus FastFood'
    },
    {
      id: 'menu-fast-2',
      name: 'Menu Tacos Complet',
      emoji: '🌮',
      country: 'Mexique',
      flag: '🇲🇽',
      description: 'Tacos 3 viandes, frites, boisson, churros',
      basePrice: 10500,
      category: 'Menus FastFood'
    },
    {
      id: 'menu-fast-3',
      name: 'Menu Chicken Party',
      emoji: '🍗',
      country: 'USA',
      flag: '🇺🇸',
      description: 'Wings 8 pièces, frites, coleslaw, boisson',
      basePrice: 9000,
      category: 'Menus FastFood'
    },
    {
      id: 'menu-fast-4',
      name: 'Menu Pizza Pepperoni',
      emoji: '🍕',
      country: 'USA',
      flag: '🇺🇸',
      description: 'Pizza pepperoni moyenne, frites, boisson',
      basePrice: 11000,
      category: 'Menus FastFood'
    },
    {
      id: 'menu-fast-5',
      name: 'Menu Famille',
      emoji: '🍟',
      country: 'USA',
      flag: '🇺🇸',
      description: '4 burgers, 4 frites, 4 boissons, 4 desserts',
      basePrice: 30000,
      category: 'Menus FastFood'
    }
  ];

  // Filtrer les menus selon la recherche
  const filteredMenus = menus.filter(menu =>
    menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    menu.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    menu.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Grouper par catégorie
  const menusByCategory = filteredMenus.reduce((acc, menu) => {
    if (!acc[menu.category]) {
      acc[menu.category] = [];
    }
    acc[menu.category].push(menu);
    return acc;
  }, {} as Record<string, Menu[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // ✅ MODIFIÉ : Utilise addItem du CartContext
  const handleAddToCart = async (
    menu: Menu, 
    quantity: number, 
    quality: QualityType, 
    totalPrice: number
  ) => {
    try {
      setAddingMenuId(menu.id); // Afficher loading sur ce menu

      // Calculer le prix unitaire avec le multiplicateur de qualité
      const qualityMultipliers: Record<QualityType, number> = {
        Standard: 1,
        Premium: 1.5,
        Bio: 2
      };
      const prixUnitaireEffectif = menu.basePrice * qualityMultipliers[quality];

      // ✅ Appeler addItem du CartContext
      await addItem({
        product_name: `${menu.name} (${quality})`,
        product_type: 'menu', // ✅ Type menu
        quantity: quantity,
        unit: 'pers.', // Par personne
        quality: quality,
        prix_unitaire: prixUnitaireEffectif,
        metadata: {
          emoji: menu.emoji,
          category: menu.category,
          description: `${menu.flag} ${menu.country} - ${menu.description}`,
        }
      });

      // ✅ Feedback utilisateur
      alert(`✅ "${menu.name}" ajouté au panier !\n\n👥 ${quantity} personne(s)\n✨ Qualité: ${quality}\n💰 Total: ${totalPrice.toLocaleString('fr-FR')} FCFA`);
      
    } catch (error) {
      console.error('❌ Erreur ajout au panier:', error);
      alert('❌ Erreur lors de l\'ajout au panier. Veuillez réessayer.');
    } finally {
      setAddingMenuId(null); // Retirer loading
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #d4c5f0 0%, #c9b5e8 100%)' }}>
      <Header />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* En-tête de page */}
        <div className="rounded-3xl shadow-2xl p-8 mb-8 text-white" style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📋</span>
              <h1 className="text-3xl font-bold">Liste de Menus</h1>
            </div>
            <p className="text-lg opacity-95 text-center max-w-3xl">
              Découvrez nos menus complets pour tous les goûts
            </p>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl p-6 mb-8">
          <input
            type="text"
            placeholder="🔍 Rechercher un menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 py-4 rounded-xl text-lg focus:outline-none"
            style={{ border: '2px solid #e0d4f7' }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#9b7ec9'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e0d4f7'}
          />
        </div>

        {/* Menus par catégorie */}
        {Object.entries(menusByCategory).map(([category, categoryMenus]) => (
          <div key={category} className="mb-8">
            {/* En-tête de catégorie */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full text-left px-6 py-4 rounded-2xl mb-6 font-bold text-xl text-white shadow-xl hover:opacity-90 transition-all flex items-center justify-between"
              style={{
                background: category === 'Menus FastFood'
                  ? 'linear-gradient(45deg, #ff6b6b, #ff8787)'
                  : 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)'
              }}
            >
              <span>
                {category === 'Menus Africains' && '🌍'}
                {category === 'Menus Européens' && '🇪🇺'}
                {category === 'Menus Asiatiques' && '🍜'}
                {category === 'Menus FastFood' && '🍔'}
                {' '}{category}
              </span>
              <span className="text-2xl">
                {expandedCategories.has(category) ? '▼' : '▶'}
              </span>
            </button>

            {/* Grille de menus */}
            {expandedCategories.has(category) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryMenus.map(menu => (
                  <MenuCard
                    key={menu.id}
                    menu={menu}
                    onAddToCart={handleAddToCart}
                    isAdding={addingMenuId === menu.id} // ✅ Passer l'état loading
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {Object.keys(menusByCategory).length === 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl p-12 text-center">
            <p className="text-gray-500 text-xl">
              😕 Aucun menu trouvé pour "{searchQuery}"
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}