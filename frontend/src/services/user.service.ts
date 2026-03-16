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
}

export interface CreateUserData {
  email: string;
  nom: string;
  prenom: string;
  role: string;
  departement?: string;
  poste?: string;
  telephone?: string;
}

export const userService = {
  // Récupérer tous les utilisateurs
  async getUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data.users;
  },

  // Récupérer un utilisateur
  async getUserById(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data.user;
  },

  // Créer un utilisateur
  async createUser(data: CreateUserData): Promise<User> {
    const response = await api.post('/auth/register', data);
    return response.data.user;
  },

  // Mettre à jour un utilisateur
  async updateUser(id: string, data: Partial<CreateUserData>): Promise<User> {
    const response = await api.put(`/users/${id}`, data);
    return response.data.user;
  },

  // Activer/Désactiver
  async toggleUserStatus(id: string): Promise<{ actif: boolean }> {
    const response = await api.patch(`/users/${id}/toggle-status`);
    return response.data;
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