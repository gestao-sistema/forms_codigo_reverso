import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// ── Mocks ───────────────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('../services/authService', () => ({
  default: {
    login: vi.fn(),
    logout: vi.fn(),
    getSessao: vi.fn(),
    onMudancaSessao: vi.fn(() => () => {}),
    listarUsuarios: vi.fn(),
    criarUsuario: vi.fn(),
    atualizarUsuario: vi.fn(),
    removerUsuario: vi.fn(),
    alterarSenha: vi.fn(),
  },
  AuthError: class AuthError extends Error {},
}));

vi.mock('../services/apiService', () => ({
  default: {
    createSolicitacao: vi.fn(),
    getSolicitacoes: vi.fn(() => Promise.resolve([])),
    updateSolicitacao: vi.fn(),
    getSolicitacaoById: vi.fn(),
    deleteSolicitacao: vi.fn(),
  },
}));

// DatePicker real quebra em jsdom sem CSS/DOM completo — mock simples
vi.mock('react-datepicker', () => ({
  default: ({ onChange, id }: { onChange: (d: Date | null) => void; id?: string }) => (
    <input
      id={id}
      data-testid="datepicker"
      type="date"
      onChange={(e) => (e.target.value ? onChange(new Date(e.target.value)) : onChange(null))}
    />
  ),
  registerLocale: vi.fn(),
}));

import authService from '../services/authService';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import AlinareFormPage from '../pages/AlinareFormPage';
import { AuthError } from '../services/authService';

// ── Helpers ─────────────────────────────────────────────────────────────────────

function renderWithAuth(
  ui: React.ReactNode,
  sessao: null | { id: string; nome: string; usuario: string; telas: string[] } = null
) {
  (authService.getSessao as ReturnType<typeof vi.fn>).mockResolvedValue(sessao);
  (authService.onMudancaSessao as ReturnType<typeof vi.fn>).mockReturnValue(() => {});
  return render(
    <MemoryRouter>
      <AuthProvider>
        {ui}
        <Toaster />
      </AuthProvider>
    </MemoryRouter>
  );
}

const sessaoAdmin = { id: '1', nome: 'Admin', usuario: 'admin', telas: ['usuarios', 'dashboard-geral', 'formulario-alinare'] };
const sessaoAlinare = { id: '2', nome: 'Alinare User', usuario: 'alinare', telas: ['dashboard-alinare', 'formulario-alinare', 'kanban'] };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// ── ProtectedRoute ──────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
  it('sem sessão: não renderiza children (redireciona p/ login)', async () => {
    renderWithAuth(<ProtectedRoute><div>conteúdo secreto</div></ProtectedRoute>, null);
    // aguarda isLoading terminar
    await waitFor(() => {
      expect(screen.queryByText('conteúdo secreto')).not.toBeInTheDocument();
    });
  });

  it('com sessão ADMIN: renderiza children', async () => {
    renderWithAuth(<ProtectedRoute><div>conteúdo secreto</div></ProtectedRoute>, sessaoAdmin);
    expect(await screen.findByText('conteúdo secreto')).toBeInTheDocument();
  });

  it('perfil não autorizado: redireciona e não renderiza children', async () => {
    renderWithAuth(
      <ProtectedRoute telas={['dashboard-geral']}>
        <div>só dashboard geral</div>
      </ProtectedRoute>,
      sessaoAlinare // tem dashboard-alinare, mas não dashboard-geral
    );
    await waitFor(() => {
      expect(screen.queryByText('só dashboard geral')).not.toBeInTheDocument();
    });
  });

  it('perfil autorizado: renderiza children', async () => {
    renderWithAuth(
      <ProtectedRoute telas={['dashboard-alinare']}>
        <div>só dashboard alinare</div>
      </ProtectedRoute>,
      sessaoAlinare
    );
    expect(await screen.findByText('só dashboard alinare')).toBeInTheDocument();
  });

  it('admin (tela usuarios) acessa qualquer rota', async () => {
    renderWithAuth(
      <ProtectedRoute telas={['dashboard-geral']}>
        <div>admin pode entrar</div>
      </ProtectedRoute>,
      sessaoAdmin
    );
    expect(await screen.findByText('admin pode entrar')).toBeInTheDocument();
  });
});

// ── LoginPage ───────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  it('renderiza campos usuário, senha e botão Entrar', () => {
    renderWithAuth(<LoginPage />);
    expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('credenciais inválidas: mostra mensagem de erro', async () => {
    (authService.login as ReturnType<typeof vi.fn>).mockRejectedValue(
      new AuthError('Usuário ou senha inválidos.')
    );

    renderWithAuth(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/usuário/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    // mensagem aparece tanto no <p> de erro do form quanto no toast
    expect(await screen.findAllByText('Usuário ou senha inválidos.')).toHaveLength(2);
  });

  it('login com campos vazios: HTML required bloqueia submit (validation)', () => {
    renderWithAuth(<LoginPage />);
    const form = screen.getByRole('button', { name: /entrar/i }).closest('form')!;
    expect(form).toBeInTheDocument();
    // inputs têm required
    expect(screen.getByLabelText(/usuário/i)).toBeRequired();
    expect(screen.getByLabelText(/senha/i)).toBeRequired();
  });
});

// ── ReverseLogisticsForm (via AlinareFormPage) ──────────────────────────────────

describe('ReverseLogisticsForm — validação', () => {
  it('submit vazio: mostra erros de campos obrigatórios', async () => {
    renderWithAuth(<AlinareFormPage />, sessaoAdmin);

    const submit = screen.getByRole('button', { name: /enviar solicitação/i });
    fireEvent.click(submit);

    // aguarda mensagens role=alert aparecerem
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('motivo "Outros": revela textarea de justificativa', async () => {
    renderWithAuth(<AlinareFormPage />, sessaoAdmin);

    const motivoSelect = screen.getByLabelText(/motivo/i);
    await userEvent.selectOptions(motivoSelect, 'Outros');

    expect(screen.getByLabelText(/justifique/i)).toBeInTheDocument();
  });

  it('motivo diferente de "Outros": justificativa escondida', async () => {
    renderWithAuth(<AlinareFormPage />, sessaoAdmin);

    const motivoSelect = screen.getByLabelText(/motivo/i);
    await userEvent.selectOptions(motivoSelect, 'Outros');
    await userEvent.selectOptions(motivoSelect, 'Peça com defeito');

    const just = screen.queryByLabelText(/justifique/i);
    // campo existe no DOM mas está aria-hidden / invisível (max-h-0 opacity-0)
    if (just) {
      expect(just.closest('div[aria-hidden="true"]')).not.toBeNull();
    } else {
      expect(just).toBeNull();
    }
  });

  it('todos os campos válidos: submit não mostra erros', async () => {
    renderWithAuth(<AlinareFormPage />, sessaoAdmin);

    fireEvent.change(screen.getByTestId('datepicker'), { target: { value: '2024-01-15' } });
    fireEvent.change(screen.getByLabelText(/solicitante/i), { target: { value: 'Maria Silva' } });
    await userEvent.selectOptions(screen.getByLabelText(/setor/i), 'Comercial Alinare');
    fireEvent.change(screen.getByLabelText(/código da cliente/i), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText(/nome da cliente/i), { target: { value: 'Cliente Teste' } });
    fireEvent.change(screen.getByLabelText(/endereço de postagem/i), {
      target: { value: 'Rua das Flores, 123, Centro, São Paulo/SP' },
    });
    await userEvent.selectOptions(screen.getByLabelText(/motivo/i), 'Peça com defeito');
    await userEvent.selectOptions(screen.getByLabelText(/autorização do reverso/i), 'Joice Mendes');

    fireEvent.click(screen.getByRole('button', { name: /enviar solicitação/i }));

    await waitFor(() => {
      const alerts = screen.queryAllByRole('alert');
      expect(alerts).toHaveLength(0);
    });
  });
});
