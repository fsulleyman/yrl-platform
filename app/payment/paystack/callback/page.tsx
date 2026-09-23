'use client';

/**
 * Phase B13.5: Paystack Payment Callback Page
 * Route: /payment/paystack/callback
 *
 * Security & UX Rules:
 * 1. Query parameters are treated as informational references ONLY.
 * 2. Never marks payment successful or activates membership based on URL query params.
 * 3. Fetches live, server-authoritative status via checkPaymentStatusAction().
 * 4. Displays clear distinction between PAYMENT VERIFIED and MEMBERSHIP ACTIVATION.
 */

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { checkPaymentStatusAction } from '@/lib/actions/payment';
import type { PaymentStatusResult } from '@/lib/payment/types';

function CallbackContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  const [isLoading, setIsLoading] = useState(true);
  const [statusResult, setStatusResult] = useState<PaymentStatusResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!reference) {
      setIsLoading(false);
      setErrorMessage('No payment reference found in callback parameters.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await checkPaymentStatusAction(reference);
      if (res.success && res.data) {
        setStatusResult(res.data);
      } else {
        setErrorMessage(res.error || 'Unable to retrieve payment record.');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred while verifying payment.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [reference]);

  return (
    <Section spacing="lg" className="min-h-[70vh] flex items-center justify-center bg-gray-50/50">
      <Container size="sm">
        {isLoading ? (
          <Card className="text-center p-8 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <CardTitle className="text-xl">Verifying Payment Confirmation</CardTitle>
              <CardDescription>
                Connecting with YRL server to verify your transaction status...
              </CardDescription>
            </div>
          </Card>
        ) : statusResult && statusResult.paymentStatus === 'successful' ? (
          <Card className="border-green-200 shadow-md">
            <CardHeader className="text-center bg-green-50/60 pb-6 border-b border-green-100">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <Badge variant="success" className="mx-auto mb-2">
                Payment Verified
              </Badge>
              <CardTitle className="text-2xl text-green-900">Payment Successful</CardTitle>
              <CardDescription className="text-green-800">
                Your membership payment of {statusResult.currency} {statusResult.amount.toFixed(2)} has been verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Application Number</span>
                  <span className="font-mono font-semibold text-gray-900">{statusResult.applicationNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Payment Reference</span>
                  <span className="font-mono font-semibold text-gray-900">{statusResult.paymentReference}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Application Status</span>
                  <Badge variant="navy">Awaiting Admin Activation</Badge>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 space-y-2 text-sm text-blue-900">
                <div className="flex items-center space-y-0 space-x-2 font-semibold">
                  <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span>Next Step: Administrative Membership Activation</span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  In accordance with YRL governance, automated payment verification completes the financial requirement.
                  An authorized YRL secretariat administrator will review your application credentials and officially activate
                  your membership. You will receive an email confirmation once your membership ID is issued.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">
                  Return to Home
                </Button>
              </Link>
              <Link href="/member/login" className="w-full">
                <Button className="w-full flex items-center justify-center gap-2">
                  Member Portal <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <Card className="border-amber-200 shadow-md">
            <CardHeader className="text-center bg-amber-50/60 pb-6 border-b border-amber-100">
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
              <Badge variant="warning" className="mx-auto mb-2">
                Processing Confirmation
              </Badge>
              <CardTitle className="text-2xl text-amber-900">Payment Pending Verification</CardTitle>
              <CardDescription className="text-amber-800">
                {errorMessage ||
                  'Your payment is being confirmed with the payment network. If you completed payment, it may take a few moments for the gateway webhook to arrive.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 text-sm text-gray-600">
              <p>
                Reference: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{reference || 'N/A'}</code>
              </p>
              <p>
                If you have already authorized payment with your bank or Mobile Money provider, click the button below to check for the updated verification state.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" onClick={fetchStatus} className="w-full flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Refresh Status
              </Button>
              <Link href="/get-involved/join" className="w-full">
                <Button className="w-full">Back to Membership</Button>
              </Link>
            </CardFooter>
          </Card>
        )}
      </Container>
    </Section>
  );
}

export default function PaystackCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
