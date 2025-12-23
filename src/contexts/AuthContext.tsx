import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'professional' | 'patient' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role?: AppRole) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Role is now in profiles table
      // Query both id and user_id to handle legacy and new users
      let query = supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();

      let { data: profileData, error } = await query;

      // Self-healing: If profile missing, create it
      if (!profileData && !error) {
        console.warn("Profile missing. Attempting self-healing via create_my_profile...");
        const { error: rpcError } = await supabase.rpc('create_my_profile');
        if (!rpcError) {
          // Retry fetch
          const retry = await supabase
            .from('profiles')
            .select('*')
            .or(`id.eq.${userId},user_id.eq.${userId}`)
            .maybeSingle();
          profileData = retry.data;
          error = retry.error;
        } else {
          console.error("Self-healing failed:", rpcError);
        }
      }

      if (profileData) {
        // Self-fix: If status is missing, update it to pending
        if (!profileData.status) {
          console.warn("Status missing. Self-fixing to 'pending'...");
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ status: 'pending' })
            .eq('id', userId);

          if (!updateError) {
            profileData.status = 'pending';
          } else {
            console.error("Self-fix status failed:", updateError);
          }
        }

        setProfile(profileData);
        // The migration added 'role' column to profiles, so we use it directly
        // Cast to unknown first to avoid TS error if types are outdated
        setRole((profileData as any).role as AppRole);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: AppRole = 'professional') => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
