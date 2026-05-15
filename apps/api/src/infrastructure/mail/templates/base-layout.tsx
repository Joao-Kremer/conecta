import { Body, Container, Head, Hr, Html, Text } from '@react-email/components';
import React from 'react';

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview: _preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4', margin: 0, padding: 0 }}
      >
        <Container
          style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', padding: '24px' }}
        >
          {children}
          <Hr style={{ borderColor: '#e4e4e7', margin: '24px 0' }} />
          <Text style={{ color: '#71717a', fontSize: '12px', textAlign: 'center' }}>
            Conecta — plataforma para escolinhas esportivas
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
