'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-gradient-to-r from-purple-600 to-purple-800 text-white hover:shadow-lg hover:-translate-y-1 active:translate-y-0',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700',
    success: 'bg-green-500 text-white hover:bg-green-600 hover:shadow-lg',
    danger: 'bg-red-500 text-white hover:bg-red-600 hover:shadow-lg',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 hover:shadow-lg',
    outline: 'border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-5 py-3 text-base',
    lg: 'px-7 py-4 text-lg'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>Chargement...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
