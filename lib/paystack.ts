// lib/paystack.ts

export interface PaystackConfig {
  email: string;
  amount: number; // en FCFA
  reference: string;
  metadata?: {
    order_id?: string;
    user_id?: string;
    order_type?: 'order' | 'donation' | 'subscription';
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}

export const initializePaystack = (config: PaystackConfig) => {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  
  if (!publicKey) {
    console.error('Clé publique Paystack manquante');
    return;
  }

  // Paystack attend le montant en sous-unité
  // Pour le FCFA (XOF), 1 FCFA = 1 (pas de sous-unité)
  const amountInKobo = config.amount;

  const handler = (window as any).PaystackPop.setup({
    key: publicKey,
    email: config.email,
    amount: amountInKobo,
    currency: 'XOF',
    ref: config.reference,
    metadata: config.metadata,
    channels: ['mobile_money', 'card'],
    callback: (response: any) => {
      console.log('Paiement réussi:', response);
      config.onSuccess(response.reference);
    },
    onClose: () => {
      console.log('Popup fermé');
      config.onCancel();
    }
  });

  handler.openIframe();
};

// Générer une référence unique
export const generateReference = (prefix: string = 'TLR') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

// Vérifier un paiement côté serveur (à utiliser dans une API route)
export const verifyPayment = async (reference: string) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('Clé secrète Paystack manquante');
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  return data;
};
