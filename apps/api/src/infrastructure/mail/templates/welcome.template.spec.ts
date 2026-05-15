import { render } from '@react-email/render';
import React from 'react';

import { WelcomeTemplate } from './welcome.template';

describe('WelcomeTemplate', () => {
  it('renders without errors', async () => {
    const html = await render(
      React.createElement(WelcomeTemplate, {
        name: 'Ana',
        loginUrl: 'http://localhost:3000/login',
      }),
    );
    expect(html).toContain('Ana');
    expect(html).toContain('http://localhost:3000/login');
  });
});
