import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { sendSuccess, sendError } from '../utils/helpers';

// GET /api/audit-logs?page=1&limit=25&acteurId=&action=&entityType=&dateFrom=&dateTo=&search=
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const { acteurId, action, entityType, dateFrom, dateTo, search } = req.query;

    const where: Prisma.AuditLogWhereInput = {};
    if (acteurId) where.acteurId = acteurId as string;
    if (action) where.action = action as string;
    if (entityType) where.entityType = entityType as string;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }
    if (search) {
      where.OR = [
        { action: { contains: search as string, mode: 'insensitive' } },
        { details: { contains: search as string, mode: 'insensitive' } },
        { entityId: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { acteur: { select: { id: true, nom: true, prenom: true } } }
      }),
      prisma.auditLog.count({ where })
    ]);

    sendSuccess(res, {
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });

  } catch (error) {
    console.error('getAuditLogs error:', error);
    sendError(res, "Erreur lors de la récupération du journal d'audit");
  }
};

// GET /api/audit-logs/stats
export const getAuditStats = async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [total, todayCount, byActionRaw, byEntityTypeRaw, distinctActeurs, recentLogs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 8
      }),
      prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { entityType: true },
        orderBy: { _count: { entityType: 'desc' } }
      }),
      prisma.auditLog.findMany({ distinct: ['acteurId'], select: { acteurId: true } }),
      prisma.auditLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true }
      })
    ]);

    const byDayMap: Record<string, number> = {};
    recentLogs.forEach(l => {
      const key = l.createdAt.toISOString().split('T')[0];
      byDayMap[key] = (byDayMap[key] || 0) + 1;
    });
    const byDay = Object.entries(byDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    sendSuccess(res, {
      total,
      todayCount,
      distinctActeurs: distinctActeurs.length,
      byAction: byActionRaw.map(a => ({ action: a.action, count: a._count.action })),
      byEntityType: byEntityTypeRaw.map(e => ({ entityType: e.entityType, count: e._count.entityType })),
      byDay
    });

  } catch (error) {
    console.error('getAuditStats error:', error);
    sendError(res, 'Erreur lors du calcul des statistiques');
  }
};

// GET /api/audit-logs/export
export const exportAuditLogs = async (req: Request, res: Response) => {
  try {
    const { acteurId, action, entityType, dateFrom, dateTo, search } = req.query;

    const where: Prisma.AuditLogWhereInput = {};
    if (acteurId) where.acteurId = acteurId as string;
    if (action) where.action = action as string;
    if (entityType) where.entityType = entityType as string;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }
    if (search) {
      where.OR = [
        { action: { contains: search as string, mode: 'insensitive' } },
        { details: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: { acteur: { select: { nom: true, prenom: true } } }
    });

    const header = 'Date;Acteur;Action;Entite;EntiteId;Details\n';
    const rows = logs.map(l => {
      const acteur = l.acteur ? `${l.acteur.prenom} ${l.acteur.nom}` : 'Système';
      const details = (l.details || '').replace(/;/g, ',').replace(/\n/g, ' ');
      return `${l.createdAt.toISOString()};${acteur};${l.action};${l.entityType};${l.entityId};${details}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${Date.now()}.csv"`);
    res.status(200).send('\uFEFF' + header + rows);

  } catch (error) {
    console.error('exportAuditLogs error:', error);
    sendError(res, "Erreur lors de l'export");
  }
};

// Helper interne, à appeler depuis n'importe quel contrôleur métier existant
// (entityType, entityId et acteurId sont obligatoires dans le schéma)
export const logAudit = async (params: {
  action: string;
  entityType: string;
  entityId: string;
  acteurId: string;
  details?: string;
  anciennesValeurs?: any;
  nouvellesValeurs?: any;
  ipAdresse?: string;
  userAgent?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        acteurId: params.acteurId,
        details: params.details,
        anciennesValeurs: params.anciennesValeurs,
        nouvellesValeurs: params.nouvellesValeurs,
        ipAdresse: params.ipAdresse,
        userAgent: params.userAgent
      }
    });
  } catch (error) {
    console.error('logAudit error:', error);
  }
};