/**
 * Phase B13.5: Paystack Provider Boundary
 * Dedicated server-side integration for Paystack payment gateway.
 *
 * Responsibilities:
 * 1. Initialize Paystack transactions (server-side only)
 * 2. Verify Paystack transactions directly with Paystack API
 * 3. Validate Paystack HMAC-SHA512 webhook signatures
 *
 * INVARIANTS:
 * - PAYSTACK_SECRET_KEY is never exposed to the client or browser.
 * - Secret values and raw authorization headers are never logged or returned in error messages.
 * - Timing-safe comparison is used for signature validation.
 * - No business membership activation logic resides here; this is strictly the provider boundary.
 */

import crypto from 'crypto';
import type { PaystackVerifyResponse } from './types';

const PAYSTACK_API_BASE = 'https://api.paystack.co';

/**
 * Retrieve server-side Paystack secret key safely.
 */
export function getPaystackSecretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    return null;
  }
  return key.trim();
}

/**
 * Validate Paystack HMAC-SHA512 signature against raw request body.
 * Uses crypto.timingSafeEqual to prevent timing side-channel attacks.
 */
export function validatePaystackSignature(
  rawBody: string,
  signature: string | null | undefined,
  secretKeyOverride?: string
): boolean {
  if (!signature || typeof signature !== 'string' || signature.trim().length === 0) {
    return false;
  }

  const secret =
    typeof secretKeyOverride === 'string'
      ? secretKeyOverride.trim().length > 0
        ? secretKeyOverride.trim()
        : null
      : getPaystackSecretKey();
  if (!secret) {
    console.error('[Paystack] Signature validation failed: PAYSTACK_SECRET_KEY is not configured.');
    return false;
  }

  try {
    const computedHash = crypto
      .createHmac('sha512', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    const signatureBuffer = Buffer.from(signature.trim(), 'utf8');
    const hashBuffer = Buffer.from(computedHash, 'utf8');

    if (signatureBuffer.length !== hashBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, hashBuffer);
  } catch (err) {
    console.error('[Paystack] Signature comparison error');
    return false;
  }
}

export interface PaystackInitParams {
  email: string;
  amountInSubunit: number; // e.g. 500 pesewas for GH₵5.00
  currency?: string; // 'GHS'
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitResult {
  success: boolean;
  data?: {
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  };
  error?: string;
}

/**
 * Initialize a Paystack transaction.
 * Server-authoritative: amount must already be calculated in subunits (pesewas).
 */
export async function initializePaystackTransaction(
  params: PaystackInitParams,
  secretKeyOverride?: string
): Promise<PaystackInitResult> {
  const secret =
    typeof secretKeyOverride === 'string'
      ? secretKeyOverride.trim().length > 0
        ? secretKeyOverride.trim()
        : null
      : getPaystackSecretKey();
  if (!secret) {
    return {
      success: false,
      error: 'Paystack payment gateway is not configured on the server.',
    };
  }

  // Guard: Amount must be a positive integer
  if (!Number.isInteger(params.amountInSubunit) || params.amountInSubunit <= 0) {
    return {
      success: false,
      error: 'Invalid payment amount specified for transaction initialization.',
    };
  }

  const payload = {
    email: params.email.trim().toLowerCase(),
    amount: params.amountInSubunit,
    currency: params.currency || 'GHS',
    reference: params.reference.trim(),
    callback_url: params.callbackUrl,
    metadata: params.metadata || {},
  };

  try {
    const response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.status) {
      const providerMessage = typeof result.message === 'string' ? result.message : 'Transaction initialization failed';
      console.error('[Paystack API Error] Initialize failed:', providerMessage);
      return {
        success: false,
        error: providerMessage,
      };
    }

    return {
      success: true,
      data: {
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
        reference: result.data.reference,
      },
    };
  } catch (err: any) {
    console.error('[Paystack Network Error] Transaction initialize failed');
    return {
      success: false,
      error: 'Unable to connect to Paystack payment gateway. Please try again.',
    };
  }
}

export interface PaystackVerifyResult {
  success: boolean;
  data?: NonNullable<PaystackVerifyResponse['data']>;
  error?: string;
}

/**
 * Verify a Paystack transaction directly with the Paystack API.
 */
export async function verifyPaystackTransaction(
  reference: string,
  secretKeyOverride?: string
): Promise<PaystackVerifyResult> {
  const secret =
    typeof secretKeyOverride === 'string'
      ? secretKeyOverride.trim().length > 0
        ? secretKeyOverride.trim()
        : null
      : getPaystackSecretKey();
  if (!secret) {
    return {
      success: false,
      error: 'Paystack payment gateway is not configured on the server.',
    };
  }

  if (!reference || typeof reference !== 'string' || reference.trim().length === 0) {
    return {
      success: false,
      error: 'Transaction reference is required for verification.',
    };
  }

  try {
    const response = await fetch(
      `${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference.trim())}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result: PaystackVerifyResponse = await response.json();

    if (!response.ok || !result.status || !result.data) {
      const providerMessage = typeof result.message === 'string' ? result.message : 'Transaction verification failed';
      return {
        success: false,
        error: providerMessage,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (err: any) {
    console.error('[Paystack Network Error] Transaction verify failed');
    return {
      success: false,
      error: 'Unable to verify transaction with Paystack. Please try again.',
    };
  }
}
