'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';  // ✅ AJOUTÉ

export default function Header(): React.JSX.Element {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const { totalItems } = useCart();  // ✅ AJOUTÉ
  
  return (
    <header 
      className="sticky top-0 z-50 shadow-xl mx-4 my-4 rounded-3xl" 
      style={{ 
        background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)'
      }}
    >
      <div className="max-w-[1600px] mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-3xl">🧺</span>
            <h1 
              className="text-xl font-bold bg-clip-text text-transparent whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #5a4a7c 0%, #9b7ec9 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text'
              }}
            >
              Talier
            </h1>
          </Link>

          {/* NAVIGATION CENTRALE */}
          <nav className="flex items-center gap-1">
            <Link 
              href="/" 
              className={`px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                pathname === '/' 
                  ? 'text-white' 
                  : 'hover:bg-white/20'
              }`}
              style={pathname === '/' ? { backgroundColor: '#5a4a7c' } : { color: 'white' }}
            >
              Accueil
            </Link>
            <Link 
              href="/planning" 
              className={`px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                pathname === '/planning' 
                  ? 'text-white' 
                  : 'hover:bg-white/20'
              }`}
              style={pathname === '/planning' ? { backgroundColor: '#5a4a7c' } : { color: 'white' }}
            >
              Plan menu
            </Link>
            <Link 
              href="/resto" 
              className={`px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                pathname === '/resto' 
                  ? 'text-white' 
                  : 'hover:bg-white/20'
              }`}
              style={pathname === '/resto' ? { backgroundColor: '#5a4a7c' } : { color: 'white' }}
            >
              Plan resto
            </Link>
            <Link 
              href="/marche" 
              className={`px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                pathname === '/marche' 
                  ? 'text-white' 
                  : 'hover:bg-white/20'
              }`}
              style={pathname === '/marche' ? { backgroundColor: '#5a4a7c' } : { color: 'white' }}
            >
              Marché
            </Link>
            <Link 
              href="/menus" 
              className={`px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                pathname === '/menus' 
                  ? 'text-white' 
                  : 'hover:bg-white/20'
              }`}
              style={pathname === '/menus' ? { backgroundColor: '#5a4a7c' } : { color: 'white' }}
            >
              Liste menu
            </Link>
            <Link 
              href="/abonnement" 
              className={`px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                pathname === '/abonnement' 
                  ? 'text-white' 
                  : 'hover:bg-white/20'
              }`}
              style={pathname === '/abonnement' ? { backgroundColor: '#5a4a7c' } : { color: 'white' }}
            >
              Abonnement
            </Link>
          </nav>

          {/* ACTIONS DROITE */}
          <div className="flex items-center gap-2 shrink-0">
            {/* PROFIL - Affiche soit le profil utilisateur connecté, soit le bouton de connexion */}
            {isAuthenticated && user ? (
              <Link href="/profil">
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-90 transition"
                  style={{ backgroundColor: 'white' }}
                >
                  <span className="text-sm">👤</span>
                  <p className="font-semibold text-xs whitespace-nowrap" style={{ color: '#333' }}>
                    {user.nom_famille || user.email?.split('@')[0] || 'Utilisateur'} ({user.taille_famille || 1} pers.)
                  </p>
                </div>
              </Link>
            ) : (
              <Link href="/connexion">
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-90 transition"
                  style={{ backgroundColor: 'white' }}
                >
                  <span className="text-sm">🔐</span>
                  <p className="font-semibold text-xs whitespace-nowrap" style={{ color: '#333' }}>
                    Connexion
                  </p>
                </div>
              </Link>
            )}

            {/* PANIER */}
            <Link href="/panier">
              <button 
                className="relative px-4 py-2 text-white font-bold rounded-lg transition-all shadow-lg whitespace-nowrap text-sm hover:opacity-90"
                style={{ backgroundColor: '#f04e4e' }}
              >
                🛒 Panier
                <span 
                  className="absolute -top-2 -right-2 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                  style={{ backgroundColor: '#5a4a7c' }}
                >
                  {totalItems}
                </span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}