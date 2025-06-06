
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiAuth } from '@/contexts/MultiAuthContext';

export const useRequireAuth = (redirectUrl = '/login') => {
  const { user, userRole, loading: authLoading } = useMultiAuth();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate(redirectUrl);
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading, navigate, redirectUrl]);

  return { user, userRole, loading: authLoading || loading };
};
