import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SignupPage from './page';

import { renderWithProviders } from '@/test/render';


vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function input(container: HTMLElement, name: string): HTMLInputElement {
  const el = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!el) throw new Error(`input[name="${name}"] not found`);
  return el;
}

async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement,
) {
  await user.type(input(container, 'organizationName'), 'Escolinha do Zé');
  await user.type(input(container, 'adminName'), 'João Silva');
  await user.type(input(container, 'email'), 'joao@escolinha.com.br');
  await user.type(input(container, 'password'), 'Senha123');
  await user.click(screen.getByRole('checkbox'));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SignupPage', () => {
  it('shows validation messages when submitting an empty form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupPage />);

    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect((await screen.findAllByText('Mínimo 2 caracteres')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Aceite os termos para continuar')).toBeInTheDocument();
  });

  it('disables the submit button and shows the submitting label while submitting', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    const { container } = renderWithProviders(<SignupPage />);

    await fillValidForm(user, container);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    const button = await screen.findByRole('button', { name: 'Criando conta…' });
    expect(button).toBeDisabled();
  });

  it('shows an error toast when the signup request is not ok', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Erro ao criar conta.' }),
      }),
    ) as unknown as typeof fetch;
    const { container } = renderWithProviders(<SignupPage />);

    await fillValidForm(user, container);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao criar conta.');
    });
  });
});
