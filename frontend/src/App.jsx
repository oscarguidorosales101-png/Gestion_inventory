import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './guards/AuthGuard';
import { LoginPage } from './pages/LoginPage';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <AuthProvider>
      <AuthGuard fallback={<LoginPage />}>
        <AppRoutes />
      </AuthGuard>
    </AuthProvider>
  );
}

export default App;

