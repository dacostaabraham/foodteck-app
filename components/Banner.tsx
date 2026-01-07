'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Announcement {
  id: number;
  type: 'formation' | 'promo' | 'event' | 'info';
  icon: string;
  title: string;
  description: string;
  buttonText: string;
  buttonAction: () => void;
  href?: string;
}

export default function AnnouncementBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const announcements: Announcement[] = [
    {
      id: 1,
      type: 'formation',
      icon: '🎓',
      title: 'Nouvelle Formation Disponible !',
      description: 'Inscrivez-vous à nos formations en Agribusiness et Financement Agricole',
      buttonText: 'En savoir plus',
      href: '/formations',
      buttonAction: () => {}
    },
    {
      id: 2,
      type: 'promo',
      icon: '🏭',
      title: 'Marché de Gros Ouvert !',
      description: 'Profitez de -15% sur tous les achats en gros - Consommateur de gros, transformateurs et commerçants bienvenus',
      buttonText: 'Découvrir',
      href: '/marche',
      buttonAction: () => {}
    },
    {
      id: 3,
      type: 'event',
      icon: '📈',
      title: 'Opportunités d\'Investissement',
      description: 'Investissez dans l\'agriculture locale avec des rendements de 15-25% par an',
      buttonText: 'Investir maintenant',
      href: '/investir',
      buttonAction: () => {}
    },
    {
      id: 4,
      type: 'info',
      icon: '🌾',
      title: 'Devenez un partenaire producteur ou transformateur',
      description: 'Vendez vos produits directement aux consommateurs - Inscription gratuite',
      buttonText: 'Rejoindre',
      href: '/vendre',
      buttonAction: () => {}
    },
    {
      id: 5,
      type: 'promo',
      icon: '🎉',
      title: 'Promotion Spéciale',
      description: '-20% sur tous les légumes bio cette semaine + Livraison gratuite dès 5000 FCFA',
      buttonText: 'Profiter maintenant',
      href: '/marche',
      buttonAction: () => {}
    }
  ];

  // Auto-play du slider
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % announcements.length);
    }, 5000); // Change toutes les 5 secondes

    return () => clearInterval(interval);
  }, [announcements.length]);

  const changeSlide = (direction: number) => {
    setCurrentSlide((prev) => {
      const newSlide = prev + direction;
      if (newSlide < 0) return announcements.length - 1;
      if (newSlide >= announcements.length) return 0;
      return newSlide;
    });
  };

  const getBackgroundStyle = (type: string) => {
    switch (type) {
      case 'formation':
        // Bleu très doux et subtil
        return { background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)' };
      case 'promo':
        // Vert menthe très doux
        return { background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' };
      case 'event':
        // Pêche/abricot très doux
        return { background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)' };
      case 'info':
        // Lavande très douce
        return { background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)' };
      default:
        return { background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)' };
    }
  };

  const getTextColor = (type: string) => {
    // Texte sombre doux pour contraster avec les fonds pastel
    return '#334155';
  };

  const getButtonStyle = (type: string) => {
    switch (type) {
      case 'formation':
        return { backgroundColor: '#334155', color: 'white' };
      case 'promo':
        return { backgroundColor: '#059669', color: 'white' };
      case 'event':
        return { backgroundColor: '#ea580c', color: 'white' };
      case 'info':
        return { backgroundColor: '#7c3aed', color: 'white' };
      default:
        return { backgroundColor: '#334155', color: 'white' };
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-white shadow-sm">
      <div className="relative h-24 md:h-28">
        {announcements.map((announcement, index) => (
          <div
            key={announcement.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === currentSlide
                ? 'opacity-100 translate-x-0'
                : index < currentSlide
                ? 'opacity-0 -translate-x-full'
                : 'opacity-0 translate-x-full'
            }`}
          >
            <div
              style={getBackgroundStyle(announcement.type)}
              className="h-full flex items-center justify-center px-4 md:px-8"
            >
              <div 
                className="max-w-7xl w-full flex flex-col md:flex-row items-center justify-between gap-4"
                style={{ color: getTextColor(announcement.type) }}
              >
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg md:text-xl font-bold mb-1">
                    {announcement.icon} {announcement.title}
                  </h3>
                  <p 
                    className="text-sm md:text-base hidden sm:block"
                    style={{ color: '#475569' }}
                  >
                    {announcement.description}
                  </p>
                </div>
                <Link href={announcement.href || '#'}>
                  <button 
                    className="px-6 py-2 rounded-full font-semibold transition-all shadow-md whitespace-nowrap hover:opacity-90 hover:scale-105 hover:shadow-lg"
                    style={getButtonStyle(announcement.type)}
                  >
                    {announcement.buttonText}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <button
        onClick={() => changeSlide(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white/80 rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 shadow-sm"
        style={{ color: '#64748b' }}
        aria-label="Annonce précédente"
      >
        ‹
      </button>
      <button
        onClick={() => changeSlide(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white/80 rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 shadow-sm"
        style={{ color: '#64748b' }}
        aria-label="Annonce suivante"
      >
        ›
      </button>

      {/* Indicateurs */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
        {announcements.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide
                ? 'w-4'
                : 'hover:opacity-100'
            }`}
            style={{
              backgroundColor: index === currentSlide ? '#64748b' : '#cbd5e1'
            }}
            aria-label={`Aller à l'annonce ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}