import api from './api';

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  anciennesValeurs?: any;
  nouvellesValeurs?: any;
  ipAdresse?: string;
  userAgent?: string;
  createdAt: string;
  acteur?: { id: string; nom: string; prenom: string } | null;
}

export interface AuditFilters {
  page?: number;
  limit?: number;
  acteurId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface AuditStats {
  total: number;
  todayCount: number;
  distinctActeurs: number;
  byAction: { action: string; count: number }[];
  byEntityType: { entityType: string; count: number }[];
  byDay: { date: string; count: number }[];
}

export const auditService = {
  getLogs: async (filters: AuditFilters) => {
    const response = await api.get('/audit-logs', { params: filters });
    return response.data.data as { logs: AuditLogEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
  },
  getStats: async () => {
    const response = await api.get('/audit-logs/stats');
    return response.data.data as AuditStats;
  },
  exportCsv: async (filters: AuditFilters) => {
    const response = await api.get('/audit-logs/export', { params: filters, responseType: 'blob' });
    return response.data as Blob;
  }
};