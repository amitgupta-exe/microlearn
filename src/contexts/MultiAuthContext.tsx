
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { normalizePhoneNumber } from '@/lib/utils';
import { UserRole, User } from '@/lib/types';

interface MultiAuthContextProps {
  session: Session | null;
  user: SupabaseUser | null;
  userRole: UserRole | null;
  userProfile: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any | null }>;
  signIn: (identifier: string, password: string, role: UserRole) => Promise<{ error: any | null }>;
  signInLearner: (phone: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any | null }>;
}

const MultiAuthContext = createContext<MultiAuthContextProps | undefined>(undefined);

export const MultiAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        } else {
          setUserRole(null);
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    const initAuth = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData.session);
        setUser(sessionData.session?.user ?? null);
        
        if (sessionData.session?.user) {
          await fetchUserProfile(sessionData.session.user.id);
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

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      if (profile) {
        setUserProfile(profile as User);
        setUserRole(profile.role as UserRole);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) throw error;
      
      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            name: fullName,
            email: email,
            role: 'admin',
          });
        
        if (profileError) throw profileError;
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error };
    }
  };

  const signIn = async (identifier: string, password: string, role: UserRole) => {
    try {
      let email = identifier;
      
      // Handle superadmin login
      if (role === 'superadmin') {
        if (identifier === 'superadmin' && password === 'superadmin') {
          email = 'superadmin@system.com';
        } else {
          throw new Error('Invalid credentials');
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Verify user has the correct role
      if (data.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        if (profile && profile.role !== role) {
          await supabase.auth.signOut();
          throw new Error('Invalid role for this user');
        }
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
      
      // Find user by phone number
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('role', 'learner')
        .single();
      
      if (userError || !userProfile) {
        throw new Error('Invalid phone number or user not found');
      }
      
      // For learners, password should be their phone number
      if (password !== normalizedPhone) {
        throw new Error('Invalid password');
      }
      
      // Sign in with email and phone as password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: normalizedPhone,
      });
      
      if (error) throw error;
      
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
      setUserProfile(null);
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
        userProfile,
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
