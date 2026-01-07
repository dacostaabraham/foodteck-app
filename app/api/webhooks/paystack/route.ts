// app/api/webhooks/paystack/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Webhook Paystack
 * 
 * Cette route reçoit les notifications de Paystack en temps réel.
 * Elle sert de backup au cas où la vérification côté client échoue.
 * 
 * Configuration requise dans Paystack Dashboard:
 * 1. Aller sur Settings > API Keys & Webhooks
 * 2. Ajouter l'URL: https://votredomaine.com/api/webhooks/paystack
 * 3. Sélectionner les événements: charge.success, transfer.success
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

// Créer un client Supabase avec la clé service (pour les opérations admin)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    // Fallback sur la clé anon si service key non disponible
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      throw new Error('Configuration Supabase manquante');
    }
    return createClient(supabaseUrl, anonKey);
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Vérifier la signature du webhook
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
    // Récupérer le corps brut pour vérification de signature
    const payload = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // Vérifier la signature (sécurité)
    if (!signature || !verifyWebhookSignature(payload, signature)) {
      console.error('Signature webhook invalide');
      return NextResponse.json(
        { error: 'Signature invalide' },
        { status: 401 }
      );
    }

    // Parser l'événement
    const event: PaystackWebhookEvent = JSON.parse(payload);
    console.log(`📩 Webhook Paystack reçu: ${event.event}`, {
      reference: event.data.reference,
      amount: event.data.amount,
      status: event.data.status,
    });

    // Traiter selon le type d'événement
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

    // Toujours retourner 200 pour confirmer la réception
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Erreur webhook Paystack:', error);
    // Retourner 200 quand même pour éviter les retries inutiles
    return NextResponse.json({ received: true, error: 'Erreur de traitement' });
  }
}

// Gérer un paiement réussi
async function handleChargeSuccess(data: PaystackWebhookEvent['data']) {
  const { reference, amount, channel, customer, metadata, paid_at } = data;

  try {
    const supabase = getSupabaseAdmin();

    // Chercher la commande par référence de paiement
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('id, numero_commande, statut_paiement')
      .eq('reference_paiement', reference)
      .single();

    if (findError || !order) {
      // La commande n'existe pas encore - elle sera créée par le client
      // Enregistrer le paiement dans une table de log pour réconciliation
      console.log(`⏳ Paiement ${reference} reçu, commande pas encore créée`);
      
      // Optionnel: Créer un log de paiement
      await supabase.from('payment_logs').insert({
        reference,
        amount,
        channel,
        customer_email: customer.email,
        status: 'success',
        metadata,
        paid_at,
        processed: false,
      }).catch(() => {
        // Table payment_logs peut ne pas exister, ignorer l'erreur
      });
      
      return;
    }

    // Si la commande existe et n'est pas encore marquée comme payée
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
        console.log(`✅ Commande ${order.numero_commande} mise à jour via webhook`);
      }
    } else {
      console.log(`ℹ️ Commande ${order.numero_commande} déjà payée`);
    }

  } catch (error) {
    console.error('Erreur traitement charge.success:', error);
    throw error;
  }
}

// Gérer un paiement échoué
async function handleChargeFailed(data: PaystackWebhookEvent['data']) {
  const { reference } = data;

  try {
    const supabase = getSupabaseAdmin();

    // Chercher et mettre à jour la commande si elle existe
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

  } catch (error) {
    console.error('Erreur traitement charge.failed:', error);
  }
}

// GET pour vérifier que le webhook est accessible
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook Paystack actif',
    timestamp: new Date().toISOString(),
  });
}
