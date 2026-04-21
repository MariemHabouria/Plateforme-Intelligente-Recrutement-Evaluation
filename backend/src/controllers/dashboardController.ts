import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError } from '../utils/helpers';

// Calculer le délai moyen de recrutement
const calculerDelaiMoyenRecrutement = async () => {
  const demandesValidees = await prisma.demandeRecrutement.findMany({
    where: { statut: 'VALIDEE' },
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

// Calculer le taux de transformation
const calculerTauxTransformation = async () => {
  const total = await prisma.candidature.count();
  const acceptees = await prisma.candidature.count({ where: { statut: 'ACCEPTEE' } });
  if (total === 0) return 0;
  return Math.round((acceptees / total) * 100);
};

// Calculer le coût moyen de recrutement
const calculerCoutMoyenRecrutement = async () => {
  const demandes = await prisma.demandeRecrutement.findMany({
    where: { statut: 'VALIDEE' },
    select: { budgetMax: true }
  });
  
  if (demandes.length === 0) return 0;
  const total = demandes.reduce((sum, d) => sum + (Number(d.budgetMax) || 0), 0);
  return Math.round((total / demandes.length) * 0.3);
};

// Calculer la moyenne des évaluations
const calculerMoyenneEvaluation = async () => {
  const entretiens = await prisma.entretien.findMany({
    where: { evaluation: { not: null } }
  });
  
  if (entretiens.length === 0) return 0;
  const somme = entretiens.reduce((sum, e) => sum + (e.evaluation || 0), 0);
  return Math.round((somme / entretiens.length) * 10);
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;
    const userDirectionId = (req as any).user.directionId;

    // Construire les filtres selon le rôle
    let demandeFilter: any = {};
    let offreFilter: any = {};
    let candidatureFilter: any = {};
    let entretienFilter: any = {};

    switch (userRole) {
      case 'MANAGER':
        demandeFilter = { managerId: userId };
        offreFilter = { demande: { managerId: userId } };
        candidatureFilter = { offre: { demande: { managerId: userId } } };
        entretienFilter = { interviewerId: userId };
        break;
      case 'DIRECTEUR':
        demandeFilter = { directionId: userDirectionId };
        offreFilter = { demande: { directionId: userDirectionId } };
        candidatureFilter = { offre: { demande: { directionId: userDirectionId } } };
        entretienFilter = { candidature: { offre: { demande: { directionId: userDirectionId } } } };
        break;
      case 'DRH':
      case 'SUPER_ADMIN':
        // Pas de filtre - voir tout
        break;
      default:
        demandeFilter = { managerId: userId };
        offreFilter = { demande: { managerId: userId } };
        candidatureFilter = { offre: { demande: { managerId: userId } } };
        entretienFilter = { interviewerId: userId };
    }

    // Récupérer les données
    const [demandes, offres, candidatures, entretiens] = await Promise.all([
      prisma.demandeRecrutement.findMany({
        where: demandeFilter,
        include: { validations: true, createur: true }
      }),
      prisma.offreEmploi.findMany({
        where: offreFilter,
        include: { _count: { select: { candidatures: true } } }
      }),
      prisma.candidature.findMany({
        where: candidatureFilter,
        include: { offre: true }
      }),
      prisma.entretien.findMany({
        where: entretienFilter,
        include: { candidature: true }
      })
    ]);

    // Statistiques demandes
    const demandesParNiveau = demandes.reduce((acc, d) => {
      acc[d.niveau] = (acc[d.niveau] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Statistiques offres
    const offresParStatut = offres.reduce((acc, o) => {
      acc[o.statut] = (acc[o.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Statistiques candidatures
    const candidaturesParStatut = candidatures.reduce((acc, c) => {
      acc[c.statut] = (acc[c.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Statistiques entretiens
    const entretiensParType = entretiens.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const entretiensParStatut = entretiens.reduce((acc, e) => {
      acc[e.statut] = (acc[e.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Activité récente
    const demandesRecentes = await prisma.demandeRecrutement.findMany({
      where: demandeFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { reference: true, intitulePoste: true, statut: true, createdAt: true, createur: { select: { prenom: true, nom: true } } }
    });

    const candidaturesRecentes = await prisma.candidature.findMany({
      where: candidatureFilter,
      take: 5,
      orderBy: { dateSoumission: 'desc' },
      select: { reference: true, nom: true, prenom: true, dateSoumission: true, offre: { select: { intitule: true } } }
    });

    const offresRecentes = await prisma.offreEmploi.findMany({
      where: offreFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { reference: true, intitule: true, statut: true, createdAt: true }
    });

    // Tendances sur 6 mois
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

    // KPIs
    const delaiMoyen = await calculerDelaiMoyenRecrutement();
    const tauxTransformation = await calculerTauxTransformation();
    const coutMoyen = await calculerCoutMoyenRecrutement();
    const moyenneEvaluation = await calculerMoyenneEvaluation();
    const tauxValidation = demandes.length ? Math.round((demandes.filter(d => d.statut === 'VALIDEE').length / demandes.length) * 100) : 0;

    const stats = {
      kpis: {
        delaiMoyenRecrutement: delaiMoyen,
        tauxTransformation: tauxTransformation,
        coutMoyenRecrutement: coutMoyen,
        tauxSatisfaction: moyenneEvaluation,
        tauxValidationDemandes: tauxValidation,
        delaiMoyenValidation: delaiMoyen
      },
      demandes: {
        total: demandes.length,
        enCours: demandes.filter(d => !['VALIDEE', 'REJETEE', 'ANNULEE'].includes(d.statut)).length,
        validees: demandes.filter(d => d.statut === 'VALIDEE').length,
        rejetees: demandes.filter(d => d.statut === 'REJETEE').length,
        tauxValidation: tauxValidation,
        parNiveau: demandesParNiveau
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
        aVenir: entretiens.filter(e => new Date(e.date) > new Date()).length,
        tauxRealisation: entretiens.length ? Math.round((entretiensParStatut['REALISE'] || 0) / entretiens.length * 100) : 0,
        moyenneEvaluation: moyenneEvaluation,
        parType: Object.entries(entretiensParType).map(([type, count]) => ({ type, count }))
      },
      activiteRecente: {
        demandes: demandesRecentes.map(d => ({
          reference: d.reference,
          intitulePoste: d.intitulePoste,
          statut: d.statut,
          date: d.createdAt,
          createur: d.createur ? `${d.createur.prenom} ${d.createur.nom}` : undefined
        })),
        candidatures: candidaturesRecentes.map(c => ({
          reference: c.reference,
          nom: c.nom,
          prenom: c.prenom,
          date: c.dateSoumission,
          offre: c.offre?.intitule || ''
        })),
        offres: offresRecentes.map(o => ({
          reference: o.reference,
          intitule: o.intitule,
          statut: o.statut,
          date: o.createdAt
        })),
        entretiens: []
      },
      tendances: {
        mois,
        demandes: tendancesDemandes,
        offres: tendancesOffres,
        candidatures: tendancesCandidatures,
        embauches: tendancesEmbauches
      }
    };

    sendSuccess(res, stats);

  } catch (error) {
    console.error('getDashboardStats error:', error);
    sendError(res, 'Erreur lors de la récupération des statistiques');
  }
};