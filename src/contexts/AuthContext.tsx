import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "admin" | "afiliado";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  displayName: string;
  countryLock: string | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [countryLock, setCountryLock] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch role and profile using setTimeout to avoid deadlock
          setTimeout(async () => {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .single();
            setRole((roleData?.role as AppRole) ?? "afiliado");

            const { data: profileData } = await supabase
              .from("profiles")
              .select("display_name, country_lock")
              .eq("user_id", session.user.id)
              .single();
            setDisplayName(profileData?.display_name ?? session.user.email ?? "");
            setCountryLock((profileData as any)?.country_lock ?? null);
          }, 0);
        } else {
          setRole(null);
          setDisplayName("");
          setCountryLock(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setDisplayName("");
    setCountryLock(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, displayName, countryLock, loading, isAdmin: role === "admin", signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
