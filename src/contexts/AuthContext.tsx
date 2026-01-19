import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types/pharmacy';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (mobile: string, password: string) => Promise<boolean>;
  signup: (mobile: string, password: string, name?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void; // For demo/testing
}

const AuthContext = createContext<AuthContextType | null>(null);

// Demo users for testing
const DEMO_USERS: Record<string, User> = {
  owner: {
    id: '1',
    name: 'Rajesh Kumar',
    mobile: '9876543210',
    role: 'owner',
    shopId: 'shop1',
  },
  staff: {
    id: '2',
    name: 'Amit Sharma',
    mobile: '9876543211',
    role: 'staff',
    shopId: 'shop1',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    const savedUser = localStorage.getItem('pharma_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);
  const API = (import.meta.env.VITE_API_URL as string) || '';
  const { toast } = useToast();

  const login = async (mobile: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.debug('Auth login', { mobile });
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const { user: u, token } = json;
        setUser(u);
        localStorage.setItem('pharma_user', JSON.stringify(u));
        localStorage.setItem('pharma_token', token);
        toast({ title: 'Logged in', description: `Welcome ${u.name || u.mobile}` });
        setIsLoading(false);
        return true;
      }
      toast({ title: 'Login failed', description: json?.error || 'Invalid credentials', variant: 'destructive' });
      setIsLoading(false);
      return false;
    } catch (err) {
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (mobile: string, password: string, name?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.debug('Auth signup', { mobile, name });
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password, name }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const { user: u, token } = json;
        setUser(u);
        localStorage.setItem('pharma_user', JSON.stringify(u));
        localStorage.setItem('pharma_token', token);
        toast({ title: 'Account created', description: `Welcome ${u.name || u.mobile}` });
        setIsLoading(false);
        return true;
      }
      toast({ title: 'Signup failed', description: json?.error || 'Unable to create account', variant: 'destructive' });
      setIsLoading(false);
      return false;
    } catch (err) {
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pharma_user');
    localStorage.removeItem('pharma_token');
  };

  const switchRole = (role: UserRole) => {
    if (user) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem('pharma_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
