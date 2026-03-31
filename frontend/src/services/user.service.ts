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
}

export const userService = {
  // Récupérer tous les utilisateurs
  async getUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data.users || response.data.data || [];
  },

  // Récupérer un utilisateur
  async getUserById(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data.user || response.data.data;
  },

  // Créer un utilisateur
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

  // Renvoyer l'invitation
  async resendInvite(id: string): Promise<void> {
    await api.post(`/users/${id}/resend-invite`);
  },

  // Réinitialiser mot de passe
  async resetPassword(id: string): Promise<void> {
    await api.post(`/users/${id}/reset-password`);
  },

  // Supprimer un utilisateur
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }
};