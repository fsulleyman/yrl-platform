/**
 * Phase B13.5: Paystack Webhook Receiver Endpoint
 * Route: POST /api/payments/paystack/webhook
 *
 * Invariants & Guarantees:
 * 1. Reads raw text body before any parsing to preserve bytes for signature validation.
 * 2. Mandatory HMAC-SHA512 signature check using PAYSTACK_SECRET_KEY.
 * 3. Never trusts client headers or unverified payloads.
 * 4. Idempotently processes charge.success events.
 * 5. Strictly marks payment 'successful' and application 'payment_verified'.
 * 6. NEVER activates membership or creates a member record.
 */

import { NextResponse } from 'next/server';
import { processPaystackWebhook } from '@/lib/payment/service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    const result = await processPaystackWebhook(rawBody, signature);

    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (err: any) {
    console.error('[Paystack Webhook Handler Error]', err?.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
