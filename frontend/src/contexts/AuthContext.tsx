import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ forcePasswordChange?: boolean }>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mapping des rôles
const roleMap: Record<string, string> = {
  'SUPER_ADMIN': 'superadmin',
  'MANAGER': 'manager',
  'DIRECTEUR': 'directeur',
  'DRH': 'rh',
  'DAF': 'daf',
  'DGA': 'dga',
  'DG': 'dga',
  'RESP_PAIE': 'paie'
};

// Routes par défaut (utilisées seulement pour le login)
const DEFAULT_ROUTES: Record<string, string> = {
  superadmin: '/admin/users',
  manager: '/demandes',
  directeur: '/validations',
  rh: '/validations',
  daf: '/validations',
  dga: '/validations',
  paie: '/evaluations'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fonction pour rafraîchir les données de l'utilisateur
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const freshUser = response.data.user;
      
      // Normaliser le rôle si nécessaire
      if (freshUser.role && roleMap[freshUser.role]) {
        freshUser.role = roleMap[freshUser.role];
      }
      
      setUser(freshUser);
      localStorage.setItem('user', JSON.stringify(freshUser));
      console.log('✅ Utilisateur rafraîchi:', freshUser.prenom, freshUser.nom);
    } catch (error) {
      console.error('❌ Erreur refreshUser:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);

    // ÉCOUTEUR D'ÉVÉNEMENTS
    const handleUserUpdate = (event: CustomEvent) => {
      console.log('🔄 Événement userUpdated reçu');
      
      if (event.detail) {
        setUser(event.detail);
        localStorage.setItem('user', JSON.stringify(event.detail));
        console.log('✅ Utilisateur mis à jour via événement');
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
      
      const normalizedRole = roleMap[response.data.user.role] || 'candidat';
      
      const userData: User = {
        ...response.data.user,
        role: normalizedRole
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
        
        // DÉCLENCHER L'ÉVÉNEMENT POUR METTRE À JOUR LA SIDEBAR
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
        
        // NE PAS REDIRIGER - L'UTILISATEUR RESTE SUR LA MÊME PAGE
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur changement mot de passe');
    }
  };

  const logout = () => {
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
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};