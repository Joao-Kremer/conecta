import { Button, Heading, Text } from '@react-email/components';
import React from 'react';

import { BaseLayout } from './base-layout';

export interface PasswordResetProps {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function PasswordResetTemplate({ name, resetUrl, expiresInMinutes }: PasswordResetProps) {
  return (
    <BaseLayout preview="Redefina sua senha">
      <Heading>Olá, {name}!</Heading>
      <Text>
        Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma
        nova senha. O link expira em {expiresInMinutes} minutos.
      </Text>
      <Button
        href={resetUrl}
        style={{
          backgroundColor: '#2563eb',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '6px',
          textDecoration: 'none',
        }}
      >
        Redefinir senha
      </Button>
      <Text style={{ color: '#71717a', fontSize: '12px' }}>
        Se você não solicitou a redefinição de senha, ignore este email.
      </Text>
    </BaseLayout>
  );
}
