import { render } from '@react-email/render';
import React from 'react';

import { PasswordResetTemplate } from './password-reset.template';

describe('PasswordResetTemplate', () => {
  it('renders without errors', async () => {
    const html = await render(
      React.createElement(PasswordResetTemplate, {
        name: 'Maria',
        resetUrl: 'http://localhost:3000/reset-password?token=xyz',
        expiresInMinutes: 30,
      }),
    );
    expect(html).toContain('Maria');
    expect(html).toContain('http://localhost:3000/reset-password?token=xyz');
  });
});
