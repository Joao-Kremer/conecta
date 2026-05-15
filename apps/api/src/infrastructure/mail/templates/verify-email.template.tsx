import { Button, Heading, Text } from '@react-email/components';
import React from 'react';

import { BaseLayout } from './base-layout';

export interface VerifyEmailProps {
  name: string;
  verifyUrl: string;
  expiresInHours: number;
}

export function VerifyEmailTemplate({ name, verifyUrl, expiresInHours }: VerifyEmailProps) {
  return (
    <BaseLayout preview="Confirme seu email">
      <Heading>Olá, {name}!</Heading>
      <Text>
        Clique no botão abaixo para confirmar seu email. O link expira em {expiresInHours} horas.
      </Text>
      <Button
        href={verifyUrl}
        style={{
          backgroundColor: '#2563eb',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '6px',
          textDecoration: 'none',
        }}
      >
        Confirmar email
      </Button>
    </BaseLayout>
  );
}
