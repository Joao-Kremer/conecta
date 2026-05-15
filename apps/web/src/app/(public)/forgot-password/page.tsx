'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const schema = z.object({
  organizationId: z.string().uuid('ID da organização inválido'),
  email: z.string().email('E-mail inválido'),
});

type ForgotInput = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotInput>({
    resolver: zodResolver(schema),
    defaultValues: { organizationId: '', email: '' },
  });

  async function onSubmit(values: ForgotInput) {
    setIsLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'conecta-web' },
        body: JSON.stringify(values),
      });
      setSent(true);
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-6 space-y-4">
          <p className="text-foreground font-medium">Verifique seu e-mail</p>
          <p className="text-sm text-muted-foreground">
            Se esse endereço estiver cadastrado, você receberá um link para redefinir sua senha.
          </p>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>Informe seu e-mail para receber o link de recuperação.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="organizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID da organização</FormLabel>
                  <FormControl>
                    <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
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
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="nome@escolinha.com.br" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Enviando…' : 'Enviar link'}
            </Button>
            <p className="text-center">
              <Link href="/login" className="text-sm text-primary hover:underline">
                Voltar para o login
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
