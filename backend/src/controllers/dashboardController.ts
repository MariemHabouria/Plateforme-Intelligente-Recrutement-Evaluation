import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError } from '../utils/helpers';


// FONCTIONS UTILITAIRES CORRIGÉES


/**
 * Calculer le délai moyen de recrutement (avec filtre par rôle)
 */
const calculerDelaiMoyenRecrutement = async (demandeFilter: any) => {
  const demandesValidees = await prisma.demandeRecrutement.findMany({
    where: { ...demandeFilter, statut: 'VALIDEE' },
    select: { createdAt: true, valideeAt: true }
  });
  
  if (demandesValidees.length === 0) return 0;
  
  const delais = demandesValidees.map(d => {
    const debut = new Date(d.createdAt);
    const fin = d.valideeAt ? new Date(d.valideeAt) : new Date();
    return Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24));
  });
  
  return Math.round(delais.reduce((a, b) => a + b, 0) / delais.length);
};

/**
 * Calculer le taux de transformation (avec filtre par rôle)
 */
const calculerTauxTransformation = async (candidatureFilter: any) => {
  const total = await prisma.candidature.count({ where: candidatureFilter });
  const acceptees = await prisma.candidature.count({ 
    where: { ...candidatureFilter, statut: 'ACCEPTEE' } 
  });
  if (total === 0) return 0;
  return Math.round((acceptees / total) * 100);
};

/**
 * Calculer le budget total engagé (au lieu du coût arbitraire)
 */
const calculerBudgetTotalEngage = async (demandeFilter: any) => {
  const demandes = await prisma.demandeRecrutement.findMany({
    where: { ...demandeFilter, statut: 'VALIDEE' },
    select: { budgetMax: true }
  });
  
  if (demandes.length === 0) return 0;
  const total = demandes.reduce((sum, d) => sum + (Number(d.budgetMax) || 0), 0);
  return total;
};

/**
 * Calculer la moyenne des évaluations (avec filtre)
 */
const calculerMoyenneEvaluation = async (entretienFilter: any) => {
  const entretiens = await prisma.entretien.findMany({
    where: { ...entretienFilter, evaluation: { not: null } }
  });
  
  if (entretiens.length === 0) return 0;
  const somme = entretiens.reduce((sum, e) => sum + (e.evaluation || 0), 0);
  return Math.round((somme / entretiens.length) * 10) / 10;
};

/**
 * Récupérer les logs d'audit (avec filtre par rôle)
 */
const getAuditLogs = async (userId: string, userRole: string, userDirectionId: string | null, limit: number = 10) => {
  let auditFilter: any = {};
  
  switch (userRole) {
    case 'SUPER_ADMIN':
      // Voir tous les logs
      break;
    case 'DRH':
      // Voir logs des demandes, offres, candidatures
      auditFilter = {
        OR: [
          { entityType: 'DemandeRecrutement' },
          { entityType: 'OffreEmploi' },
          { entityType: 'Candidature' }
        ]
      };
      break;
    case 'MANAGER':
      // Voir logs de ses demandes et entretiens
      auditFilter = {
        OR: [
          { entityType: 'DemandeRecrutement', entityId: { in: await getDemandeIdsByManager(userId) } },
          { entityType: 'Entretien', acteurId: userId }
        ]
      };
      break;
    case 'DIRECTEUR':
      // Voir logs des demandes de sa direction
      auditFilter = {
        entityType: 'DemandeRecrutement',
        entityId: { in: await getDemandeIdsByDirection(userDirectionId) }
      };
      break;
    default:
      auditFilter = { acteurId: userId };
  }
  
  return await prisma.auditLog.findMany({
    where: auditFilter,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { acteur: { select: { nom: true, prenom: true, email: true, role: true } } }
  });
};

// Helpers pour les filtres
const getDemandeIdsByManager = async (managerId: string): Promise<string[]> => {
  const demandes = await prisma.demandeRecrutement.findMany({
    where: { managerId },
    select: { id: true }
  });
  return demandes.map(d => d.id);
};

const getDemandeIdsByDirection = async (directionId: string | null): Promise<string[]> => {
  if (!directionId) return [];
  const demandes = await prisma.demandeRecrutement.findMany({
    where: { directionId },
    select: { id: true }
  });
  return demandes.map(d => d.id);
};

/**
 * Récupérer les évaluations PE à faire (par rôle)
 */
const getEvaluationsAPreparer = async (userRole: string, userId: string, userDirectionId: string | null) => {
  if (userRole === 'RESP_PAIE') {
    return await prisma.evaluationPE.count({
      where: { statut: 'BROUILLON' }
    });
  }
  if (userRole === 'MANAGER') {
    return await prisma.evaluationPE.count({
      where: { 
        managerId: userId, 
        statut: 'EN_VALIDATION_DIR',
        etapeActuelle: 1
      }
    });
  }
  if (userRole === 'DIRECTEUR') {
    return await prisma.evaluationPE.count({
      where: { 
        employe: { directionId: userDirectionId },
        statut: 'EN_VALIDATION_DIR',
        etapeActuelle: 2
      }
    });
  }
  return 0;
};

/**
 * Récupérer les validations en attente (selon rôle)
 */
const getValidationsEnAttente = async (userRole: string, userId: string, userDirectionId: string | null) => {
  switch (userRole) {
    case 'MANAGER':
      return await prisma.validationEtape.count({
        where: { acteurId: userId, decision: 'EN_ATTENTE' }
      });
    case 'DIRECTEUR':
      return await prisma.demandeRecrutement.count({
        where: { directionId: userDirectionId, statut: 'EN_VALIDATION_DIR' }
      });
    case 'DRH':
      return await prisma.demandeRecrutement.count({
        where: { statut: 'EN_VALIDATION_DRH' }
      });
    case 'DAF':
      return await prisma.demandeRecrutement.count({
        where: { statut: 'EN_VALIDATION_DAF' }
      });
    case 'DGA':
      return await prisma.demandeRecrutement.count({
        where: { statut: 'EN_VALIDATION_DGA' }
      });
    case 'DG':
      return await prisma.demandeRecrutement.count({
        where: { statut: 'EN_VALIDATION_DG' }
      });
    default:
      return 0;
  }
};


// MAIN DASHBOARD STATS CORRIGÉ


export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;
    const userDirectionId = (req as any).user.directionId;
    const userNom = (req as any).user.nom;
    const userPrenom = (req as any).user.prenom;

    
    // CONSTRUCTION DES FILTRES PAR RÔLE
    
    
    let demandeFilter: any = {};
    let offreFilter: any = {};
    let candidatureFilter: any = {};
    let entretienFilter: any = {};
    let contratFilter: any = {};
    let evaluationFilter: any = {};

    switch (userRole) {
      case 'SUPER_ADMIN':
        // Pas de filtre - voit tout
        break;
        
      case 'MANAGER':
        demandeFilter = { managerId: userId };
        offreFilter = { demande: { managerId: userId } };
        candidatureFilter = { offre: { demande: { managerId: userId } } };
        entretienFilter = { interviewerId: userId };
        contratFilter = { candidature: { offre: { demande: { managerId: userId } } } };
        evaluationFilter = { managerId: userId };
        break;
        
      case 'DIRECTEUR':
        demandeFilter = { directionId: userDirectionId };
        offreFilter = { demande: { directionId: userDirectionId } };
        candidatureFilter = { offre: { demande: { directionId: userDirectionId } } };
        entretienFilter = { candidature: { offre: { demande: { directionId: userDirectionId } } } };
        contratFilter = { candidature: { offre: { demande: { directionId: userDirectionId } } } };
        evaluationFilter = { employe: { directionId: userDirectionId } };
        break;
        
      case 'DRH':
        demandeFilter = {};
        offreFilter = {};
        candidatureFilter = {};
        entretienFilter = { type: 'RH', interviewerId: userId };
        contratFilter = {};
        evaluationFilter = {};
        break;
        
      case 'DAF':
        demandeFilter = { statut: { in: ['EN_VALIDATION_DAF', 'VALIDEE', 'REJETEE'] } };
        offreFilter = {};
        candidatureFilter = {};
        entretienFilter = {};
        contratFilter = {};
        evaluationFilter = {};
        break;
        
      case 'DGA':
        demandeFilter = { statut: { in: ['EN_VALIDATION_DGA', 'VALIDEE', 'REJETEE'] } };
        offreFilter = {};
        candidatureFilter = {};
        entretienFilter = {};
        contratFilter = {};
        evaluationFilter = {};
        break;
        
      case 'DG':
        demandeFilter = { statut: { in: ['EN_VALIDATION_DG', 'VALIDEE', 'REJETEE'] } };
        offreFilter = {};
        candidatureFilter = {};
        entretienFilter = {};
        contratFilter = {};
        evaluationFilter = {};
        break;
        
      case 'RESP_PAIE':
        demandeFilter = {};
        offreFilter = {};
        candidatureFilter = { statut: 'ACCEPTEE' };
        entretienFilter = {};
        contratFilter = {};
        evaluationFilter = { statut: { in: ['BROUILLON', 'EN_VALIDATION_DIR'] } };
        break;
        
      default:
        demandeFilter = { createurId: userId };
        offreFilter = { rhId: userId };
        candidatureFilter = {};
        entretienFilter = { interviewerId: userId };
        contratFilter = {};
        evaluationFilter = {};
    }

    
    // RÉCUPÉRATION DES DONNÉES PRINCIPALES
    

    const [demandes, offres, candidatures, entretiens, contrats, evaluations] = await Promise.all([
      prisma.demandeRecrutement.findMany({
        where: demandeFilter,
        include: { validations: true, createur: true, direction: true }
      }),
      prisma.offreEmploi.findMany({
        where: offreFilter,
        include: { _count: { select: { candidatures: true } } }
      }),
      prisma.candidature.findMany({
        where: candidatureFilter,
        include: { offre: { include: { demande: true } } }
      }),
      prisma.entretien.findMany({
        where: entretienFilter,
        include: { candidature: true, interviewer: true }
      }),
      prisma.contrat.findMany({
        where: contratFilter,
        include: { candidature: true }
      }),
      prisma.evaluationPE.findMany({
        where: evaluationFilter,
        include: { employe: true, manager: true }
      })
    ]);

    
    // STATISTIQUES DÉTAILLÉES
    

    // Demandes
    const demandesParNiveau = demandes.reduce((acc, d) => {
      acc[d.niveau] = (acc[d.niveau] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const demandesParStatut = demandes.reduce((acc, d) => {
      acc[d.statut] = (acc[d.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Offres
    const offresParStatut = offres.reduce((acc, o) => {
      acc[o.statut] = (acc[o.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Candidatures
    const candidaturesParStatut = candidatures.reduce((acc, c) => {
      acc[c.statut] = (acc[c.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Entretiens
    const entretiensParType = entretiens.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const entretiensParStatut = entretiens.reduce((acc, e) => {
      acc[e.statut] = (acc[e.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Contrats
    const contratsParStatut = contrats.reduce((acc, c) => {
      acc[c.statut] = (acc[c.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Évaluations PE
    const evaluationsParStatut = evaluations.reduce((acc, e) => {
      acc[e.statut] = (acc[e.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    
    // KPIs PAR RÔLE
    

    const delaiMoyen = await calculerDelaiMoyenRecrutement(demandeFilter);
    const tauxTransformation = await calculerTauxTransformation(candidatureFilter);
    const budgetTotal = await calculerBudgetTotalEngage(demandeFilter);
    const moyenneEvaluation = await calculerMoyenneEvaluation(entretienFilter);
    const validationsEnAttente = await getValidationsEnAttente(userRole, userId, userDirectionId);
    const evaluationsAPreparer = await getEvaluationsAPreparer(userRole, userId, userDirectionId);

    // KPIs de base (communs)
    const baseKpis = {
      delaiMoyenRecrutement: delaiMoyen,
      tauxTransformation: tauxTransformation,
      budgetTotalEngage: budgetTotal,
      moyenneEvaluation: moyenneEvaluation,
      validationsEnAttente: validationsEnAttente,
      evaluationsAPreparer: evaluationsAPreparer
    };

    // KPIs spécifiques par rôle
    let specificKpis = {};
    
    switch (userRole) {
      case 'SUPER_ADMIN':
        specificKpis = {
          utilisateursActifs: await prisma.user.count({ where: { actif: true } }),
          utilisateursTotal: await prisma.user.count(),
          directionsActives: await prisma.direction.count({ where: { actif: true } }),
          tauxOccupation: Math.round((await prisma.user.count({ where: { actif: true } }) / await prisma.user.count()) * 100)
        };
        break;
        
      case 'MANAGER':
        specificKpis = {
          monEquipe: await prisma.user.count({ where: { managerId: userId, actif: true } }),
          entretiensASaisir: entretiens.filter(e => !e.feedback && new Date(e.date) <= new Date()).length,
          mesEvaluations: evaluations.length,
          mesContratsActifs: contrats.filter(c => c.statut === 'ACTIF').length
        };
        break;
        
      case 'DIRECTEUR':
        specificKpis = {
          directionsSousResponsabilite: 1,
          demandesDirection: demandes.length,
          recrutementsDirection: candidatures.filter(c => c.statut === 'ACCEPTEE').length,
          budgetDirection: budgetTotal
        };
        break;
        
      case 'DRH':
        specificKpis = {
          offresPubliees: offresParStatut['PUBLIEE'] || 0,
          candidaturesNouvelles: candidaturesParStatut['NOUVELLE'] || 0,
          entretiensASuivre: entretiens.filter(e => e.statut === 'PLANIFIE').length,
          tauxRemplissage: Math.round(((candidaturesParStatut['ACCEPTEE'] || 0) / (candidatures.length || 1)) * 100)
        };
        break;
        
      case 'DAF':
        specificKpis = {
          budgetTotal: budgetTotal,
          demandesBudget: demandesParStatut['EN_VALIDATION_DAF'] || 0,
          coutMoyenParRecrutement: demandes.length ? Math.round(budgetTotal / demandes.length) : 0,
          economieBudgetaire: 0 // À calculer selon prévisionnel
        };
        break;
        
      case 'DGA':
        specificKpis = {
          demandesStrategiques: demandes.filter(d => d.niveau === 'STRATEGIQUE').length,
          validationsEnCours: demandesParStatut['EN_VALIDATION_DGA'] || 0,
          impactRH: demandes.length
        };
        break;
        
      case 'DG':
        specificKpis = {
          visionGlobale: demandes.length,
          validationFinale: demandesParStatut['EN_VALIDATION_DG'] || 0,
          recrutementsAnnee: candidaturesParStatut['ACCEPTEE'] || 0,
          performanceGlobale: Math.round((candidaturesParStatut['ACCEPTEE'] || 0) / (candidatures.length || 1) * 100)
        };
        break;
        
      case 'RESP_PAIE':
        specificKpis = {
          contratsAPreparer: candidaturesParStatut['ACCEPTEE'] || 0,
          evaluationsASaisir: evaluationsParStatut['BROUILLON'] || 0,
          contratsActifs: contratsParStatut['ACTIF'] || 0,
          periodesEssai: evaluations.filter(e => e.joursRestants > 0 && e.joursRestants < 30).length
        };
        break;
    }

    
    // ACTIVITÉ RÉCENTE (HISTORIQUE)
    

    const demandesRecentes = await prisma.demandeRecrutement.findMany({
      where: demandeFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        intitulePoste: true,
        statut: true,
        createdAt: true,
        createur: { select: { prenom: true, nom: true } },
        direction: { select: { nom: true } }
      }
    });

    const candidaturesRecentes = await prisma.candidature.findMany({
      where: candidatureFilter,
      take: 5,
      orderBy: { dateSoumission: 'desc' },
      select: {
        id: true,
        reference: true,
        nom: true,
        prenom: true,
        statut: true,
        dateSoumission: true,
        offre: { select: { intitule: true, reference: true } }
      }
    });

    const entretiensRecents = await prisma.entretien.findMany({
      where: entretienFilter,
      take: 5,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        type: true,
        date: true,
        heure: true,
        statut: true,
        candidature: { select: { nom: true, prenom: true } },
        interviewer: { select: { nom: true, prenom: true, role: true } }
      }
    });

    const contratsRecents = await prisma.contrat.findMany({
  where: contratFilter,
  take: 5,
  orderBy: { dateDebut: 'desc' },  
  include: {                        
    candidature: {
      select: { nom: true, prenom: true }
    }
  }
});
    
    // LOGS D'AUDIT (selon permissions)
    

    const auditLogs = await getAuditLogs(userId, userRole, userDirectionId, 10);

    
    // TENDANCES SUR 6 MOIS
    

    const mois = [];
    const tendancesDemandes = [];
    const tendancesOffres = [];
    const tendancesCandidatures = [];
    const tendancesEmbauches = [];

    const aujourdhui = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - i, 1);
      mois.push(date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }));
      
      const debutMois = new Date(date.getFullYear(), date.getMonth(), 1);
      const finMois = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const demandeFilterMois = { ...demandeFilter, createdAt: { gte: debutMois, lte: finMois } };
      const offreFilterMois = { ...offreFilter, createdAt: { gte: debutMois, lte: finMois } };
      const candidatureFilterMois = { ...candidatureFilter, dateSoumission: { gte: debutMois, lte: finMois } };
      
      tendancesDemandes.push(await prisma.demandeRecrutement.count({ where: demandeFilterMois }));
      tendancesOffres.push(await prisma.offreEmploi.count({ where: offreFilterMois }));
      tendancesCandidatures.push(await prisma.candidature.count({ where: candidatureFilterMois }));
      tendancesEmbauches.push(await prisma.candidature.count({ 
        where: { ...candidatureFilterMois, statut: 'ACCEPTEE' } 
      }));
    }

    
    // STATISTIQUES GLOBALES PAR RÔLE
    

    const stats = {
      // Informations utilisateur
      user: {
        id: userId,
        nom: userNom,
        prenom: userPrenom,
        role: userRole,
        directionId: userDirectionId
      },
      
      // KPIs
      kpis: {
        ...baseKpis,
        ...specificKpis
      },
      
      // Compteurs principaux
      counters: {
        demandes: {
          total: demandes.length,
          enCours: demandes.filter(d => !['VALIDEE', 'REJETEE', 'ANNULEE'].includes(d.statut)).length,
          validees: demandes.filter(d => d.statut === 'VALIDEE').length,
          rejetees: demandes.filter(d => d.statut === 'REJETEE').length,
          annulees: demandes.filter(d => d.statut === 'ANNULEE').length,
          tauxValidation: demandes.length ? Math.round((demandes.filter(d => d.statut === 'VALIDEE').length / demandes.length) * 100) : 0,
          parNiveau: demandesParNiveau,
          parStatut: demandesParStatut
        },
        offres: {
          total: offres.length,
          publiees: offresParStatut['PUBLIEE'] || 0,
          brouillons: offresParStatut['BROUILLON'] || 0,
          cloturees: offresParStatut['CLOTUREE'] || 0,
          tauxPublication: offres.length ? Math.round((offresParStatut['PUBLIEE'] || 0) / offres.length * 100) : 0
        },
        candidatures: {
          total: candidatures.length,
          nouvelles: candidaturesParStatut['NOUVELLE'] || 0,
          preselectionnees: candidaturesParStatut['PRESELECTIONNEE'] || 0,
          ficheEnvoyee: candidaturesParStatut['FICHE_ENVOYEE'] || 0,
          ficheRecue: candidaturesParStatut['FICHE_RECUE'] || 0,
          entretien: candidaturesParStatut['ENTRETIEN'] || 0,
          acceptees: candidaturesParStatut['ACCEPTEE'] || 0,
          refusees: candidaturesParStatut['REFUSEE'] || 0,
          tauxAcceptation: tauxTransformation,
          parOffre: []
        },
        entretiens: {
          total: entretiens.length,
          planifies: entretiensParStatut['PLANIFIE'] || 0,
          realises: entretiensParStatut['REALISE'] || 0,
          annules: entretiensParStatut['ANNULE'] || 0,
          reportes: entretiensParStatut['REPORTE'] || 0,
          aVenir: entretiens.filter(e => new Date(e.date) > new Date()).length,
          tauxRealisation: entretiens.length ? Math.round((entretiensParStatut['REALISE'] || 0) / entretiens.length * 100) : 0,
          moyenneEvaluation: moyenneEvaluation,
          parType: Object.entries(entretiensParType).map(([type, count]) => ({ type, count }))
        },
        contrats: {
          total: contrats.length,
          brouillons: contratsParStatut['BROUILLON'] || 0,
          envoyes: contratsParStatut['ENVOYE'] || 0,
          actifs: contratsParStatut['ACTIF'] || 0,
          resilies: contratsParStatut['RESILIE'] || 0,
          termines: contratsParStatut['TERMINE'] || 0
        },
        evaluations: {
          total: evaluations.length,
          brouillons: evaluationsParStatut['BROUILLON'] || 0,
          enCours: evaluationsParStatut['EN_VALIDATION_DIR'] || 0,
          validees: evaluationsParStatut['VALIDEE'] || 0,
          rejetees: evaluationsParStatut['REJETEE'] || 0,
          aRendre: evaluations.filter(e => e.joursRestants < 15 && e.joursRestants > 0 && e.statut !== 'VALIDEE').length,
          depassees: evaluations.filter(e => e.joursRestants < 0 && e.statut !== 'VALIDEE').length
        }
      },
      
      // Activité récente (historique)
      activiteRecente: {
        demandes: demandesRecentes.map(d => ({
          id: d.id,
          reference: d.reference,
          intitulePoste: d.intitulePoste,
          statut: d.statut,
          date: d.createdAt,
          createur: d.createur ? `${d.createur.prenom} ${d.createur.nom}` : undefined,
          direction: d.direction?.nom
        })),
        candidatures: candidaturesRecentes.map(c => ({
          id: c.id,
          reference: c.reference,
          nom: c.nom,
          prenom: c.prenom,
          statut: c.statut,
          date: c.dateSoumission,
          offre: c.offre?.intitule || '',
          offreRef: c.offre?.reference
        })),
        entretiens: entretiensRecents.map(e => ({
          id: e.id,
          type: e.type,
          date: e.date,
          heure: e.heure,
          statut: e.statut,
          candidat: e.candidature ? `${e.candidature.prenom} ${e.candidature.nom}` : '',
          interviewer: e.interviewer ? `${e.interviewer.prenom} ${e.interviewer.nom} (${e.interviewer.role})` : ''
        })),
        contrats: contratsRecents.map(c => ({
          id: c.id,
          reference: c.reference,
          type: c.typeContrat,
          statut: c.statut,
          dateDebut: c.dateDebut,
          employe: c.candidature ? `${c.candidature.prenom} ${c.candidature.nom}` : ''
        }))
      },
      
      // Logs d'audit
      auditLogs: auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        acteur: log.acteur ? `${log.acteur.prenom} ${log.acteur.nom} (${log.acteur.role})` : 'Système',
        createdAt: log.createdAt
      })),
      
      // Tendances graphiques
      tendances: {
        mois,
        demandes: tendancesDemandes,
        offres: tendancesOffres,
        candidatures: tendancesCandidatures,
        embauches: tendancesEmbauches
      },
      
      // Alertes importantes (selon rôle)
      alertes: await getAlertes(userRole, userId, userDirectionId, demandes, evaluations, entretiens)
    };

    sendSuccess(res, stats);

  } catch (error) {
    console.error('getDashboardStats error:', error);
    sendError(res, 'Erreur lors de la récupération des statistiques');
  }
};

/**
 * Récupérer les alertes importantes pour le rôle
 */
async function getAlertes(userRole: string, userId: string, userDirectionId: string | null, demandes: any[], evaluations: any[], entretiens: any[]) {
  const alertes = [];
  
  switch (userRole) {
    case 'MANAGER':
      const evalEnAttente = evaluations.filter(e => e.managerId === userId && e.statut === 'EN_VALIDATION_DIR' && e.etapeActuelle === 1).length;
      if (evalEnAttente > 0) {
        alertes.push({ type: 'warning', message: `${evalEnAttente} évaluation(s) de période d'essai à réaliser`, lien: '/evaluations' });
      }
      
      const entretiensASaisir = entretiens.filter(e => e.interviewerId === userId && !e.feedback && new Date(e.date) <= new Date()).length;
      if (entretiensASaisir > 0) {
        alertes.push({ type: 'info', message: `${entretiensASaisir} entretien(s) en attente de feedback`, lien: '/entretiens' });
      }
      break;
      
    case 'DIRECTEUR':
      const validationsEnAttente = demandes.filter(d => d.directionId === userDirectionId && d.statut === 'EN_VALIDATION_DIR').length;
      if (validationsEnAttente > 0) {
        alertes.push({ type: 'warning', message: `${validationsEnAttente} demande(s) à valider dans votre direction`, lien: '/validations' });
      }
      break;
      
    case 'DRH':
      const offresBrouillon = await prisma.offreEmploi.count({ where: { statut: 'BROUILLON' } });
      if (offresBrouillon > 0) {
        alertes.push({ type: 'info', message: `${offresBrouillon} offre(s) en brouillon à publier`, lien: '/offres' });
      }
      
      const demandesValideesSansOffre = await prisma.demandeRecrutement.count({ where: { statut: 'VALIDEE', offre: null } });
      if (demandesValideesSansOffre > 0) {
        alertes.push({ type: 'warning', message: `${demandesValideesSansOffre} demande(s) validée(s) sans offre créée`, lien: '/demandes-sans-offre' });
      }
      break;
      
    case 'RESP_PAIE':
      const contratsAPreparer = await prisma.candidature.count({ where: { statut: 'ACCEPTEE', contrat: null } });
      if (contratsAPreparer > 0) {
        alertes.push({ type: 'warning', message: `${contratsAPreparer} contrat(s) à préparer`, lien: '/contrats' });
      }
      
      const evaluationsASaisir = await prisma.evaluationPE.count({ where: { statut: 'BROUILLON' } });
      if (evaluationsASaisir > 0) {
        alertes.push({ type: 'info', message: `${evaluationsASaisir} évaluation(s) PE à saisir`, lien: '/evaluations' });
      }
      break;
  }
  
  // Alertes communes (délais critiques)
  const evaluationsCritiques = evaluations.filter(e => e.joursRestants < 7 && e.joursRestants > 0 && e.statut !== 'VALIDEE');
  if (evaluationsCritiques.length > 0) {
    alertes.push({ type: 'danger', message: `${evaluationsCritiques.length} période(s) d'essai se terminent dans moins de 7 jours`, lien: '/evaluations' });
  }
  
  return alertes;
}