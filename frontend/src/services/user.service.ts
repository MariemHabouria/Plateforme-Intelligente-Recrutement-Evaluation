import api from './api';

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  departement?: string;
  poste?: string;
  telephone?: string;
  actif: boolean;
  mustChangePassword: boolean;
  dernierConnexion?: string;
  createdAt: string;
  directionId?: string;    
    typePosteId?: string;     
  direction?: {              
    id: string;
    code: string;
    nom: string;
  };
}

export interface CreateUserData {
  email: string;
  nom: string;
  prenom: string;
  role: string;
  departement?: string;
  poste?: string;
  telephone?: string;
  directionId?: string;      
   typePosteId?: string; 
}

export interface UpdateUserData {
  nom?: string;
  prenom?: string;
  departement?: string;
  poste?: string;
  telephone?: string;
  actif?: boolean;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const userService = {
  /**
   * Récupérer tous les utilisateurs
   */
  async getUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data.users || response.data.data || [];
  },

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data.user || response.data.data;
  },

  /**
   * Récupérer l'utilisateur connecté
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error) {
      console.error('Erreur getCurrentUser:', error);
      throw error;
    }
  },

  /**
   * Créer un nouvel utilisateur (Super Admin uniquement)
   */
  async createUser(data: CreateUserData): Promise<User> {
    const response = await api.post('/auth/register', data);
    return response.data.user || response.data.data;
  },

  // Mettre à jour un utilisateur
async updateUser(id: string, data: Partial<CreateUserData>): Promise<User> {
  const response = await api.put(`/users/${id}`, data);  // PATCH → PUT
  return response.data.user || response.data.data;
},

// Activer/Désactiver
async toggleUserStatus(id: string): Promise<{ actif: boolean }> {
  const response = await api.patch(`/users/${id}/toggle-status`);
  return { actif: response.data.actif };  // extraire directement actif
},

  /**
   * Renvoyer l'invitation (nouveau mot de passe temporaire)
   */
  async resendInvite(id: string): Promise<void> {
    try {
      await api.post(`/users/${id}/resend-invite`);
    } catch (error) {
      console.error('Erreur resendInvite:', error);
      throw error;
    }
  },

  /**
   * Réinitialiser le mot de passe (admin)
   */
  async resetPassword(id: string): Promise<void> {
    try {
      await api.post(`/users/${id}/reset-password`);
    } catch (error) {
      console.error('Erreur resetPassword:', error);
      throw error;
    }
  },

  /**
   * Changer son propre mot de passe (utilisateur connecté)
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      await api.patch('/auth/change-password', data);
    } catch (error) {
      console.error('Erreur changePassword:', error);
      throw error;
    }
  },

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(id: string): Promise<void> {
    try {
      await api.delete(`/users/${id}`);
    } catch (error) {
      console.error('Erreur deleteUser:', error);
      throw error;
    }
  },
  async updateOwnProfile(data: {
  nom?: string;
  prenom?: string;
  telephone?: string;
  departement?: string;
  poste?: string;
}): Promise<User> {
  const response = await api.patch('/users/profile', data);
  return response.data.user;
}
};