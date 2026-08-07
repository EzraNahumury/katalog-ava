'use client';

import { useEffect, useState } from 'react';
import LoginForm from '@/components/admin/LoginForm';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { getToken, clearToken } from '@/lib/auth';

export default function AdminPage() {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTokenState(getToken());
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!token) {
    return <LoginForm onLoggedIn={() => setTokenState(getToken())} />;
  }

  return (
    <AdminDashboard
      token={token}
      onLogout={() => {
        clearToken();
        setTokenState(null);
      }}
    />
  );
}
