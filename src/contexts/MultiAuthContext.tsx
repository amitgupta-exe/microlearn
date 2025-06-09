
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
        console.log('🔄 Initializing auth system...');
        
        // Check for stored sessions first (Super Admin and Learner)
        const storedSuperAdmin = localStorage.getItem('superadmin_session');
        const storedLearner = localStorage.getItem('learner_session');
        
        if (storedSuperAdmin && mounted) {
          const userProfile = JSON.parse(storedSuperAdmin);
          console.log('✅ Restored superadmin session:', userProfile);
          setUser(userProfile);
          setUserProfile(userProfile);
          setUserRole('superadmin');
          setLoading(false);
          return;
        }
        
        if (storedLearner && mounted) {
          const userProfile = JSON.parse(storedLearner);
          console.log('✅ Restored learner session:', userProfile);
          setUser(userProfile);
          setUserProfile(userProfile);
          setUserRole('learner');
          setLoading(false);
          return;
        }

        // Check Supabase session for admin users
        console.log('🔍 Checking Supabase session...');
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Supabase session error:', sessionError);
          toast({
            title: 'Authentication Error',
            description: `Supabase error: ${sessionError.message}`,
            variant: 'destructive',
          });
        }
        
        console.log('📋 Current Supabase session:', currentSession);
        
        if (currentSession?.user && mounted) {
          console.log('👤 Found authenticated user:', currentSession.user.id, currentSession.user.email);
          
          // Try to get user profile from users table
          console.log('🔍 Fetching user profile from database...');
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          
          console.log('📊 User profile query result:', { profile, error: profileError });
          
          if (profile && mounted) {
            const userProfile: User = {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              role: profile.role as UserRole,
              created_at: profile.created_at,
              updated_at: profile.updated_at,
            };
            
            console.log('✅ Setting user profile from database:', userProfile);
            setUser(userProfile);
            setUserProfile(userProfile);
            setUserRole(profile.role as UserRole);
            setSession(currentSession);
          } else if (profileError && mounted) {
            console.log('⚠️ No profile found, this might be expected for new users');
            console.log('Profile error details:', profileError);
            
            // For existing authenticated users without profiles, create a basic profile
            const basicUserProfile: User = {
              id: currentSession.user.id,
              name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Admin User',
              email: currentSession.user.email || '',
              phone: null,
              role: 'admin',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            
            console.log('🔧 Setting basic user profile for authenticated user:', basicUserProfile);
            setUser(basicUserProfile);
            setUserProfile(basicUserProfile);
            setUserRole('admin');
            setSession(currentSession);
          }
        } else {
          console.log('❌ No authenticated user found');
        }
      } catch (error) {
        console.error('💥 Auth initialization error:', error);
        toast({
          title: 'Authentication Error',
          description: `Failed to initialize auth: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive',
        });
      } finally {
        if (mounted) {
          console.log('✅ Auth initialization complete');
          setLoading(false);
        }
      }
    };

    // Set up auth state listener for Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        console.log('🔄 Auth state changed:', event, currentSession?.user?.email);
        setSession(currentSession);
        
        if (event === 'SIGNED_IN' && currentSession?.user) {
          console.log('✅ User signed in via Supabase:', currentSession.user.email);
          
          // Create basic profile for immediate use
          const basicUserProfile: User = {
            id: currentSession.user.id,
            name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Admin User',
            email: currentSession.user.email || '',
            phone: null,
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          setUser(basicUserProfile);
          setUserProfile(basicUserProfile);
          setUserRole('admin');
          
          toast({
            title: 'Welcome!',
            description: `Successfully signed in as ${currentSession.user.email}`,
          });
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
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
      console.log('📝 Attempting to sign up user:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      console.log('📋 Signup result:', { data, error });
      
      if (error) {
        console.error('❌ Signup error:', error);
        toast({
          title: 'Signup Failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }
      
      if (data.user) {
        console.log('✅ User created successfully:', data.user.email);
        toast({
          title: 'Account Created',
          description: 'Your account has been created successfully. You can now sign in.',
        });
      }
      
      return { error: null };
    } catch (error) {
      console.error('💥 Signup exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Signup Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const signIn = async (identifier: string, password: string, role: UserRole) => {
    try {
      console.log('🔐 Attempting to sign in:', identifier, 'as role:', role);
      
      if (role === 'superadmin') {
        console.log('👑 Super admin login attempt');
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
          
          console.log('✅ Super admin login successful');
          setUser(userProfile);
          setUserProfile(userProfile);
          setUserRole('superadmin');
          
          localStorage.setItem('superadmin_session', JSON.stringify(userProfile));
          
          toast({
            title: 'Welcome Super Admin!',
            description: 'Successfully signed in as Super Administrator',
          });
          
          return { error: null };
        } else {
          const error = new Error('Invalid superadmin credentials');
          toast({
            title: 'Invalid Credentials',
            description: 'Invalid superadmin username or password',
            variant: 'destructive',
          });
          return { error };
        }
      } else if (role === 'admin') {
        console.log('👤 Admin login attempt via Supabase');
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });
        
        console.log('📋 Supabase login result:', { data, error });
        
        if (error) {
          console.error('❌ Supabase login error:', error);
          toast({
            title: 'Login Failed',
            description: `${error.message}. Please check your email and password.`,
            variant: 'destructive',
          });
          return { error };
        }
        
        if (data.user) {
          console.log('✅ Supabase login successful for:', data.user.email);
          toast({
            title: 'Welcome!',
            description: `Successfully signed in as ${data.user.email}`,
          });
        }
        
        return { error: null };
      }
      
      return { error: new Error('Invalid role') };
    } catch (error) {
      console.error('💥 Sign in exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Login Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const signInLearner = async (phone: string, password: string) => {
    try {
      console.log('📱 Attempting learner login:', phone);
      const normalizedPhone = normalizePhoneNumber(phone);
      
      if (password !== normalizedPhone) {
        const error = new Error('Invalid password');
        toast({
          title: 'Invalid Credentials',
          description: 'Password must match your phone number',
          variant: 'destructive',
        });
        return { error };
      }
      
      // For testing, allow the test learner
      if (normalizedPhone === '+1234567890' || normalizedPhone === '1234567890') {
        console.log('✅ Test learner login');
        const testLearner: User = {
          id: 'test-learner-id',
          name: 'Test Learner',
          email: 'learner@test.com',
          phone: normalizedPhone,
          role: 'learner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        setUser(testLearner);
        setUserProfile(testLearner);
        setUserRole('learner');
        
        localStorage.setItem('learner_session', JSON.stringify(testLearner));
        
        toast({
          title: 'Welcome!',
          description: 'Successfully signed in as learner',
        });
        
        return { error: null };
      }
      
      // Try to find learner in database
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('role', 'learner')
        .single();
      
      if (error || !profile) {
        console.error('❌ Learner not found:', error);
        toast({
          title: 'Invalid Credentials',
          description: 'Phone number not found or not a learner account',
          variant: 'destructive',
        });
        return { error: new Error('Invalid phone number or learner not found') };
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
      
      console.log('✅ Learner login successful:', userProfile);
      setUser(userProfile);
      setUserProfile(userProfile);
      setUserRole('learner');
      
      localStorage.setItem('learner_session', JSON.stringify(userProfile));
      
      toast({
        title: 'Welcome!',
        description: `Successfully signed in as ${userProfile.name}`,
      });
      
      return { error: null };
    } catch (error) {
      console.error('💥 Learner login exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Login Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('👋 Signing out...');
      
      // Clear localStorage sessions
      localStorage.removeItem('superadmin_session');
      localStorage.removeItem('learner_session');
      
      // Sign out from Supabase if there's a session
      if (session) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('❌ Supabase signout error:', error);
        }
      }
      
      setUser(null);
      setUserProfile(null);
      setUserRole(null);
      setSession(null);
      
      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out',
      });
      
      console.log('✅ Sign out complete');
    } catch (error) {
      console.error('💥 Sign out error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        toast({
          title: 'Reset Password Failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }
      
      toast({
        title: 'Reset Email Sent',
        description: 'Check your email for password reset instructions',
      });
      
      return { error: null };
    } catch (error) {
      console.error('💥 Reset password error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Reset Password Error',
        description: errorMessage,
        variant: 'destructive',
      });
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
