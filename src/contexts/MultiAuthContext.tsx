
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { normalizePhoneNumber } from '@/lib/utils';
import { UserRole } from '@/lib/types';

interface MultiAuthContextProps {
  session: Session | null;
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any | null }>;
  signIn: (email: string, password: string, role: UserRole) => Promise<{ error: any | null }>;
  signInLearner: (phone: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any | null }>;
}

const MultiAuthContext = createContext<MultiAuthContextProps | undefined>(undefined);

export const MultiAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Determine user role from metadata or default to admin
        if (currentSession?.user) {
          const role = currentSession.user.user_metadata?.role || 'admin';
          setUserRole(role);
        } else {
          setUserRole(null);
        }
      }
    );

    const initAuth = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData.session);
        setUser(sessionData.session?.user ?? null);
        
        if (sessionData.session?.user) {
          const role = sessionData.session.user.user_metadata?.role || 'admin';
          setUserRole(role);
        }
      } catch (err) {
        console.error('Error getting session:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'admin',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string, role: UserRole) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Update user metadata with role
      if (data.user) {
        await supabase.auth.updateUser({
          data: { role }
        });
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  };

  const signInLearner = async (phone: string, password: string) => {
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      
      // For learners, we'll use phone as email with a domain
      const learnerEmail = `${normalizedPhone}@learner.local`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: learnerEmail,
        password,
      });
      
      if (error) throw error;
      
      // Update user metadata with role and phone
      if (data.user) {
        await supabase.auth.updateUser({
          data: { 
            role: 'learner',
            phone: normalizedPhone
          }
        });
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error signing in learner:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { error };
    }
  };

  return (
    <MultiAuthContext.Provider
      value={{
        session,
        user,
        userRole,
        loading,
        signUp,
        signIn,
        signInLearner,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </MultiAuthContext.Provider>
  );
};

export const useMultiAuth = () => {
  const context = useContext(MultiAuthContext);
  if (context === undefined) {
    throw new Error('useMultiAuth must be used within a MultiAuthProvider');
  }
  return context;
};
