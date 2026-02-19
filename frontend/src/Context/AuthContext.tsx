import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { UserProfile } from "../types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// FIX 1: Set default loading to FALSE so the app renders even if the Provider fails
const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: false, 
  signOut: async () => {}, 
  refreshProfile: async () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // FIX 2: Start as FALSE. We load in the background. No blocking spinner.
  const [loading, setLoading] = useState(false); 

  const fetchProfile = async (userId: string) => {
    try {
      if (!supabase) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error("Profile fetch failed:", err);
    }
  };

  useEffect(() => {
    if (!supabase) return;

    // Run auth check in background
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signOut, 
      refreshProfile: () => user ? fetchProfile(user.id) : Promise.resolve() 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);