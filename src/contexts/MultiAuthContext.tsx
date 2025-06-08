
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { normalizePhoneNumber } from '@/lib/utils';
import { UserRole, User } from '@/lib/types';

interface MultiAuthContextProps {
  user: User | null;
  userRole: UserRole | null;
  userProfile: User | null;
  loading: boolean;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any | null }>;
  signIn: (identifier: string, password: string, role: UserRole) => Promise<{ error: any | null }>;
  signInLearner: (phone: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any | null }>;
}

const MultiAuthContext = createContext<MultiAuthContextProps | undefined>(undefined);

export const MultiAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Fetch user profile from our users table
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          
          if (profile && !error) {
            const userProfile: User = {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              role: profile.role as UserRole,
              created_at: profile.created_at,
              updated_at: profile.updated_at,
            };
            
            setUser(userProfile);
            setUserProfile(userProfile);
            setUserRole(profile.role as UserRole);
          }
        } else {
          setUser(null);
          setUserProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    const getSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        // Trigger the auth state change manually for existing sessions
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();
        
        if (profile) {
          const userProfile: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            role: profile.role as UserRole,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          };
          
          setUser(userProfile);
          setUserProfile(userProfile);
          setUserRole(profile.role as UserRole);
          setSession(currentSession);
        }
      }
      setLoading(false);
    };

    getSession();

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
          },
        },
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error };
    }
  };

  const signIn = async (identifier: string, password: string, role: UserRole) => {
    try {
      if (role === 'superadmin') {
        // Handle superadmin with hardcoded credentials
        if (identifier === 'superadmin' && password === 'superadmin') {
          // Fetch the superadmin user from our users table
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'superadmin@system.com')
            .eq('role', 'superadmin')
            .single();
          
          if (error || !profile) {
            throw new Error('Superadmin user not found');
          }
          
          // Create a mock session for superadmin
          const userProfile: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            role: profile.role as UserRole,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          };
          
          setUser(userProfile);
          setUserProfile(userProfile);
          setUserRole('superadmin');
          
          // Store in localStorage for persistence
          localStorage.setItem('superadmin_session', JSON.stringify(userProfile));
          
          return { error: null };
        } else {
          throw new Error('Invalid superadmin credentials');
        }
      } else if (role === 'admin') {
        // For admin, use regular Supabase auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });
        
        if (error) throw error;
        
        // Check if user is admin
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .eq('role', 'admin')
          .single();
        
        if (!profile) {
          await supabase.auth.signOut();
          throw new Error('User is not an admin');
        }
        
        return { error: null };
      }
      
      return { error: new Error('Invalid role') };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  };

  const signInLearner = async (phone: string, password: string) => {
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      
      // For demo purposes, allow phone number as password
      if (password !== normalizedPhone) {
        throw new Error('Invalid password');
      }
      
      // Find learner by phone number
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('role', 'learner')
        .single();
      
      if (error || !profile) {
        throw new Error('Invalid phone number or learner not found');
      }
      
      // Create a mock session for learner
      const userProfile: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role as UserRole,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
      
      setUser(userProfile);
      setUserProfile(userProfile);
      setUserRole('learner');
      
      // Store in localStorage for persistence
      localStorage.setItem('learner_session', JSON.stringify(userProfile));
      
      return { error: null };
    } catch (error) {
      console.error('Error signing in learner:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Clear localStorage sessions
      localStorage.removeItem('superadmin_session');
      localStorage.removeItem('learner_session');
      
      // Sign out from Supabase if there's an active session
      if (session) {
        await supabase.auth.signOut();
      }
      
      setUser(null);
      setUserProfile(null);
      setUserRole(null);
      setSession(null);
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

  // Check for stored sessions on load
  useEffect(() => {
    if (!session && !user) {
      const storedSuperAdmin = localStorage.getItem('superadmin_session');
      const storedLearner = localStorage.getItem('learner_session');
      
      if (storedSuperAdmin) {
        const userProfile = JSON.parse(storedSuperAdmin);
        setUser(userProfile);
        setUserProfile(userProfile);
        setUserRole('superadmin');
      } else if (storedLearner) {
        const userProfile = JSON.parse(storedLearner);
        setUser(userProfile);
        setUserProfile(userProfile);
        setUserRole('learner');
      }
    }
  }, [session, user]);

  return (
    <MultiAuthContext.Provider
      value={{
        user,
        userRole,
        userProfile,
        loading,
        session,
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
