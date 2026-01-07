import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Banner from '@/components/Banner';

export default function Home() {
  return (
    <div 
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #d4c5f0 0%, #c9b5e8 100%)' }}
    >
      <Header />

      {/* BANDE D'ANNONCE */}
      <Banner />

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-8 py-20 text-center">
        <div 
          className="rounded-3xl p-12 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
        >
          <h1 className="text-6xl font-bold text-white mb-6">
            Talier
          </h1>
          <p className="text-2xl text-white/95 mb-4">
            C'est la fin du tracas de "qu'est-ce qu'on mange ce midi ou ce soir ?"
          </p>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Ici c'est vous qui décidez : Soit à cuisiner, on vous livre les ingrédients frais et à votre goût, Soit à savourer, et vous recevez des plats faits de mains de grands cuisiniers.<br />
            Planifiez votre semaine, ce que vous voulez vraiment déguster vos menus et plats et on s'occupe du reste.<br />      
            Le Talier vous redonne du temps pour vous, c'est simple, rapide, pratique et élégant !           
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/planning">
              <Button variant="success" size="lg">
                🗓️ Planifier mes repas
              </Button>
            </Link>
            <Link href="/marche">
              <button 
                className="px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:opacity-90"
                style={{ 
                  backgroundColor: 'white',
                  color: '#5a4a7c'
                }}
              >
                🛒 Voir le marché
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION COLLECTE ALIMENTAIRE SOLIDAIRE */}
      <section className="max-w-7xl mx-auto px-8 py-12">
        <div 
          className="rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, #f04e4e 0%, #ff6b6b 100%)',
          }}
        >
          {/* Décoration de fond */}
          <div className="absolute top-0 right-0 text-9xl opacity-10">❤️</div>
          <div className="absolute bottom-0 left-0 text-9xl opacity-10">🤲</div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Texte */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <span className="text-4xl">🤲</span>
                <h2 className="text-3xl font-bold text-white">
                  Collecte Alimentaire Solidaire
                </h2>
              </div>
              <p className="text-lg text-white/95 mb-4">
                Aidez-nous à nourrir les orphelins et personnes démunies. 
                <br />
                <span className="font-semibold">Chaque don compte, chaque geste nourrit l'espoir.</span>
              </p>
              <div className="flex items-center justify-center md:justify-start gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👶</span>
                  <span className="text-sm font-medium">226 bénéficiaires</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🍱</span>
                  <span className="text-sm font-medium">1,234 repas distribués</span>
                </div>
              </div>
            </div>

            {/* Bouton d'action */}
            <div className="flex-shrink-0">
              <Link href="/collecte-alimentaire">
                <button 
                  className="px-8 py-4 rounded-xl text-lg font-bold shadow-2xl transition-all hover:scale-105 hover:shadow-3xl"
                  style={{ 
                    backgroundColor: 'white',
                    color: '#f04e4e'
                  }}
                >
                  ❤️ Faire un don maintenant
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUITS FRAIS EN AVANT */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Légumes frais */}
          <div 
            className="bg-white rounded-2xl p-8 shadow-xl text-center hover:scale-105 transition-transform"
          >
            <div className="text-6xl mb-4">🥬</div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: '#333' }}>
              Légumes frais
            </h3>
            <p className="mb-6" style={{ color: '#999' }}>
              Directement de nos producteurs locaux
            </p>
            <Link href="/marche">
              <Button variant="primary" size="md">Découvrir</Button>
            </Link>
          </div>

          {/* Poissons */}
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center hover:scale-105 transition-transform">
            <div className="text-6xl mb-4">🐟</div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: '#333' }}>
              Poissons
            </h3>
            <p className="mb-6" style={{ color: '#999' }}>
              Pêche du jour, qualité garantie
            </p>
            <Link href="/marche">
              <Button variant="primary" size="md">Découvrir</Button>
            </Link>
          </div>

          {/* Viandes */}
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center hover:scale-105 transition-transform">
            <div className="text-6xl mb-4">🍖</div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: '#333' }}>
              Viandes
            </h3>
            <p className="mb-6" style={{ color: '#999' }}>
              Élevage local et responsable
            </p>
            <Link href="/marche">
              <Button variant="primary" size="md">Découvrir</Button>
            </Link>
          </div>

          {/* Produits transformés */}
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center hover:scale-105 transition-transform">
            <div className="text-6xl mb-4">🍯</div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: '#333' }}>
              Produits transformés
            </h3>
            <p className="mb-6" style={{ color: '#999' }}>
              Artisanaux et authentiques
            </p>
            <Link href="/marche">
              <Button variant="primary" size="md">Découvrir</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* PRODUITS DE SAISON */}
      <section className="max-w-7xl mx-auto px-8 py-12">
        <div 
          className="rounded-2xl p-8 border-2"
          style={{ 
            backgroundColor: '#e8dcf7',
            borderColor: '#c9b5e8'
          }}
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: '#333' }}>
            <span>🌿</span>
            Produits de saison (Octobre)
          </h3>
          <div className="flex flex-wrap gap-3">
            {['🎃 Courges', '🍎 Pommes', '🥔 Pommes de terre', '🥕 Carottes', 
              '🍄 Champignons', '🌰 Châtaignes', '🍐 Poires', '🥬 Choux'].map((item) => (
              <span 
                key={item}
                className="px-4 py-2 rounded-full font-medium shadow-sm border"
                style={{ 
                  backgroundColor: 'white',
                  color: '#5a4a7c',
                  borderColor: '#9b7ec9'
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <h2 className="text-4xl font-bold text-center mb-12" style={{ color: '#333' }}>
          Comment ça marche ?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Étape 1 */}
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#5a4a7c' }}>
              1. Planifiez
            </h3>
            <p style={{ color: '#333' }}>
              Choisissez vos repas pour la semaine depuis notre catalogue 
              ou créez vos propres menus personnalisés ou encore choissez des plats prêts à dégustation dans "Plan resto".
            </p>
          </div>

          {/* Étape 2 */}
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#5a4a7c' }}>
              2. Validez
            </h3>
            <p style={{ color: '#333' }}>
              Notre système calcule automatiquement tous les ingrédients 
              nécessaires ou les plats selon la nombre de personnes validé.
            </p>
          </div>

          {/* Étape 3 */}
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
            <div className="text-6xl mb-4">🚚</div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#5a4a7c' }}>
              3. Recevez
            </h3>
            <p style={{ color: '#333' }}>
              Vos ingrédients frais ou vos plats prêts sont livrés chez vous. 
              Plus qu'à cuisiner ou à déguster selon votre planning !
            </p>
          </div>
        </div>
      </section>

      {/* NOS SERVICES */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <h2 className="text-4xl font-bold text-center mb-12" style={{ color: '#333' }}>
          Tout ce dont vous avez besoin
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Service 1 */}
          <Link href="/marche">
            <div className="bg-white/95 rounded-2xl p-6 shadow-xl hover:scale-105 transition-transform cursor-pointer">
              <div className="text-5xl mb-4">🥬</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#5a4a7c' }}>
                Marché
              </h3>
              <p className="text-sm" style={{ color: '#333' }}>
                Ingrédients frais du marché de détail et de gros (-15%)
              </p>
            </div>
          </Link>

          {/* Service 2 */}
          <Link href="/menus">
            <div className="bg-white/95 rounded-2xl p-6 shadow-xl hover:scale-105 transition-transform cursor-pointer">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#5a4a7c' }}>
                Menus
              </h3>
              <p className="text-sm" style={{ color: '#333' }}>
                Créez et sauvegardez vos menus personnalisés
              </p>
            </div>
          </Link>

          {/* Service 3 */}
          <Link href="/resto">
            <div className="bg-white/95 rounded-2xl p-6 shadow-xl hover:scale-105 transition-transform cursor-pointer">
              <div className="text-5xl mb-4">🍲</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#5a4a7c' }}>
                Le Resto
              </h3>
              <p className="text-sm" style={{ color: '#333' }}>
                Plats préparés africains et internationaux prêts à déguster
              </p>
            </div>
          </Link>

          {/* Service 4 */}
          <Link href="/abonnement">
            <div className="bg-white/95 rounded-2xl p-6 shadow-xl hover:scale-105 transition-transform cursor-pointer">
              <div className="text-5xl mb-4">💎</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#5a4a7c' }}>
                Abonnements
              </h3>
              <p className="text-sm" style={{ color: '#333' }}>
                Formules automatiques avec livraison hebdomadaire
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* STATISTIQUES */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div 
          className="rounded-3xl p-12 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
        >
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Panier en chiffres
          </h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-white mb-2">+500</div>
              <p className="text-white/90 text-lg">Produits frais</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-white mb-2">+200</div>
              <p className="text-white/90 text-lg">Recettes disponibles</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-white mb-2">24h</div>
              <p className="text-white/90 text-lg">Livraison rapide</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-white mb-2">+10k</div>
              <p className="text-white/90 text-lg">Producteurs locaux</p>
            </div>
          </div>
        </div>
      </section>

      {/* BUSINESS AGRICOLE ET AGROINDUSTRIEL */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: '#333' }}>
            🌾 Business Agricole et Agroindustriel
          </h2>
          <p className="text-xl" style={{ color: '#999' }}>
            Développez vos compétences et opportunités dans l'agribusiness
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Formation 1: Agribusiness et Solvabilité */}
          <div 
            className="bg-white rounded-2xl p-6 shadow-xl border-2 hover:scale-105 transition-transform cursor-pointer"
            style={{ borderColor: '#9b7ec9' }}
          >
            <div className="text-5xl mb-4 text-center">📚</div>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#333' }}>
              Agribusiness et Solvabilité
            </h3>
            <p className="mb-6 text-sm" style={{ color: '#999' }}>
              Apprenez à gérer votre exploitation agricole de manière rentable et durable
            </p>
            <button 
              className="w-full text-white px-4 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#5a4a7c' }}
            >
              Commander la formation
            </button>
          </div>

          {/* Formation 2: Financement Agricole */}
          <div 
            className="bg-white rounded-2xl p-6 shadow-xl border-2 hover:scale-105 transition-transform cursor-pointer"
            style={{ borderColor: '#9b7ec9' }}
          >
            <div className="text-5xl mb-4 text-center">💰</div>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#333' }}>
              Financement Agricole
            </h3>
            <p className="mb-6 text-sm" style={{ color: '#999' }}>
              Maîtrisez les techniques de financement et accédez aux crédits agricoles
            </p>
            <button 
              className="w-full text-white px-4 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#5a4a7c' }}
            >
              Commander la formation
            </button>
          </div>

          {/* Vendre mon produit */}
          <div 
            className="bg-white rounded-2xl p-6 shadow-xl border-2 hover:scale-105 transition-transform cursor-pointer"
            style={{ borderColor: '#c9b5e8' }}
          >
            <div className="text-5xl mb-4 text-center">🛒</div>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#333' }}>
              Vendre mon produit
            </h3>
            <p className="mb-6 text-sm" style={{ color: '#999' }}>
              Devenez producteur partenaire et vendez vos produits sur notre plateforme
            </p>
            <button 
              className="w-full text-white px-4 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#9b7ec9' }}
            >
              Je veux vendre
            </button>
          </div>

          {/* Investir chez nous */}
          <div 
            className="bg-white rounded-2xl p-6 shadow-xl border-2 hover:scale-105 transition-transform cursor-pointer"
            style={{ borderColor: '#f04e4e' }}
          >
            <div className="text-5xl mb-4 text-center">📈</div>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#333' }}>
              Investir chez nous
            </h3>
            <p className="mb-6 text-sm" style={{ color: '#999' }}>
              Participez au développement de l'agriculture locale et générez des revenus
            </p>
            <button 
              className="w-full text-white px-4 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#f04e4e' }}
            >
              Investir maintenant
            </button>
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <h2 className="text-4xl font-bold text-center mb-12" style={{ color: '#333' }}>
          Ce qu'ils en pensent
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Témoignage 1 */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">👩🏾</div>
              <div>
                <p className="font-bold" style={{ color: '#5a4a7c' }}>Aminata K.</p>
                <p className="text-sm" style={{ color: '#999' }}>Abidjan, Cocody</p>
              </div>
            </div>
            <p className="italic" style={{ color: '#333' }}>
              "Plus besoin de courir au marché chaque matin ! Je planifie ma semaine 
              le dimanche et tout arrive à ma porte. Un gain de temps incroyable."
            </p>
            <div className="text-yellow-500 mt-3">⭐⭐⭐⭐⭐</div>
          </div>

          {/* Témoignage 2 */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">👨🏿</div>
              <div>
                <p className="font-bold" style={{ color: '#5a4a7c' }}>Kouassi M.</p>
                <p className="text-sm" style={{ color: '#999' }}>Abidjan, Marcory</p>
              </div>
            </div>
            <p className="italic" style={{ color: '#333' }}>
              "Le marché de gros est parfait pour ma famille nombreuse. 
              J'économise 15% sur tous mes achats !"
            </p>
            <div className="text-yellow-500 mt-3">⭐⭐⭐⭐⭐</div>
          </div>

          {/* Témoignage 3 */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">👩🏾‍🦱</div>
              <div>
                <p className="font-bold" style={{ color: '#5a4a7c' }}>Fatou S.</p>
                <p className="text-sm" style={{ color: '#999' }}>Abidjan, Plateau</p>
              </div>
            </div>
            <p className="italic" style={{ color: '#333' }}>
              "Les plats du resto sont délicieux et authentiques. 
              Quand je n'ai pas le temps de cuisiner, c'est ma solution idéale."
            </p>
            <div className="text-yellow-500 mt-3">⭐⭐⭐⭐⭐</div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION FINAL */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <div 
          className="rounded-3xl p-12 shadow-2xl text-center"
          style={{ background: 'linear-gradient(135deg, #9b7ec9 0%, #b19cd9 100%)' }}
        >
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à simplifier votre alimentation ?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Rejoignez Panier et profitez de la livraison gratuite dès 5000 FCFA
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/planning">
              <Button variant="success" size="lg">
                🚀 Commencer maintenant
              </Button>
            </Link>
            <Link href="/abonnement">
              <button 
                className="px-8 py-3 rounded-lg text-lg font-semibold transition-all shadow-lg hover:opacity-90"
                style={{ 
                  backgroundColor: 'white',
                  color: '#5a4a7c'
                }}
              >
                💎 Voir les abonnements
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}