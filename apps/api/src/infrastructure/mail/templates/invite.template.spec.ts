import { render } from '@react-email/render';
import React from 'react';

import { InviteTemplate } from './invite.template';

describe('InviteTemplate', () => {
  it('renders without errors', async () => {
    const html = await render(
      React.createElement(InviteTemplate, {
        inviterName: 'Carlos',
        organizationName: 'Escolinha do Bairro',
        acceptUrl: 'http://localhost:3000/accept-invite?token=tok123',
        role: 'COACH',
        expiresInHours: 48,
      }),
    );
    expect(html).toContain('Carlos');
    expect(html).toContain('Escolinha do Bairro');
    expect(html).toContain('http://localhost:3000/accept-invite?token=tok123');
  });
});
