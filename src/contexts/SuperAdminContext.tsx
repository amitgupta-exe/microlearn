
import React, { createContext, useContext, useState } from 'react';

interface SuperAdminContextType {
  isSuperAdmin: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => {
    return localStorage.getItem('superadmin') === 'true';
  });

  const login = (username: string, password: string): boolean => {
    if (username === 'superadmin' && password === 'superadmin') {
      setIsSuperAdmin(true);
      localStorage.setItem('superadmin', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsSuperAdmin(false);
    localStorage.removeItem('superadmin');
  };

  return (
    <SuperAdminContext.Provider value={{ isSuperAdmin, login, logout }}>
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};
