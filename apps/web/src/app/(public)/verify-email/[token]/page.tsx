'use client';

import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyEmailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [status, setStatus] = useState<'checking' | 'success' | 'error' | 'pending'>('checking');

  useEffect(() => {
    if (token === 'pending') { setStatus('pending'); return; }
    void (async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'conecta-web' },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          setStatus('success');
          setTimeout(() => router.push('/login'), 2000);
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    })();
  }, [token, router]);

  return (
    <Card className="w-full max-w-sm text-center">
      <CardHeader>
        <CardTitle>{t('auth.verifyEmail.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'checking' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('auth.verifyEmail.checking')}</p>
          </>
        )}
        {status === 'pending' && (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-soft flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-primary" />
            </div>
            <p className="text-muted-foreground">
              {t('auth.verifyEmail.pendingBody')}
            </p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-success" />
            <p className="text-muted-foreground">{t('auth.verifyEmail.success')}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-danger" />
            <p className="text-muted-foreground">{t('auth.verifyEmail.error')}</p>
            <Button variant="outline" onClick={() => router.push('/login')}>
              {t('auth.verifyEmail.goToLogin')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
