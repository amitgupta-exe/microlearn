
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { normalizePhoneNumber } from '@/lib/utils';
import { UserRole, User } from '@/lib/types';

interface MultiAuthContextProps {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setUserProfile(userData);
          setUserRole(userData.role);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Insert directly into users table
      const { data, error } = await supabase
        .from('users')
        .insert({
          email,
          name: fullName,
          role: 'admin',
        })
        .select()
        .single();
      
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
        // Handle superadmin login
        if (identifier === 'superadmin' && password === 'superadmin') {
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'superadmin')
            .eq('email', 'superadmin@system.com')
            .single();
          
          if (error || !user) {
            throw new Error('Superadmin user not found');
          }
          
          setUser(user);
          setUserProfile(user);
          setUserRole('superadmin');
          localStorage.setItem('currentUser', JSON.stringify(user));
          
          return { error: null };
        } else {
          throw new Error('Invalid superadmin credentials');
        }
      } else if (role === 'admin') {
        // Handle admin login - use email as identifier
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', identifier)
          .eq('role', 'admin')
          .single();
        
        if (error || !user) {
          throw new Error('Invalid email or user not found');
        }
        
        // For demo purposes, accept any password for admin
        // In production, you'd verify the password hash
        setUser(user);
        setUserProfile(user);
        setUserRole('admin');
        localStorage.setItem('currentUser', JSON.stringify(user));
        
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
      
      // For learners, password should be their phone number
      if (password !== normalizedPhone) {
        throw new Error('Invalid password');
      }
      
      // Find user by phone number
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('role', 'learner')
        .single();
      
      if (error || !user) {
        throw new Error('Invalid phone number or user not found');
      }
      
      setUser(user);
      setUserProfile(user);
      setUserRole('learner');
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      return { error: null };
    } catch (error) {
      console.error('Error signing in learner:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setUserProfile(null);
      setUserRole(null);
      localStorage.removeItem('currentUser');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // For demo purposes, just return success
      // In production, you'd implement proper password reset
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
