'use client';

import { ReactNode } from 'react';
import Button from './Button';

interface CardProps {
  title: string;
  description?: string;
  image?: string;
  emoji?: string;
  price?: number;
  currency?: string;
  badge?: string;
  onClick?: () => void;
  onAddToCart?: () => void;
  children?: ReactNode;
  className?: string;
}

export default function Card({
  title,
  description,
  image,
  emoji,
  price,
  currency = 'FCFA',
  badge,
  onClick,
  onAddToCart,
  children,
  className = ''
}: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-lg overflow-hidden 
        transition-all duration-300 hover:shadow-2xl hover:-translate-y-2
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Image ou Emoji */}
      {image ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
          />
          {badge && (
            <span className="absolute top-3 right-3 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold">
              {badge}
            </span>
          )}
        </div>
      ) : emoji ? (
        <div className="flex items-center justify-center h-32 bg-gradient-to-br from-purple-100 to-purple-50">
          <span className="text-6xl">{emoji}</span>
          {badge && (
            <span className="absolute top-3 right-3 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold">
              {badge}
            </span>
          )}
        </div>
      ) : null}

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        
        {description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{description}</p>
        )}

        {/* Prix */}
        {price !== undefined && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-green-600">
              {price.toLocaleString('fr-FR')} {currency}
            </span>
          </div>
        )}

        {/* Children (contenu personnalisé) */}
        {children}

        {/* Action buttons */}
        {onAddToCart && (
          <Button
            variant="success"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
          >
            🛒 Ajouter au panier
          </Button>
        )}
      </div>
    </div>
  );
}
