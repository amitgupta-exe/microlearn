
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/lib/types';
import { useNavigate } from "react-router-dom";

interface MultiAuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  learnerLogin: (phone: string, password: string) => Promise<{ error: any }>;
  signInSuperAdmin: (password: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const MultiAuthContext = createContext<MultiAuthContextType | undefined>(undefined);

export const MultiAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // useEffect(() => {
  //   // Always start fresh - no session persistence
  //   console.log('🔄 Starting fresh authentication session (no cache)');
  //   setUser(null);
  //   setUserRole(null);
  //   setLoading(false);
  // }, []);

  // useEffect to get the user from the database, Session Persistence
  useEffect(() => {
    setLoading(true);
    // Check for superadmin session first (hardcode)
    const isSuperAdminLoggedIn = localStorage.getItem('isSuperAdminLoggedIn');
    if (isSuperAdminLoggedIn === 'true') {
      setUser({
        id: 'superadmin',
        email: 'superadmin@system.com',
        name: 'Super Admin',
        role: 'superadmin'
      });
      setUserRole('superadmin');
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch user info from your users table
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: userData, error }) => {
            if (!error && userData) {
              setUser(userData);
              setUserRole(userData.role);
            }
            setLoading(false);
          });
      } else {
        setUser(null);
        setUserRole(null);
        setLoading(false);
      }
    });
  }, []);

  /**
   * Sign in for admin users
   */
  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting to sign in:', email);
    setLoading(true);

    try {
      // Regular admin login via Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Supabase login error:', error);
        setLoading(false);
        return { error };
      }

      if (data.user) {
        // Check if user exists in users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          console.error('❌ User not found in users table:', userError);
          await supabase.auth.signOut();
          setLoading(false);
          return { error: { message: 'User not found or not authorized' } };
        }

        console.log('✅ Found existing admin user:', userData);
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          phone: userData.phone || undefined,
          role: userData.role as UserRole
        });
        setUserRole(userData.role as UserRole);
        console.log('✅ Admin login successful for:', email);
      }

      setLoading(false);
      return { error: null };
    } catch (error) {
      console.error('💥 Login exception:', error);
      setLoading(false);
      return { error };
    }
  };

  /**
   * Super Admin login with hardcoded credentials
   */
  const signInSuperAdmin = async (password: string) => {
    console.log('🔐 Attempting super admin login');
    setLoading(true);

    try {
      if (password === 'superadmin') {
        setUser({
          id: 'superadmin',
          email: 'superadmin@system.com',
          name: 'Super Admin',
          role: 'superadmin'
        });
        setUserRole('superadmin');
        localStorage.setItem('isSuperAdminLoggedIn', 'true');
        setLoading(false);
        return { error: null };
      } else {
        setLoading(false);
        return { error: { message: 'Invalid password' } };
      }
    } catch (error) {
      console.error('💥 Super admin login exception:', error);
      setLoading(false);
      return { error };
    }
  };

  /**
   * Learner login using phone number and password
   */
  const learnerLogin = async (phone: string, password: string) => {
    console.log('📱 Attempting learner login:', phone);
    setLoading(true);

    try {
      // Check if learner exists
      const { data: learnerData, error: learnerError } = await supabase
        .from('learners')
        .select('*')
        .eq('phone', phone)
        .single();

      if (learnerError || !learnerData) {
        console.error('❌ Learner not found:', learnerError);
        setLoading(false);
        return { error: { message: 'Learner not found with this phone number' } };
      }

      // For simplicity, password is the phone number without country code
      const expectedPassword = phone.replace(/^\+?[0-9]{1,3}/, '');
      if (password !== expectedPassword && password !== phone) {
        console.error('❌ Invalid password for learner');
        setLoading(false);
        return { error: { message: 'Invalid password' } };
      }

      console.log('✅ Learner login successful:', learnerData);
      setUser({
        id: learnerData.id,
        email: learnerData.email,
        name: learnerData.name,
        phone: learnerData.phone,
        role: 'learner'
      });
      setUserRole('learner');

      setLoading(false);
      return { error: null };
    } catch (error) {
      console.error('💥 Learner login exception:', error);
      setLoading(false);
      return { error };
    }
  };

  /**
   * Sign up for new admin users
   */
  const signUp = async (email: string, password: string, name: string) => {
    console.log('📝 Attempting to sign up:', email);
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name,
          }
        }
      });

      if (error) {
        console.error('❌ Signup error:', error);
        setLoading(false);
        return { error };
      }

      if (data.user) {
        // Create user record
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            name,
            email,
            role: 'admin'
          });

        if (userError) {
          console.error('❌ Error creating user record:', userError);
        }
      }

      setLoading(false);
      return { error: null };
    } catch (error) {
      console.error('💥 Signup exception:', error);
      setLoading(false);
      return { error };
    }
  };

  /**
   * Reset password
   */
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    console.log('👋 Signing out...');
    setLoading(true);

    try {
      // Remove superadmin session if present
      localStorage.removeItem('isSuperAdminLoggedIn');
      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);
      console.log('✅ Sign out complete');
      navigate("/");

    } catch (error) {
      console.error('❌ Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MultiAuthContext.Provider value={{
      user,
      userRole,
      loading,
      signIn,
      signOut,
      signUp,
      learnerLogin,
      signInSuperAdmin,
      resetPassword,
    }}>
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
