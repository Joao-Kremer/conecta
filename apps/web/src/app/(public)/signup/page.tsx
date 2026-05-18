'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const signupSchema = z.object({
    organizationName: z.string().min(2, t('validation.min2')).max(100),
    adminName: z.string().min(2, t('validation.min2')).max(100),
    email: z.string().email(t('validation.invalidEmail')),
    password: z
      .string()
      .min(8, t('validation.min8'))
      .regex(/[A-Z]/, t('validation.passwordUppercase'))
      .regex(/[0-9]/, t('validation.passwordNumber')),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: t('validation.acceptTermsRequired') }),
    }),
  });

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { organizationName: '', adminName: '', email: '', password: '', acceptTerms: undefined },
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'conecta-web' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        toast.error(body.message ?? t('auth.signup.genericError'));
        return;
      }
      router.push('/verify-email/pending');
    } catch {
      toast.error(t('common.connectionError'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('auth.signup.title')}</CardTitle>
        <CardDescription>{t('auth.signup.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.signup.organizationName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('auth.signup.organizationNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.signup.adminName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('auth.signup.adminNamePlaceholder')} {...field} />
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
                  <FormLabel>{t('auth.signup.email')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t('auth.signup.emailPlaceholder')} {...field} />
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
                  <FormLabel>{t('auth.signup.password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('auth.signup.passwordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-border"
                      checked={field.value === true}
                      onChange={(e) => field.onChange(e.target.checked ? true : undefined)}
                    />
                  </FormControl>
                  <div className="leading-none">
                    <FormLabel>
                      {t('auth.signup.acceptTermsPrefix')}
                      <Link href="/terms" className="text-primary hover:underline">
                        {t('auth.signup.termsLink')}
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.signup.submitting') : t('auth.signup.submit')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.signup.alreadyHaveAccount')}{' '}
              <Link href="/login" className="text-primary hover:underline">
                {t('auth.signup.login')}
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
