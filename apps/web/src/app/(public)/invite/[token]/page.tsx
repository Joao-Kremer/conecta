'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export default function AcceptInvitePage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [isLoading, setIsLoading] = useState(false);

  const schema = z.object({
    name: z.string().min(2, t('validation.min2')),
    password: z
      .string()
      .min(8, t('validation.min8'))
      .regex(/[A-Z]/, t('validation.passwordUppercase'))
      .regex(/[0-9]/, t('validation.passwordNumber')),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'conecta-web' },
        body: JSON.stringify({ token: params.token, ...values }),
      });
      if (res.ok) {
        toast.success(t('auth.invite.success'));
        router.push('/dashboard');
      } else {
        const body = (await res.json()) as { message?: string };
        toast.error(body.message ?? t('auth.invite.error'));
      }
    } catch {
      toast.error(t('common.connectionError'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.invite.title')}</CardTitle>
        <CardDescription>{t('auth.invite.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.invite.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('auth.invite.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.invite.password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('auth.invite.passwordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.invite.submitting') : t('auth.invite.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
