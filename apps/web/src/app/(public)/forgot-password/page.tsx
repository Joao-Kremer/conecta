'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const schema = z.object({
    organizationId: z.string().uuid(t('validation.invalidOrgId')),
    email: z.string().email(t('validation.invalidEmail')),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { organizationId: '', email: '' },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setIsLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'conecta-web' },
        body: JSON.stringify(values),
      });
      setSent(true);
    } catch {
      toast.error(t('common.connectionError'));
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-6 space-y-4">
          <p className="text-foreground font-medium">{t('auth.forgotPassword.sentTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('auth.forgotPassword.sentBody')}</p>
          <Link href="/login" className="text-sm text-primary hover:underline">
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.forgotPassword.title')}</CardTitle>
        <CardDescription>{t('auth.forgotPassword.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="organizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.forgotPassword.organizationId')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('auth.forgotPassword.organizationIdPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.forgotPassword.email')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t('auth.forgotPassword.emailPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
            </Button>
            <p className="text-center">
              <Link href="/login" className="text-sm text-primary hover:underline">
                {t('auth.forgotPassword.backToLogin')}
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
