'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';

export default function InscriptionPage() {
  const router = useRouter();
  const { signUp } = useAuth(); // ✅ CHANGÉ : register → signUp
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    familySize: 4,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    // ✅ CHANGÉ : Utiliser signUp avec gestion du résultat
    const result = await signUp(
      formData.email,       // email
      formData.password,    // password
      formData.name,        // nom_famille
      formData.phone,       // telephone
      formData.familySize   // taille_famille
    );

    if (result.success) {
      // ✅ Inscription réussie
      console.log('✅ Inscription réussie !');
      // Rediriger vers la page de connexion
      router.push('/connexion');
    } else {
      // ❌ Erreur lors de l'inscription
      setError(result.error || 'Une erreur est survenue lors de l\'inscription');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Header />

      <main className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* En-tête */}
          <div className="text-center mb-8">
            <span className="text-6xl block mb-4">👤</span>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#5a4a7c' }}>
              Inscription
            </h1>
            <p className="text-sm text-gray-600">
              Créez votre compte Talier gratuitement
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom complet */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Nom complet
              </label>
              <input
                type="text"
                name="name"
                placeholder="Ex: Dibi Kouassi"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 text-sm rounded-xl border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#9b7ec9')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e0d4f7')}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 text-sm rounded-xl border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#9b7ec9')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e0d4f7')}
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Téléphone
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="Ex: +225 07 00 00 00 00"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 text-sm rounded-xl border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#9b7ec9')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e0d4f7')}
              />
            </div>

            {/* Taille de famille */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Taille de famille (nombre de personnes)
              </label>
              <input
                type="number"
                name="familySize"
                min="1"
                max="20"
                value={formData.familySize}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 text-sm rounded-xl border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#9b7ec9')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e0d4f7')}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Mot de passe
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 text-sm rounded-xl border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#9b7ec9')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e0d4f7')}
              />
            </div>

            {/* Confirmer mot de passe */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 text-sm rounded-xl border-2 focus:outline-none transition"
                style={{ borderColor: '#e0d4f7' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#9b7ec9')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e0d4f7')}
              />
            </div>

            {/* Message d'erreur */}
            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm text-center"
                style={{ backgroundColor: '#fee', color: '#c00' }}
              >
                {error}
              </div>
            )}

            {/* Bouton d'inscription */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-base font-bold text-white rounded-xl shadow-lg transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
            >
              {loading ? 'Création du compte...' : '✨ Créer mon compte'}
            </button>
          </form>

          {/* Lien vers connexion */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Déjà un compte ?{' '}
              <Link href="/connexion">
                <span className="font-semibold hover:underline" style={{ color: '#9b7ec9' }}>
                  Se connecter
                </span>
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}