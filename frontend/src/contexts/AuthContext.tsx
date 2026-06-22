// frontend/src/contexts/AuthContext.tsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import type { User, Direction } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ forcePasswordChange?: boolean }>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mapping des roles backend -> frontend
const roleMap: Record<string, string> = {
  'SUPER_ADMIN': 'superadmin',
  'MANAGER': 'manager',
  'DIRECTEUR': 'directeur',
  'DRH': 'rh',
  'DAF': 'daf',
  'DGA': 'dga',
  'DG': 'dg',
  'RESP_PAIE': 'paie'
};

// Routes par defaut
const DEFAULT_ROUTES: Record<string, string> = {
  superadmin: '/admin/users',
  manager: '/demandes',
  directeur: '/validations',
  rh: '/validations',
  daf: '/validations',
  dga: '/validations',
  dg: '/validations',
  paie: '/evaluations'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fonction pour rafraichir les donnees de l'utilisateur
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const freshUser = response.data.user;

      const normalizedRole = roleMap[freshUser.role] || freshUser.role;
      
      const normalizedUser = { ...freshUser, role: normalizedRole };
      
      setUser(normalizedUser);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    } catch (error) {
      console.error('Erreur refreshUser:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    console.log('[Auth] Restauration - token present:', !!token);
    console.log('[Auth] Restauration - user present:', !!savedUser);
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('[Auth] Utilisateur restaure:', parsedUser?.email);
        setUser(parsedUser);
      } catch (e) {
        console.error('[Auth] Erreur parsing user:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      console.log('[Auth] Aucun utilisateur en cache');
    }
    setLoading(false);

    // Ecouteur d'evenements
    const handleUserUpdate = (event: CustomEvent) => {
      console.log('[Auth] Evenement userUpdated recu');
      
      if (event.detail) {
        setUser(event.detail);
        localStorage.setItem('user', JSON.stringify(event.detail));
        console.log('[Auth] Utilisateur mis a jour via evenement');
      } else {
        refreshUser();
      }
    };

    window.addEventListener('userUpdated' as any, handleUserUpdate);

    return () => {
      window.removeEventListener('userUpdated' as any, handleUserUpdate);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      console.log('[Auth] Login reussi pour:', response.data.user?.email);
      
      const normalizedRole = roleMap[response.data.user.role] || 'candidat';
      
      const userData: User = {
        ...response.data.user,
        role: normalizedRole,
        directionId: response.data.user.directionId,
        direction: response.data.user.direction
      };
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);

      if (response.data.forcePasswordChange) {
        return { forcePasswordChange: true };
      }

      const defaultRoute = DEFAULT_ROUTES[normalizedRole] || '/dashboard';
      window.location.href = defaultRoute;
      
      return { forcePasswordChange: false };
    } catch (error: any) {
      console.error('[Auth] Erreur login:', error);
      throw new Error(error.response?.data?.message || 'Erreur de connexion');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      
      if (user) {
        const updatedUser = { ...user, mustChangePassword: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur changement mot de passe');
    }
  };

  const logout = () => {
    console.log('[Auth] Deconnexion');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};