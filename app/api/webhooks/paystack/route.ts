// app/api/webhooks/paystack/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Webhook Paystack
 * 
 * Cette route reçoit les notifications de Paystack en temps réel.
 * Elle sert de backup au cas où la vérification côté client échoue.
 */

// Types pour les événements Paystack
interface PaystackWebhookEvent {
  event: 'charge.success' | 'charge.failed' | 'transfer.success' | 'transfer.failed';
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    paid_at: string;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    metadata?: {
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

// Créer un client Supabase (service role si dispo, sinon anon)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL manquante');
  }

  if (serviceKey) {
    return createClient(supabaseUrl, serviceKey);
  }

  if (!anonKey) {
    throw new Error('Clé Supabase manquante');
  }

  return createClient(supabaseUrl, anonKey);
}

// Vérifier la signature Paystack
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    console.error('PAYSTACK_SECRET_KEY non configurée');
    return false;
  }

  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature || !verifyWebhookSignature(payload, signature)) {
      return NextResponse.json(
        { error: 'Signature invalide' },
        { status: 401 }
      );
    }

    const event: PaystackWebhookEvent = JSON.parse(payload);

    console.log(`📩 Webhook Paystack reçu: ${event.event}`, {
      reference: event.data.reference,
      amount: event.data.amount,
      status: event.data.status,
    });

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;

      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;

      default:
        console.log(`Événement non géré: ${event.event}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Erreur webhook Paystack:', error);
    return NextResponse.json({ received: true });
  }
}

// Paiement réussi
async function handleChargeSuccess(data: PaystackWebhookEvent['data']) {
  const { reference, amount, channel, customer, metadata, paid_at } = data;
  const supabase = getSupabaseAdmin();

  // Rechercher la commande
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('id, numero_commande, statut_paiement')
    .eq('reference_paiement', reference)
    .single();

  // Commande inexistante → log paiement
  if (findError || !order) {
    console.log(`⏳ Paiement ${reference} reçu, commande absente`);

    const { error: logError } = await supabase
      .from('payment_logs')
      .insert({
        reference,
        amount,
        channel,
        customer_email: customer.email,
        status: 'success',
        metadata,
        paid_at,
        processed: false,
      });

    if (logError) {
      console.warn('payment_logs non enregistré:', logError.message);
    }

    return;
  }

  // Mise à jour commande
  if (order.statut_paiement !== 'paye') {
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        statut_paiement: 'paye',
        statut: 'confirmee',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Erreur mise à jour commande:', updateError);
    } else {
      console.log(`✅ Commande ${order.numero_commande} confirmée`);
    }
  }
}

// Paiement échoué
async function handleChargeFailed(data: PaystackWebhookEvent['data']) {
  const { reference } = data;
  const supabase = getSupabaseAdmin();

  const { data: order } = await supabase
    .from('orders')
    .select('id, numero_commande')
    .eq('reference_paiement', reference)
    .single();

  if (order) {
    await supabase
      .from('orders')
      .update({
        statut_paiement: 'echoue',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    console.log(`❌ Paiement échoué pour commande ${order.numero_commande}`);
  }
}

// GET health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook Paystack actif',
    timestamp: new Date().toISOString(),
  });
}
