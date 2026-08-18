// ── Roteamento principal da aplicação ────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { homeDoUsuario } from './lib/perfil';

import LoginPage from './pages/LoginPage';
import AlinareFormPage from './pages/AlinareFormPage';
import NovitahFormPage from './pages/NovitahFormPage';

import AdminLayout from './components/admin/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import ListPage from './pages/ListPage';
import StatusPage from './pages/StatusPage';
import UsuariosPage from './pages/UsuariosPage';

/** Redireciona a raiz para a home do usuário (ou login). */
function RaizRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={user ? homeDoUsuario(user) : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '14px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
          },
          success: { iconTheme: { primary: '#16A34A', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#DC2626', secondary: '#FFFFFF' } },
        }}
      />

      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Área admin (layout com sidebar dinâmica) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute telas={['dashboard-geral', 'dashboard-alinare', 'dashboard-novitah']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="lista"
              element={
                <ProtectedRoute telas={['lista-geral', 'lista-alinare', 'lista-novitah']}>
                  <ListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="status"
              element={
                <ProtectedRoute telas={['status']}>
                  <StatusPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="usuarios"
              element={
                <ProtectedRoute telas={['usuarios']}>
                  <UsuariosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="alinare"
              element={
                <ProtectedRoute telas={['formulario-alinare']}>
                  <AlinareFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="novitah"
              element={
                <ProtectedRoute telas={['formulario-novitah']}>
                  <NovitahFormPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Redirecionamentos legados de conveniência */}
          <Route path="/alinare" element={<Navigate to="/admin/alinare" replace />} />
          <Route path="/novitah" element={<Navigate to="/admin/novitah" replace />} />

          <Route path="/" element={<RaizRedirect />} />
          <Route path="*" element={<RaizRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
