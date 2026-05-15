import { Button, Heading, Text } from '@react-email/components';
import React from 'react';

import { BaseLayout } from './base-layout';

export interface InviteProps {
  inviterName: string;
  organizationName: string;
  acceptUrl: string;
  role: string;
  expiresInHours: number;
}

export function InviteTemplate({
  inviterName,
  organizationName,
  acceptUrl,
  role,
  expiresInHours,
}: InviteProps) {
  return (
    <BaseLayout preview={`Você foi convidado para ${organizationName}`}>
      <Heading>Você foi convidado!</Heading>
      <Text>
        <strong>{inviterName}</strong> convidou você para participar de{' '}
        <strong>{organizationName}</strong> como <strong>{role}</strong>.
      </Text>
      <Text>
        Clique no botão abaixo para aceitar o convite. O link expira em {expiresInHours} horas.
      </Text>
      <Button
        href={acceptUrl}
        style={{
          backgroundColor: '#2563eb',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '6px',
          textDecoration: 'none',
        }}
      >
        Aceitar convite
      </Button>
    </BaseLayout>
  );
}
