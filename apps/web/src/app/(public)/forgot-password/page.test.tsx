import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ForgotPasswordPage from './page';

import { renderWithProviders } from '@/test/render';


vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const VALID_ORG_ID = '11111111-1111-4111-8111-111111111111';

function input(container: HTMLElement, name: string): HTMLInputElement {
  const el = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!el) throw new Error(`input[name="${name}"] not found`);
  return el;
}

async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement,
) {
  await user.type(input(container, 'organizationId'), VALID_ORG_ID);
  await user.type(input(container, 'email'), 'user@escolinha.com.br');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ForgotPasswordPage', () => {
  it('shows validation messages when submitting an empty form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);

    await user.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByText('ID da organização inválido')).toBeInTheDocument();
    expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
  });

  it('disables the submit button and shows the submitting label while submitting', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    const { container } = renderWithProviders(<ForgotPasswordPage />);

    await fillValidForm(user, container);
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));

    const button = await screen.findByRole('button', { name: 'Enviando…' });
    expect(button).toBeDisabled();
  });

  it('shows the confirmation screen after a successful submit', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(() => Promise.resolve({ ok: true })) as unknown as typeof fetch;
    const { container } = renderWithProviders(<ForgotPasswordPage />);

    await fillValidForm(user, container);
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByText('Verifique seu e-mail')).toBeInTheDocument();
  });
});
