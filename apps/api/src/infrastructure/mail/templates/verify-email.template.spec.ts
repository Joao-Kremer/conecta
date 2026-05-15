import { render } from '@react-email/render';
import React from 'react';

import { VerifyEmailTemplate } from './verify-email.template';

describe('VerifyEmailTemplate', () => {
  it('renders without errors', async () => {
    const html = await render(
      React.createElement(VerifyEmailTemplate, {
        name: 'João',
        verifyUrl: 'http://localhost:3000/verify-email?token=abc',
        expiresInHours: 24,
      }),
    );
    expect(html).toContain('João');
    expect(html).toContain('http://localhost:3000/verify-email?token=abc');
  });
});
