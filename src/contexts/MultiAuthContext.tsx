
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

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check for stored sessions first
        const storedSuperAdmin = localStorage.getItem('superadmin_session');
        const storedLearner = localStorage.getItem('learner_session');
        
        if (storedSuperAdmin && mounted) {
          const userProfile = JSON.parse(storedSuperAdmin);
          setUser(userProfile);
          setUserProfile(userProfile);
          setUserRole('superadmin');
          setLoading(false);
          return;
        }
        
        if (storedLearner && mounted) {
          const userProfile = JSON.parse(storedLearner);
          setUser(userProfile);
          setUserProfile(userProfile);
          setUserRole('learner');
          setLoading(false);
          return;
        }

        // Check Supabase session for admin users
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user && mounted) {
          // Try to get user profile from users table
          const { data: profile, error } = await supabase
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
          } else {
            // If no profile exists, create one for the authenticated user
            const { data: newProfile, error: insertError } = await supabase
              .from('users')
              .insert({
                id: currentSession.user.id,
                email: currentSession.user.email || '',
                name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Admin User',
                role: 'admin'
              })
              .select()
              .single();

            if (newProfile) {
              const userProfile: User = {
                id: newProfile.id,
                name: newProfile.name,
                email: newProfile.email,
                phone: newProfile.phone,
                role: newProfile.role as UserRole,
                created_at: newProfile.created_at,
                updated_at: newProfile.updated_at,
              };
              
              setUser(userProfile);
              setUserProfile(userProfile);
              setUserRole(newProfile.role as UserRole);
              setSession(currentSession);
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Try to get or create user profile
          let { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          
          if (error && error.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { data: newProfile, error: insertError } = await supabase
              .from('users')
              .insert({
                id: currentSession.user.id,
                email: currentSession.user.email || '',
                name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Admin User',
                role: 'admin'
              })
              .select()
              .single();

            if (!insertError) {
              profile = newProfile;
            }
          }
          
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
          }
        } else {
          setUser(null);
          setUserProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
        if (identifier === 'superadmin' && password === 'superadmin') {
          const userProfile: User = {
            id: 'a74d030f-6ce0-494e-9c7e-fb55dda882a4',
            name: 'Super Administrator',
            email: 'superadmin@system.com',
            phone: null,
            role: 'superadmin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          setUser(userProfile);
          setUserProfile(userProfile);
          setUserRole('superadmin');
          
          localStorage.setItem('superadmin_session', JSON.stringify(userProfile));
          
          return { error: null };
        } else {
          throw new Error('Invalid superadmin credentials');
        }
      } else if (role === 'admin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });
        
        if (error) throw error;
        
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
      
      if (password !== normalizedPhone) {
        throw new Error('Invalid password');
      }
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('role', 'learner')
        .single();
      
      if (error || !profile) {
        throw new Error('Invalid phone number or learner not found');
      }
      
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
      
      localStorage.setItem('learner_session', JSON.stringify(userProfile));
      
      return { error: null };
    } catch (error) {
      console.error('Error signing in learner:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('superadmin_session');
      localStorage.removeItem('learner_session');
      
      if (session) {
        await supabase.auth.signOut();
      }
      
      setUser(null);
      setUserProfile(null);
      setUserRole(null);
      setSession(null);
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
