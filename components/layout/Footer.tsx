'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl mx-8 my-6 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* À propos */}
          <div>
            <h3 className="text-lg font-bold text-purple-600 mb-4">À propos</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Panier vous aide à planifier vos repas et commander vos ingrédients frais
              directement auprès de producteurs locaux.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-lg font-bold text-purple-600 mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-600 hover:text-purple-600 transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/planning" className="text-gray-600 hover:text-purple-600 transition-colors">
                  Planning
                </Link>
              </li>
              <li>
                <Link href="/marche" className="text-gray-600 hover:text-purple-600 transition-colors">
                  Marché
                </Link>
              </li>
              <li>
                <Link href="/menus" className="text-gray-600 hover:text-purple-600 transition-colors">
                  Liste Menus
                </Link>
              </li>
              <li>
                <Link href="/resto" className="text-gray-600 hover:text-purple-600 transition-colors">
                  Le Resto
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-bold text-purple-600 mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/abonnement" className="text-gray-600 hover:text-purple-600 transition-colors">
                  Abonnements
                </Link>
              </li>
              <li>
                <button className="text-gray-600 hover:text-purple-600 transition-colors">
                  Formations
                </button>
              </li>
              <li>
                <button className="text-gray-600 hover:text-purple-600 transition-colors">
                  Devenir Producteur
                </button>
              </li>
              <li>
                <button className="text-gray-600 hover:text-purple-600 transition-colors">
                  Investir
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold text-purple-600 mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-center gap-2">
                📧 <span>contact@panier.com</span>
              </li>
              <li className="flex items-center gap-2">
                📱 <span>+225 XX XX XX XX XX</span>
              </li>
              <li className="flex items-center gap-2">
                📍 <span>Abidjan, Côte d'Ivoire</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">
              © {currentYear} Panier. Tous droits réservés.
            </p>
            <div className="flex gap-4">
              <Link href="/mentions-legales" className="text-gray-600 hover:text-purple-600 text-sm transition-colors">
                Mentions légales
              </Link>
              <Link href="/confidentialite" className="text-gray-600 hover:text-purple-600 text-sm transition-colors">
                Confidentialité
              </Link>
              <Link href="/cgv" className="text-gray-600 hover:text-purple-600 text-sm transition-colors">
                CGV
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
