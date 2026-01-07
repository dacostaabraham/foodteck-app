'use client';

// =============================================================================
// AuthContext.tsx - VERSION SUPABASE COMPLÈTE CORRIGÉE
// =============================================================================
// Date : 30 novembre 2025
// Changement : Ajout chargement profil complet depuis public.users
// Correction : user.nom_famille et user.taille_famille maintenant disponibles
// =============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

// =============================================================================
// INTERFACES
// =============================================================================

interface User extends SupabaseUser {
  // ✅ CORRIGÉ : Propriétés adaptées aux colonnes de la BDD
  nom_famille?: string;           // ✅ Ajouté
  taille_famille?: number;        // ✅ Ajouté
  telephone?: string;             // ✅ Renommé (était phone)
  adresse_livraison?: string;     // ✅ Renommé (était address)
  preferences_alimentaires?: string[]; // ✅ Ajouté
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    nom_famille: string,
    telephone: string,
    taille_famille: number
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // INITIALISATION - Vérifier si l'utilisateur est déjà connecté
  // ✅ CORRIGÉ : Charge maintenant le profil complet depuis public.users
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Récupérer la session actuelle
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // ✅ NOUVEAU : Charger le profil complet depuis public.users
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('⚠️ Erreur chargement profil:', profileError);
            // Utiliser quand même l'user de base si erreur
            setUser(session.user as User);
          } else if (profile) {
            // ✅ Fusionner auth user + profil public
            setUser({
              ...session.user,
              nom_famille: profile.nom_famille,
              taille_famille: profile.taille_famille,
              telephone: profile.telephone,
              adresse_livraison: profile.adresse_livraison,
              preferences_alimentaires: profile.preferences_alimentaires,
            } as User);
            console.log('✅ Profil chargé:', profile.nom_famille, `(${profile.taille_famille} pers.)`);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // ✅ CORRIGÉ : Écouter les changements et recharger le profil
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event);
        
        if (session?.user) {
          // ✅ Charger le profil complet
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser({
              ...session.user,
              nom_famille: profile.nom_famille,
              taille_famille: profile.taille_famille,
              telephone: profile.telephone,
              adresse_livraison: profile.adresse_livraison,
              preferences_alimentaires: profile.preferences_alimentaires,
            } as User);
            console.log('✅ Profil rechargé:', profile.nom_famille);
          } else {
            // Fallback si pas de profil trouvé
            setUser(session.user as User);
          }
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // CONNEXION
  // ---------------------------------------------------------------------------
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Erreur de connexion:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Connexion réussie:', data.user?.email);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur lors de la connexion:', error);
      return { success: false, error: error.message };
    }
  };

  // ---------------------------------------------------------------------------
  // INSCRIPTION - VERSION CORRIGÉE AVEC CRÉATION DANS public.users
  // ---------------------------------------------------------------------------
  const signUp = async (
    email: string,
    password: string,
    nom_famille: string,
    telephone: string,
    taille_famille: number
  ) => {
    try {
      console.log('📝 Tentative d\'inscription:', email);

      // -----------------------------------------------------------------------
      // ÉTAPE 1 : Créer l'utilisateur dans auth.users
      // -----------------------------------------------------------------------
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nom_famille,
          },
        },
      });

      if (authError) {
        console.error('❌ Erreur auth.signUp:', authError);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        console.error('❌ Aucun utilisateur créé');
        return { success: false, error: 'Aucun utilisateur créé' };
      }

      console.log('✅ Utilisateur créé dans auth.users:', authData.user.id);

      // -----------------------------------------------------------------------
      // ÉTAPE 2 : Créer l'enregistrement dans public.users
      // ⚠️ C'ÉTAIT LA PARTIE MANQUANTE !
      // -----------------------------------------------------------------------
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,  // Utiliser le même UUID que auth.users
          email: email,
          nom_famille: nom_famille,
          taille_famille: taille_famille,
          telephone: telephone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('❌ Erreur lors de la création du profil dans public.users:', insertError);
        
        return {
          success: false,
          error: `Compte créé mais erreur de profil : ${insertError.message}`,
        };
      }

      console.log('✅ Profil créé dans public.users');

      // -----------------------------------------------------------------------
      // SUCCÈS COMPLET
      // -----------------------------------------------------------------------
      return {
        success: true,
      };

    } catch (error: any) {
      console.error('❌ Erreur lors de l\'inscription:', error);
      return { success: false, error: error.message };
    }
  };

  // ---------------------------------------------------------------------------
  // DÉCONNEXION
  // ---------------------------------------------------------------------------
  const signOut = async () => {
    try {
      console.log('👋 Déconnexion...');
      await supabase.auth.signOut();
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
    }
  };

  // ---------------------------------------------------------------------------
  // CALCUL DE isAuthenticated
  // ---------------------------------------------------------------------------
  const isAuthenticated = !!user;

  // ---------------------------------------------------------------------------
  // PROVIDER
  // ---------------------------------------------------------------------------
  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        isAuthenticated,
        signIn, 
        signUp, 
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// =============================================================================
// HOOK PERSONNALISÉ
// =============================================================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};