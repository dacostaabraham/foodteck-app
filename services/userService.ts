// =============================================================================
// userService.ts - SERVICE DE GESTION DES UTILISATEURS (VERSION 2)
// =============================================================================
// Compatible avec planningService.ts existant
// updateFamilySize supprimé (déjà dans planningService)
// =============================================================================

import { supabase } from '@/lib/supabase';

// =============================================================================
// INTERFACES
// =============================================================================

export interface UserProfile {
  id: string;
  email: string;
  nom_famille: string;
  taille_famille: number;
  telephone: string;
  adresse_livraison?: string;
  preferences_alimentaires?: string[];
  created_at: string;
  updated_at: string;
}

export interface UpdateUserProfileData {
  nom_famille?: string;
  telephone?: string;
  adresse_livraison?: string;
  preferences_alimentaires?: string[];
  // taille_famille est géré par planningService.updateFamilySize()
}

// =============================================================================
// FONCTIONS DU SERVICE
// =============================================================================

/**
 * Récupérer le profil complet d'un utilisateur
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Erreur chargement profil:', error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('❌ Exception chargement profil:', error);
    return null;
  }
}

/**
 * Mettre à jour le profil utilisateur
 */
export async function updateUserProfile(
  userId: string,
  updates: UpdateUserProfileData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Erreur mise à jour:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Profil mis à jour');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Exception mise à jour:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ajouter une préférence alimentaire
 */
export async function addDietaryPreference(
  userId: string,
  preference: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      return { success: false, error: 'Profil non trouvé' };
    }

    const currentPreferences = profile.preferences_alimentaires || [];
    
    if (currentPreferences.includes(preference)) {
      return { success: true };
    }

    const newPreferences = [...currentPreferences, preference];

    return await updateUserProfile(userId, {
      preferences_alimentaires: newPreferences,
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Retirer une préférence alimentaire
 */
export async function removeDietaryPreference(
  userId: string,
  preference: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      return { success: false, error: 'Profil non trouvé' };
    }

    const currentPreferences = profile.preferences_alimentaires || [];
    const newPreferences = currentPreferences.filter((p) => p !== preference);

    return await updateUserProfile(userId, {
      preferences_alimentaires: newPreferences,
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Vérifier si utilisateur existe dans public.users
 */
export async function userExistsInPublicTable(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Créer un enregistrement utilisateur si manquant
 */
export async function createUserProfileIfMissing(
  userId: string,
  email: string,
  nom_famille?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const exists = await userExistsInPublicTable(userId);
    if (exists) {
      return { success: true };
    }

    const { error } = await supabase.from('users').insert({
      id: userId,
      email: email,
      nom_famille: nom_famille || email.split('@')[0],
      taille_famille: 1,
      telephone: '',
      preferences_alimentaires: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('❌ Erreur création profil:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Profil créé dans public.users');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =============================================================================
// NOTE IMPORTANTE
// =============================================================================
// Pour gérer la taille de famille, utilisez les fonctions suivantes
// de planningService.ts :
// - updateFamilySize(userId, familySize)
// - loadFamilySize(userId)
// =============================================================================
