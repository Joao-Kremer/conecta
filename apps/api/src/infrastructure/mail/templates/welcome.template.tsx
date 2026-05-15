import { Button, Heading, Text } from '@react-email/components';
import React from 'react';

import { BaseLayout } from './base-layout';

export interface WelcomeProps {
  name: string;
  loginUrl: string;
}

export function WelcomeTemplate({ name, loginUrl }: WelcomeProps) {
  return (
    <BaseLayout preview="Bem-vindo ao Conecta!">
      <Heading>Bem-vindo ao Conecta, {name}!</Heading>
      <Text>
        Sua conta foi verificada com sucesso. Agora você pode acessar a plataforma e começar a
        gerenciar sua escolinha esportiva.
      </Text>
      <Button
        href={loginUrl}
        style={{
          backgroundColor: '#2563eb',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '6px',
          textDecoration: 'none',
        }}
      >
        Acessar plataforma
      </Button>
    </BaseLayout>
  );
}
