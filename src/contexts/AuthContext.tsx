import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types/pharmacy';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (mobile: string, otp: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void; // For demo purposes
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

  const login = async (mobile: string, _otp: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Demo: any mobile starting with 9 logs in as owner, others as staff
    const role = mobile.startsWith('9') ? 'owner' : 'staff';
    const demoUser = DEMO_USERS[role];
    
    const loggedInUser = {
      ...demoUser,
      mobile,
      name: role === 'owner' ? 'Rajesh Kumar' : 'Amit Sharma',
    };

    setUser(loggedInUser);
    localStorage.setItem('pharma_user', JSON.stringify(loggedInUser));
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pharma_user');
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
