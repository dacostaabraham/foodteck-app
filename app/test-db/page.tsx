'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function TestDB() {
  const [stats, setStats] = useState({ 
    products: 0, 
    menus: 0, 
    error: null as string | null 
  })

  useEffect(() => {
    async function loadData() {
      try {
        // Tester products
        const { count: productsCount, error: prodError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })

        if (prodError) throw prodError

        // Tester complete_menus
        const { count: menusCount, error: menusError } = await supabase
          .from('complete_menus')
          .select('*', { count: 'exact', head: true })

        if (menusError) throw menusError

        setStats({ 
          products: productsCount || 0, 
          menus: menusCount || 0,
          error: null
        })
      } catch (error: any) {
        setStats({ products: 0, menus: 0, error: error.message })
      }
    }
    loadData()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Test Connexion BDD
        </h1>
        
        {stats.error ? (
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <div className="text-xl text-red-600 font-semibold mb-2">
              Erreur de connexion
            </div>
            <div className="text-sm text-gray-600 bg-red-50 p-4 rounded-lg">
              {stats.error}
            </div>
          </div>
        ) : stats.products > 0 ? (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-2xl text-green-600 font-bold mb-4">
              Connexion réussie !
            </div>
            <div className="space-y-2 text-lg">
              <div className="bg-green-50 p-3 rounded-lg">
                <span className="font-semibold">{stats.products}</span> produits trouvés
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <span className="font-semibold">{stats.menus}</span> menus trouvés
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <div className="text-xl">Connexion en cours...</div>
          </div>
        )}
      </div>
    </div>
  )
}