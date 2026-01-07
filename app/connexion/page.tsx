'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';

export default function ConnexionPage() {
  const router = useRouter();
  const { signIn } = useAuth(); // ✅ CHANGÉ : login → signIn
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // ✅ CHANGÉ : Utiliser signIn avec gestion du résultat
    const result = await signIn(email, password);

    if (result.success) {
      // ✅ Connexion réussie
      console.log('✅ Connexion réussie !');
      router.replace('/');
    } else {
      // ❌ Erreur lors de la connexion
      setError(result.error || 'Email ou mot de passe incorrect');
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
            <span className="text-6xl block mb-4">🔐</span>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#5a4a7c' }}>
              Connexion
            </h1>
            <p className="text-sm text-gray-600">
              Connectez-vous à votre compte Talier
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#5a4a7c' }}>
                Email
              </label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {/* Mot de passe oublié */}
            <div className="text-right">
              <Link href="/mot-de-passe-oublie">
                <span className="text-sm hover:underline" style={{ color: '#9b7ec9' }}>
                  Mot de passe oublié ?
                </span>
              </Link>
            </div>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-base font-bold text-white rounded-xl shadow-lg transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
            >
              {loading ? 'Connexion...' : '🔓 Se connecter'}
            </button>
          </form>

          {/* Lien vers inscription */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <Link href="/inscription">
                <span className="font-semibold hover:underline" style={{ color: '#9b7ec9' }}>
                  Créer un compte
                </span>
              </Link>
            </p>
          </div>

          {/* Compte de test - SUPPRIMÉ car maintenant on utilise Supabase */}
          {/* L'ancien compte de test localStorage ne fonctionne plus */}
        </div>
      </main>

      <Footer />
    </div>
  );
}