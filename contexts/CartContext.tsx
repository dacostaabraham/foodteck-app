'use client';

// =============================================================================
// CartContext.tsx - GESTION COMPLÈTE DU PANIER (CORRIGÉ)
// =============================================================================
// Date : 1er décembre 2025
// Fonctionnalités : 
// - Stockage Supabase (users connectés)
// - Stockage localStorage (invités)
// - CRUD complet (Create, Read, Update, Delete)
// - Calculs automatiques (total items, total prix)
// - Mapping colonnes Supabase ↔ Frontend
// =============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

// ============================================
// TYPES
// ============================================

export interface CartItem {
  id: string;
  product_id?: number;
  product_name: string;
  product_type: 'ingredient' | 'dish' | 'menu';
  quantity: number;
  unit: string;
  quality: 'Standard' | 'Premium' | 'Bio';
  prix_unitaire: number;
  prix_total: number;
  metadata?: {
    emoji?: string;
    category?: string;
    description?: string;
    image?: string;
  };
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, 'id' | 'prix_total'>) => Promise<void>;
  updateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // CHARGER LE PANIER au montage et quand user change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadCart();
  }, [user]);

  async function loadCart() {
    try {
      setLoading(true);

      if (user) {
        // ✅ Utilisateur connecté : charger depuis Supabase
        console.log('🔄 Chargement panier Supabase pour user:', user.id);
        
        const { data, error } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ Erreur chargement panier Supabase:', error);
          setItems([]);
        } else {
          // ✅ MAPPING: Colonnes Supabase → Propriétés Frontend
          const mappedItems: CartItem[] = (data || []).map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name || 'Produit',
            product_type: item.product_type || 'ingredient',
            quantity: Number(item.quantite) || 1,
            unit: item.unite || 'unité',
            quality: item.qualite || 'Standard',
            prix_unitaire: Number(item.prix_unitaire_fcfa) || 0,
            prix_total: Number(item.prix_total) || 0,
            metadata: item.metadata || {},
          }));
          setItems(mappedItems);
          console.log(`✅ Panier Supabase chargé : ${mappedItems.length} articles`);
        }
      } else {
        // ✅ Invité : charger depuis localStorage
        const localCart = localStorage.getItem('guest_cart');
        if (localCart) {
          try {
            const parsedCart = JSON.parse(localCart);
            setItems(parsedCart);
            console.log(`✅ Panier invité chargé : ${parsedCart.length} articles`);
          } catch (error) {
            console.error('❌ Erreur parsing localStorage:', error);
            setItems([]);
          }
        } else {
          setItems([]);
          console.log('ℹ️ Panier invité vide');
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement panier:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // AJOUTER UN ARTICLE
  // ---------------------------------------------------------------------------
  async function addItem(itemData: Omit<CartItem, 'id' | 'prix_total'>) {
    try {
      const prix_total = itemData.prix_unitaire * itemData.quantity;

      if (user) {
        // ✅ Utilisateur connecté : sauvegarder dans Supabase
        console.log('💾 Ajout article Supabase:', itemData.product_name);
        
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: itemData.product_id,
            product_name: itemData.product_name,
            product_type: itemData.product_type,
            quantite: itemData.quantity,
            unite: itemData.unit,
            qualite: itemData.quality,
            prix_unitaire_fcfa: itemData.prix_unitaire,
            prix_total: prix_total,
            metadata: itemData.metadata || null,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Erreur ajout Supabase:', error);
          throw error;
        }

        // ✅ MAPPING: Réponse Supabase → Format Frontend
        const mappedItem: CartItem = {
          id: data.id,
          product_id: data.product_id,
          product_name: data.product_name || 'Produit',
          product_type: data.product_type || 'ingredient',
          quantity: Number(data.quantite) || 1,
          unit: data.unite || 'unité',
          quality: data.qualite || 'Standard',
          prix_unitaire: Number(data.prix_unitaire_fcfa) || 0,
          prix_total: Number(data.prix_total) || 0,
          metadata: data.metadata || {},
        };

        setItems([...items, mappedItem]);
        console.log('✅ Article ajouté (Supabase):', mappedItem.product_name);
      } else {
        // ✅ Invité : sauvegarder dans localStorage
        console.log('💾 Ajout article localStorage:', itemData.product_name);
        
        const newItem: CartItem = {
          id: `local_${Date.now()}_${Math.random()}`,
          ...itemData,
          prix_total,
        };

        const newItems = [...items, newItem];
        setItems(newItems);
        localStorage.setItem('guest_cart', JSON.stringify(newItems));
        console.log('✅ Article ajouté (localStorage):', newItem.product_name);
      }
    } catch (error) {
      console.error('❌ Erreur ajout article:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // METTRE À JOUR LA QUANTITÉ
  // ---------------------------------------------------------------------------
  async function updateQuantity(itemId: string, newQuantity: number) {
    try {
      // Si quantité = 0, supprimer l'article
      if (newQuantity <= 0) {
        await removeItem(itemId);
        return;
      }

      const item = items.find((i) => i.id === itemId);
      if (!item) {
        console.warn('⚠️ Article non trouvé:', itemId);
        return;
      }

      const nouveau_prix_total = item.prix_unitaire * newQuantity;

      if (user) {
        // ✅ Mettre à jour dans Supabase (avec noms colonnes français)
        console.log('🔄 Update quantité Supabase:', item.product_name, '→', newQuantity);
        
        const { error } = await supabase
          .from('cart_items')
          .update({
            quantite: newQuantity,
            prix_total: nouveau_prix_total,
          })
          .eq('id', itemId);

        if (error) {
          console.error('❌ Erreur update Supabase:', error);
          throw error;
        }
      }

      // ✅ Mettre à jour l'état local
      const updatedItems = items.map((i) =>
        i.id === itemId
          ? { ...i, quantity: newQuantity, prix_total: nouveau_prix_total }
          : i
      );

      setItems(updatedItems);

      if (!user) {
        // ✅ Mettre à jour localStorage pour invités
        localStorage.setItem('guest_cart', JSON.stringify(updatedItems));
      }

      console.log('✅ Quantité mise à jour:', item.product_name, '→', newQuantity);
    } catch (error) {
      console.error('❌ Erreur update quantité:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // SUPPRIMER UN ARTICLE
  // ---------------------------------------------------------------------------
  async function removeItem(itemId: string) {
    try {
      const item = items.find((i) => i.id === itemId);

      if (user) {
        // ✅ Supprimer de Supabase
        console.log('🗑️ Suppression article Supabase:', item?.product_name);
        
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId);

        if (error) {
          console.error('❌ Erreur suppression Supabase:', error);
          throw error;
        }
      }

      // ✅ Mettre à jour l'état local
      const updatedItems = items.filter((i) => i.id !== itemId);
      setItems(updatedItems);

      if (!user) {
        // ✅ Mettre à jour localStorage pour invités
        localStorage.setItem('guest_cart', JSON.stringify(updatedItems));
      }

      console.log('✅ Article supprimé:', item?.product_name);
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // VIDER LE PANIER
  // ---------------------------------------------------------------------------
  async function clearCart() {
    try {
      if (user) {
        // ✅ Vider Supabase
        console.log('🧹 Vidage panier Supabase');
        
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ Erreur vidage Supabase:', error);
          throw error;
        }
      }

      // ✅ Vider l'état local
      setItems([]);

      if (!user) {
        // ✅ Vider localStorage pour invités
        localStorage.removeItem('guest_cart');
      }

      console.log('✅ Panier vidé');
    } catch (error) {
      console.error('❌ Erreur vidage panier:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // CALCULS AUTOMATIQUES (avec protection contre NaN)
  // ---------------------------------------------------------------------------
  const totalItems = items.length;
  const totalPrice = items.reduce((sum, item) => sum + (Number(item.prix_total) || 0), 0);

  // ---------------------------------------------------------------------------
  // PROVIDER
  // ---------------------------------------------------------------------------
  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ============================================
// HOOK PERSONNALISÉ
// ============================================

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart doit être utilisé dans un CartProvider');
  }
  return context;
};