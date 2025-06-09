
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
        console.log('Initializing auth...');
        
        // Check for stored sessions first
        const storedSuperAdmin = localStorage.getItem('superadmin_session');
        const storedLearner = localStorage.getItem('learner_session');
        
        console.log('Stored superadmin session:', storedSuperAdmin);
        console.log('Stored learner session:', storedLearner);
        
        if (storedSuperAdmin && mounted) {
          const userProfile = JSON.parse(storedSuperAdmin);
          console.log('Restoring superadmin session:', userProfile);
          setUser(userProfile);
          setUserProfile(userProfile);
          setUserRole('superadmin');
          setLoading(false);
          return;
        }
        
        if (storedLearner && mounted) {
          const userProfile = JSON.parse(storedLearner);
          console.log('Restoring learner session:', userProfile);
          setUser(userProfile);
          setUserProfile(userProfile);
          setUserRole('learner');
          setLoading(false);
          return;
        }

        // Check Supabase session for admin users
        console.log('Checking Supabase session...');
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('Current Supabase session:', currentSession);
        
        if (currentSession?.user && mounted) {
          console.log('Found Supabase session for user:', currentSession.user.id);
          
          // Try to get user profile from users table
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          
          console.log('User profile from database:', profile, 'Error:', error);
          
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
            
            console.log('Setting user profile from database:', userProfile);
            setUser(userProfile);
            setUserProfile(userProfile);
            setUserRole(profile.role as UserRole);
            setSession(currentSession);
          } else if (mounted) {
            console.log('No profile found, creating one...');
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

            console.log('Created new profile:', newProfile, 'Error:', insertError);

            if (newProfile && mounted) {
              const userProfile: User = {
                id: newProfile.id,
                name: newProfile.name,
                email: newProfile.email,
                phone: newProfile.phone,
                role: newProfile.role as UserRole,
                created_at: newProfile.created_at,
                updated_at: newProfile.updated_at,
              };
              
              console.log('Setting newly created user profile:', userProfile);
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
          console.log('Auth initialization complete');
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, currentSession);
        setSession(currentSession);
        
        if (currentSession?.user) {
          console.log('User signed in:', currentSession.user.id);
          
          // Try to get or create user profile
          let { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          
          console.log('Profile lookup result:', profile, 'Error:', error);
          
          if (error && error.code === 'PGRST116') {
            console.log('Profile not found, creating new one...');
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

            console.log('Created profile:', newProfile, 'Error:', insertError);
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
            
            console.log('Setting user profile from auth state change:', userProfile);
            setUser(userProfile);
            setUserProfile(userProfile);
            setUserRole(profile.role as UserRole);
          }
        } else {
          console.log('User signed out');
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
      console.log('Attempting to sign up user:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: undefined, // Remove email verification
        },
      });
      
      console.log('Signup result:', data, 'Error:', error);
      
      if (error) {
        console.error('Signup error:', error);
        throw error;
      }
      
      // If signup successful but user needs confirmation, auto-confirm for testing
      if (data.user && !data.session) {
        console.log('User created but needs confirmation, attempting auto-confirm...');
        
        // Try to sign in immediately
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        console.log('Auto sign-in result:', signInData, 'Error:', signInError);
        
        if (signInError) {
          console.log('Auto sign-in failed, user may need email verification');
        }
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error };
    }
  };

  const signIn = async (identifier: string, password: string, role: UserRole) => {
    try {
      console.log('Attempting to sign in:', identifier, 'as role:', role);
      
      if (role === 'superadmin') {
        console.log('Super admin login attempt');
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
          
          console.log('Super admin login successful:', userProfile);
          setUser(userProfile);
          setUserProfile(userProfile);
          setUserRole('superadmin');
          
          localStorage.setItem('superadmin_session', JSON.stringify(userProfile));
          
          return { error: null };
        } else {
          throw new Error('Invalid superadmin credentials');
        }
      } else if (role === 'admin') {
        console.log('Admin login attempt');
        
        // First, try with test credentials
        if (identifier === 'admin@test.com' && password === 'password123') {
          console.log('Using test admin credentials');
          
          // Check if test user exists
          const { data: existingUser } = await supabase.auth.signInWithPassword({
            email: identifier,
            password,
          });
          
          console.log('Test admin login result:', existingUser);
          
          if (existingUser.error) {
            console.log('Test user does not exist, creating...');
            // Create test user
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: identifier,
              password,
              options: {
                data: {
                  full_name: 'Test Admin',
                },
                emailRedirectTo: undefined,
              },
            });
            
            console.log('Test user creation result:', signUpData, 'Error:', signUpError);
            
            if (!signUpError) {
              // Try to sign in again
              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email: identifier,
                password,
              });
              
              console.log('Retry login result:', retryData, 'Error:', retryError);
              
              if (retryError) throw retryError;
            } else {
              throw signUpError;
            }
          }
        } else {
          // Regular admin login
          const { data, error } = await supabase.auth.signInWithPassword({
            email: identifier,
            password,
          });
          
          console.log('Regular admin login result:', data, 'Error:', error);
          
          if (error) throw error;
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
      console.log('Attempting learner login:', phone);
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
      
      console.log('Learner profile lookup:', profile, 'Error:', error);
      
      if (error || !profile) {
        // Create a test learner if not found
        if (normalizedPhone === '+1234567890' || normalizedPhone === '1234567890') {
          console.log('Creating test learner...');
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
          
          return { error: null };
        }
        
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
      
      console.log('Learner login successful:', userProfile);
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
      console.log('Signing out...');
      localStorage.removeItem('superadmin_session');
      localStorage.removeItem('learner_session');
      
      if (session) {
        await supabase.auth.signOut();
      }
      
      setUser(null);
      setUserProfile(null);
      setUserRole(null);
      setSession(null);
      
      console.log('Sign out complete');
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
