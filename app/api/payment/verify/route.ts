// app/api/payment/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route pour vérifier un paiement Paystack
 * 
 * Cette route est appelée après que le client a effectué un paiement
 * pour vérifier auprès de Paystack que le paiement est bien réussi
 * AVANT de créer la commande dans la base de données.
 */

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned' | 'pending';
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    paid_at: string;
    created_at: string;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    metadata: {
      order_type?: string;
      user_id?: string;
      custom_fields?: Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, expectedAmount } = body;

    // Validation des paramètres
    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Référence de paiement manquante' },
        { status: 400 }
      );
    }

    // Récupérer la clé secrète
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('PAYSTACK_SECRET_KEY non configurée');
      return NextResponse.json(
        { success: false, error: 'Configuration serveur incorrecte' },
        { status: 500 }
      );
    }

    // Appeler l'API Paystack pour vérifier la transaction
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.ok) {
      console.error('Erreur Paystack API:', paystackResponse.status);
      return NextResponse.json(
        { success: false, error: 'Erreur de vérification Paystack' },
        { status: 502 }
      );
    }

    const data: PaystackVerifyResponse = await paystackResponse.json();

    // Vérifier que la requête Paystack a réussi
    if (!data.status) {
      return NextResponse.json(
        { success: false, error: data.message || 'Transaction non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier le statut du paiement
    if (data.data.status !== 'success') {
      return NextResponse.json({
        success: false,
        error: `Paiement non réussi (statut: ${data.data.status})`,
        paymentStatus: data.data.status,
      }, { status: 400 });
    }

    // Vérifier le montant si fourni (protection contre manipulation)
    // Note: Paystack retourne le montant en sous-unité, mais pour XOF c'est 1:1
    if (expectedAmount && data.data.amount !== expectedAmount) {
      console.error(`Montant incorrect! Attendu: ${expectedAmount}, Reçu: ${data.data.amount}`);
      return NextResponse.json({
        success: false,
        error: 'Montant du paiement incorrect',
      }, { status: 400 });
    }

    // Paiement vérifié avec succès
    return NextResponse.json({
      success: true,
      verified: true,
      data: {
        reference: data.data.reference,
        amount: data.data.amount,
        currency: data.data.currency,
        channel: data.data.channel,
        paidAt: data.data.paid_at,
        customerEmail: data.data.customer.email,
        metadata: data.data.metadata,
      },
    });

  } catch (error) {
    console.error('Erreur vérification paiement:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la vérification' },
      { status: 500 }
    );
  }
}

// Méthode GET pour vérification simple (optionnel)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reference = searchParams.get('reference');

  if (!reference) {
    return NextResponse.json(
      { success: false, error: 'Référence manquante' },
      { status: 400 }
    );
  }

  // Réutiliser la logique POST
  const fakeRequest = {
    json: async () => ({ reference }),
  } as NextRequest;

  return POST(fakeRequest);
}
