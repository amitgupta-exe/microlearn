
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface MultiAuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string, role: 'admin' | 'learner') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  learnerLogin: (phone: string) => Promise<{ error: any }>;
}

const MultiAuthContext = createContext<MultiAuthContextType | undefined>(undefined);

export const MultiAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always start fresh - no session persistence
    console.log('🔄 Starting fresh authentication session');
    setUser(null);
    setUserRole(null);
    setLoading(false);
  }, []);

  /**
   * Sign in for admin users
   */
  const signIn = async (email: string, password: string, role: 'admin' | 'learner') => {
    console.log('🔐 Attempting to sign in:', email, 'as role:', role);
    setLoading(true);

    try {
      if (role === 'admin') {
        console.log('👤 Admin login attempt via Supabase');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('❌ Supabase login error:', error);
          setLoading(false);
          return { error };
        }

        console.log('📋 Supabase login result:', data);

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
          setUser(data.user);
          setUserRole(userData.role);
          console.log('✅ Supabase login successful for:', email);
        }
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
   * Learner login using phone number
   */
  const learnerLogin = async (phone: string) => {
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

      // Create or get user record for learner
      const learnerEmail = `${phone}@autogen.com`;
      let userData = null;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', learnerEmail)
        .single();

      if (existingUser) {
        userData = existingUser;
      } else {
        // Create new user record
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            name: learnerData.name,
            email: learnerEmail,
            phone: phone,
            role: 'learner'
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Failed to create user record:', createError);
          setLoading(false);
          return { error: createError };
        }
        
        userData = newUser;
      }

      console.log('✅ Learner login successful:', userData);
      setUser({
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        user_metadata: { full_name: userData.name }
      } as User);
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
   * Sign out
   */
  const signOut = async () => {
    console.log('👋 Signing out...');
    setLoading(true);
    
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);
      console.log('✅ Sign out complete');
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
