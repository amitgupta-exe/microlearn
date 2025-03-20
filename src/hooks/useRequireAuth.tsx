
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const useRequireAuth = (redirectUrl = '/login') => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectUrl);
    }
  }, [user, loading, navigate, redirectUrl]);

  return { user, loading };
};
