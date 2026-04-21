// backend/src/services/stats.service.ts

import prisma from '../config/prisma';

export interface DashboardStats {
  // KPIs Principaux
  kpis: {
    // Délai moyen de recrutement (en jours)
    delaiMoyenRecrutement: number;
    // Taux de transformation (candidatures → embauches)
    tauxTransformation: number;
    // Coût moyen par recrutement (estimation)
    coutMoyenRecrutement: number;
    // Taux de satisfaction (feedback entretiens)
    tauxSatisfaction: number;
    // Taux de validation des demandes
    tauxValidationDemandes: number;
    // Délai moyen de validation par étape
    delaiMoyenValidation: number;
  };
  
  demandes: {
    total: number;
    enCours: number;
    validees: number;
    rejetees: number;
    tauxValidation: number;
    parNiveau: Record<string, number>;
  };
  
  offres: {
    total: number;
    publiees: number;
    brouillons: number;
    cloturees: number;
    tauxPublication: number;
  };
  
  candidatures: {
    total: number;
    nouvelles: number;
    preselectionnees: number;
    entretien: number;
    acceptees: number;
    refusees: number;
    tauxAcceptation: number;
    parOffre: { offreId: string; intitule: string; count: number }[];
  };
  
  entretiens: {
    total: number;
    planifies: number;
    realises: number;
    aVenir: number;
    tauxRealisation: number;
    moyenneEvaluation: number;
    parType: { type: string; count: number }[];
  };
  
  activiteRecente: {
    demandes: { reference: string; intitulePoste: string; statut: string; date: Date; createur?: string }[];
    candidatures: { reference: string; nom: string; prenom: string; date: Date; offre: string }[];
    offres: { reference: string; intitule: string; statut: string; date: Date }[];
    entretiens: { type: string; candidat: string; date: Date; statut: string }[];
  };
  
  // Tendances (évolution sur 6 mois)
  tendances: {
    mois: string[];
    demandes: number[];
    offres: number[];
    candidatures: number[];
    embauches: number[];
  };
}

class StatsService {
  
  private calculerDelaiMoyenRecrutement(validations: any[]): number {
    if (validations.length === 0) return 0;
    const delais = validations.map(v => {
      const debut = new Date(v.createdAt);
      const fin = v.dateDecision || new Date();
      return Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24));
    });
    return Math.round(delais.reduce((a, b) => a + b, 0) / delais.length);
  }

  private calculerTauxTransformation(candidatures: any[]): number {
    if (candidatures.length === 0) return 0;
    const acceptees = candidatures.filter(c => c.statut === 'ACCEPTEE').length;
    return Math.round((acceptees / candidatures.length) * 100);
  }

  private calculerTauxValidationDemandes(demandes: any[]): number {
    if (demandes.length === 0) return 0;
    const validees = demandes.filter(d => d.statut === 'VALIDEE').length;
    return Math.round((validees / demandes.length) * 100);
  }

  private calculerMoyenneEvaluation(entretiens: any[]): number {
    const avecEvaluation = entretiens.filter(e => e.evaluation && e.evaluation > 0);
    if (avecEvaluation.length === 0) return 0;
    const somme = avecEvaluation.reduce((a, b) => a + (b.evaluation || 0), 0);
    return Math.round(somme / avecEvaluation.length);
  }

  private async getTendances(userId: string, userRole: string, directionId?: string): Promise<any> {
    const mois = [];
    const demandesData = [];
    const offresData = [];
    const candidaturesData = [];
    const embauchesData = [];
    
    const aujourdhui = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - i, 1);
      mois.push(date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }));
      
      const debutMois = new Date(date.getFullYear(), date.getMonth(), 1);
      const finMois = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      let whereCondition: any = { createdAt: { gte: debutMois, lte: finMois } };
      
      if (userRole === 'MANAGER') {
        whereCondition.managerId = userId;
      } else if (userRole === 'DIRECTEUR' && directionId) {
        whereCondition.directionId = directionId;
      }
      
      const demandes = await prisma.demandeRecrutement.count({ where: whereCondition });
      const offres = await prisma.offreEmploi.count({ 
        where: { ...whereCondition, demande: userRole === 'MANAGER' ? { managerId: userId } : undefined }
      });
      const candidatures = await prisma.candidature.count({ where: { dateSoumission: { gte: debutMois, lte: finMois } } });
      const embauches = await prisma.candidature.count({ 
        where: { 
          statut: 'ACCEPTEE',
          dateSoumission: { gte: debutMois, lte: finMois }
        } 
      });
      
      demandesData.push(demandes);
      offresData.push(offres);
      candidaturesData.push(candidatures);
      embauchesData.push(embauches);
    }
    
    return { mois, demandes: demandesData, offres: offresData, candidatures: candidaturesData, embauches: embauchesData };
  }

  async getStatsForManager(userId: string, directionId: string): Promise<DashboardStats> {
    const demandes = await prisma.demandeRecrutement.findMany({
      where: { managerId: userId },
      include: { validations: true, createur: true }
    });
    
    const offres = await prisma.offreEmploi.findMany({
      where: { demande: { managerId: userId } },
      include: { _count: { select: { candidatures: true } } }
    });
    
    const candidatures = await prisma.candidature.findMany({
      where: { offre: { demande: { managerId: userId } } },
      include: { offre: true }
    });
    
    const entretiens = await prisma.entretien.findMany({
      where: { interviewerId: userId },
      include: { candidature: true }
    });
    
    const demandesParNiveau = demandes.reduce((acc, d) => {
      acc[d.niveau] = (acc[d.niveau] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const candidaturesParOffre = candidatures.reduce((acc, c) => {
      const offreId = c.offreId;
      if (!acc[offreId]) acc[offreId] = { offreId, intitule: c.offre?.intitule || '', count: 0 };
      acc[offreId].count++;
      return acc;
    }, {} as Record<string, any>);
    
    const entretiensParType = entretiens.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const activiteDemandes = demandes.slice(0, 5).map(d => ({
      reference: d.reference,
      intitulePoste: d.intitulePoste,
      statut: d.statut,
      date: d.createdAt,
      createur: d.createur?.prenom + ' ' + d.createur?.nom
    }));
    
    const activiteCandidatures = candidatures.slice(0, 5).map(c => ({
      reference: c.reference,
      nom: c.nom,
      prenom: c.prenom,
      date: c.dateSoumission,
      offre: c.offre?.intitule || ''
    }));
    
    const activiteOffres = offres.slice(0, 5).map(o => ({
      reference: o.reference,
      intitule: o.intitule,
      statut: o.statut,
      date: o.createdAt
    }));
    
    const activiteEntretiens = entretiens.slice(0, 5).map(e => ({
      type: e.type,
      candidat: e.candidature?.prenom + ' ' + e.candidature?.nom,
      date: e.date,
      statut: e.statut
    }));
    
    const validations = demandes.flatMap(d => d.validations);
    const delaiMoyen = this.calculerDelaiMoyenRecrutement(validations);
    const tauxTransformation = this.calculerTauxTransformation(candidatures);
    const tauxValidation = this.calculerTauxValidationDemandes(demandes);
    const moyenneEvaluation = this.calculerMoyenneEvaluation(entretiens);
    const tendances = await this.getTendances(userId, 'MANAGER');
    
    return {
      kpis: {
        delaiMoyenRecrutement: delaiMoyen,
        tauxTransformation: tauxTransformation,
        coutMoyenRecrutement: Math.round((demandes.reduce((s, d) => s + (Number(d.budgetMax) || 0), 0) / (demandes.length || 1)) * 0.3),
        tauxSatisfaction: moyenneEvaluation * 10,
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
        publiees: offres.filter(o => o.statut === 'PUBLIEE').length,
        brouillons: offres.filter(o => o.statut === 'BROUILLON').length,
        cloturees: offres.filter(o => o.statut === 'CLOTUREE').length,
        tauxPublication: offres.length ? Math.round((offres.filter(o => o.statut === 'PUBLIEE').length / offres.length) * 100) : 0
      },
      candidatures: {
        total: candidatures.length,
        nouvelles: candidatures.filter(c => c.statut === 'NOUVELLE').length,
        preselectionnees: candidatures.filter(c => c.statut === 'PRESELECTIONNEE').length,
        entretien: candidatures.filter(c => c.statut === 'ENTRETIEN').length,
        acceptees: candidatures.filter(c => c.statut === 'ACCEPTEE').length,
        refusees: candidatures.filter(c => c.statut === 'REFUSEE').length,
        tauxAcceptation: tauxTransformation,
        parOffre: Object.values(candidaturesParOffre)
      },
      entretiens: {
        total: entretiens.length,
        planifies: entretiens.filter(e => e.statut === 'PLANIFIE').length,
        realises: entretiens.filter(e => e.statut === 'REALISE').length,
        aVenir: entretiens.filter(e => new Date(e.date) > new Date()).length,
        tauxRealisation: entretiens.length ? Math.round((entretiens.filter(e => e.statut === 'REALISE').length / entretiens.length) * 100) : 0,
        moyenneEvaluation: moyenneEvaluation,
        parType: Object.entries(entretiensParType).map(([type, count]) => ({ type, count }))
      },
      activiteRecente: {
        demandes: activiteDemandes,
        candidatures: activiteCandidatures,
        offres: activiteOffres,
        entretiens: activiteEntretiens
      },
      tendances
    };
  }

  async getStatsForDRH(): Promise<DashboardStats> {
    const demandes = await prisma.demandeRecrutement.findMany({
      include: { validations: true, createur: true }
    });
    
    const offres = await prisma.offreEmploi.findMany({
      include: { _count: { select: { candidatures: true } } }
    });
    
    const candidatures = await prisma.candidature.findMany({
      include: { offre: true }
    });
    
    const entretiens = await prisma.entretien.findMany({
      include: { candidature: true }
    });
    
    const demandesParNiveau = demandes.reduce((acc, d) => {
      acc[d.niveau] = (acc[d.niveau] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const candidaturesParOffre = candidatures.reduce((acc, c) => {
      const offreId = c.offreId;
      if (!acc[offreId]) acc[offreId] = { offreId, intitule: c.offre?.intitule || '', count: 0 };
      acc[offreId].count++;
      return acc;
    }, {} as Record<string, any>);
    
    const entretiensParType = entretiens.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const activiteDemandes = demandes.slice(0, 5).map(d => ({
      reference: d.reference,
      intitulePoste: d.intitulePoste,
      statut: d.statut,
      date: d.createdAt,
      createur: d.createur?.prenom + ' ' + d.createur?.nom
    }));
    
    const activiteCandidatures = candidatures.slice(0, 5).map(c => ({
      reference: c.reference,
      nom: c.nom,
      prenom: c.prenom,
      date: c.dateSoumission,
      offre: c.offre?.intitule || ''
    }));
    
    const activiteOffres = offres.slice(0, 5).map(o => ({
      reference: o.reference,
      intitule: o.intitule,
      statut: o.statut,
      date: o.createdAt
    }));
    
    const activiteEntretiens = entretiens.slice(0, 5).map(e => ({
      type: e.type,
      candidat: e.candidature?.prenom + ' ' + e.candidature?.nom,
      date: e.date,
      statut: e.statut
    }));
    
    const validations = demandes.flatMap(d => d.validations);
    const delaiMoyen = this.calculerDelaiMoyenRecrutement(validations);
    const tauxTransformation = this.calculerTauxTransformation(candidatures);
    const tauxValidation = this.calculerTauxValidationDemandes(demandes);
    const moyenneEvaluation = this.calculerMoyenneEvaluation(entretiens);
    const tendances = await this.getTendances('', 'DRH');
    
    return {
      kpis: {
        delaiMoyenRecrutement: delaiMoyen,
        tauxTransformation: tauxTransformation,
        coutMoyenRecrutement: Math.round((demandes.reduce((s, d) => s + (Number(d.budgetMax) || 0), 0) / (demandes.length || 1)) * 0.3),
        tauxSatisfaction: moyenneEvaluation * 10,
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
        publiees: offres.filter(o => o.statut === 'PUBLIEE').length,
        brouillons: offres.filter(o => o.statut === 'BROUILLON').length,
        cloturees: offres.filter(o => o.statut === 'CLOTUREE').length,
        tauxPublication: offres.length ? Math.round((offres.filter(o => o.statut === 'PUBLIEE').length / offres.length) * 100) : 0
      },
      candidatures: {
        total: candidatures.length,
        nouvelles: candidatures.filter(c => c.statut === 'NOUVELLE').length,
        preselectionnees: candidatures.filter(c => c.statut === 'PRESELECTIONNEE').length,
        entretien: candidatures.filter(c => c.statut === 'ENTRETIEN').length,
        acceptees: candidatures.filter(c => c.statut === 'ACCEPTEE').length,
        refusees: candidatures.filter(c => c.statut === 'REFUSEE').length,
        tauxAcceptation: tauxTransformation,
        parOffre: Object.values(candidaturesParOffre)
      },
      entretiens: {
        total: entretiens.length,
        planifies: entretiens.filter(e => e.statut === 'PLANIFIE').length,
        realises: entretiens.filter(e => e.statut === 'REALISE').length,
        aVenir: entretiens.filter(e => new Date(e.date) > new Date()).length,
        tauxRealisation: entretiens.length ? Math.round((entretiens.filter(e => e.statut === 'REALISE').length / entretiens.length) * 100) : 0,
        moyenneEvaluation: moyenneEvaluation,
        parType: Object.entries(entretiensParType).map(([type, count]) => ({ type, count }))
      },
      activiteRecente: {
        demandes: activiteDemandes,
        candidatures: activiteCandidatures,
        offres: activiteOffres,
        entretiens: activiteEntretiens
      },
      tendances
    };
  }

  async getStatsForDirecteur(directionId: string): Promise<DashboardStats> {
    const demandes = await prisma.demandeRecrutement.findMany({
      where: { directionId },
      include: { validations: true, createur: true }
    });
    
    const offres = await prisma.offreEmploi.findMany({
      where: { demande: { directionId } },
      include: { _count: { select: { candidatures: true } } }
    });
    
    const candidatures = await prisma.candidature.findMany({
      where: { offre: { demande: { directionId } } },
      include: { offre: true }
    });
    
    const entretiens = await prisma.entretien.findMany({
      where: { candidature: { offre: { demande: { directionId } } } },
      include: { candidature: true }
    });
    
    // Structure similaire à getStatsForDRH mais filtrée par direction
    const tendances = await this.getTendances('', 'DIRECTEUR', directionId);
    
    return {
      kpis: {
        delaiMoyenRecrutement: this.calculerDelaiMoyenRecrutement(demandes.flatMap(d => d.validations)),
        tauxTransformation: this.calculerTauxTransformation(candidatures),
        coutMoyenRecrutement: Math.round((demandes.reduce((s, d) => s + (Number(d.budgetMax) || 0), 0) / (demandes.length || 1)) * 0.3),
        tauxSatisfaction: this.calculerMoyenneEvaluation(entretiens) * 10,
        tauxValidationDemandes: this.calculerTauxValidationDemandes(demandes),
        delaiMoyenValidation: this.calculerDelaiMoyenRecrutement(demandes.flatMap(d => d.validations))
      },
      demandes: {
        total: demandes.length,
        enCours: demandes.filter(d => !['VALIDEE', 'REJETEE', 'ANNULEE'].includes(d.statut)).length,
        validees: demandes.filter(d => d.statut === 'VALIDEE').length,
        rejetees: demandes.filter(d => d.statut === 'REJETEE').length,
        tauxValidation: this.calculerTauxValidationDemandes(demandes),
        parNiveau: demandes.reduce((acc, d) => { acc[d.niveau] = (acc[d.niveau] || 0) + 1; return acc; }, {} as Record<string, number>)
      },
      offres: {
        total: offres.length,
        publiees: offres.filter(o => o.statut === 'PUBLIEE').length,
        brouillons: offres.filter(o => o.statut === 'BROUILLON').length,
        cloturees: offres.filter(o => o.statut === 'CLOTUREE').length,
        tauxPublication: offres.length ? Math.round((offres.filter(o => o.statut === 'PUBLIEE').length / offres.length) * 100) : 0
      },
      candidatures: {
        total: candidatures.length,
        nouvelles: candidatures.filter(c => c.statut === 'NOUVELLE').length,
        preselectionnees: candidatures.filter(c => c.statut === 'PRESELECTIONNEE').length,
        entretien: candidatures.filter(c => c.statut === 'ENTRETIEN').length,
        acceptees: candidatures.filter(c => c.statut === 'ACCEPTEE').length,
        refusees: candidatures.filter(c => c.statut === 'REFUSEE').length,
        tauxAcceptation: this.calculerTauxTransformation(candidatures),
        parOffre: []
      },
      entretiens: {
        total: entretiens.length,
        planifies: entretiens.filter(e => e.statut === 'PLANIFIE').length,
        realises: entretiens.filter(e => e.statut === 'REALISE').length,
        aVenir: entretiens.filter(e => new Date(e.date) > new Date()).length,
        tauxRealisation: entretiens.length ? Math.round((entretiens.filter(e => e.statut === 'REALISE').length / entretiens.length) * 100) : 0,
        moyenneEvaluation: this.calculerMoyenneEvaluation(entretiens),
        parType: []
      },
      activiteRecente: {
        demandes: demandes.slice(0, 5).map(d => ({ reference: d.reference, intitulePoste: d.intitulePoste, statut: d.statut, date: d.createdAt, createur: d.createur?.prenom + ' ' + d.createur?.nom })),
        candidatures: candidatures.slice(0, 5).map(c => ({ reference: c.reference, nom: c.nom, prenom: c.prenom, date: c.dateSoumission, offre: c.offre?.intitule || '' })),
        offres: offres.slice(0, 5).map(o => ({ reference: o.reference, intitule: o.intitule, statut: o.statut, date: o.createdAt })),
        entretiens: entretiens.slice(0, 5).map(e => ({ type: e.type, candidat: e.candidature?.prenom + ' ' + e.candidature?.nom, date: e.date, statut: e.statut }))
      },
      tendances
    };
  }

  async getStatsForDAF(): Promise<DashboardStats> {
    const demandes = await prisma.demandeRecrutement.findMany({
      where: { statut: { in: ['EN_VALIDATION_DAF', 'EN_VALIDATION_DGA', 'EN_VALIDATION_DG', 'VALIDEE', 'REJETEE'] } },
      include: { validations: true }
    });
    
    const offres = await prisma.offreEmploi.findMany({
      include: { _count: { select: { candidatures: true } } }
    });
    
    const candidatures = await prisma.candidature.findMany();
    const entretiens = await prisma.entretien.findMany();
    
    const budgetTotal = demandes.reduce((s, d) => s + (Number(d.budgetMax) || 0), 0);
    const budgetValide = demandes.filter(d => d.statut === 'VALIDEE').reduce((s, d) => s + (Number(d.budgetMax) || 0), 0);
    const budgetRejete = demandes.filter(d => d.statut === 'REJETEE').reduce((s, d) => s + (Number(d.budgetMax) || 0), 0);
    
    return {
      kpis: {
        delaiMoyenRecrutement: 0,
        tauxTransformation: 0,
        coutMoyenRecrutement: Math.round(budgetTotal / (demandes.length || 1)),
        tauxSatisfaction: 0,
        tauxValidationDemandes: this.calculerTauxValidationDemandes(demandes),
        delaiMoyenValidation: this.calculerDelaiMoyenRecrutement(demandes.flatMap(d => d.validations))
      },
      demandes: {
        total: demandes.length,
        enCours: demandes.filter(d => d.statut === 'EN_VALIDATION_DAF' || d.statut === 'EN_VALIDATION_DGA' || d.statut === 'EN_VALIDATION_DG').length,
        validees: demandes.filter(d => d.statut === 'VALIDEE').length,
        rejetees: demandes.filter(d => d.statut === 'REJETEE').length,
        tauxValidation: this.calculerTauxValidationDemandes(demandes),
        parNiveau: demandes.reduce((acc, d) => { acc[d.niveau] = (acc[d.niveau] || 0) + 1; return acc; }, {} as Record<string, number>)
      },
      offres: {
        total: offres.length,
        publiees: offres.filter(o => o.statut === 'PUBLIEE').length,
        brouillons: offres.filter(o => o.statut === 'BROUILLON').length,
        cloturees: offres.filter(o => o.statut === 'CLOTUREE').length,
        tauxPublication: 0
      },
      candidatures: {
        total: candidatures.length,
        nouvelles: candidatures.filter(c => c.statut === 'NOUVELLE').length,
        preselectionnees: candidatures.filter(c => c.statut === 'PRESELECTIONNEE').length,
        entretien: candidatures.filter(c => c.statut === 'ENTRETIEN').length,
        acceptees: candidatures.filter(c => c.statut === 'ACCEPTEE').length,
        refusees: candidatures.filter(c => c.statut === 'REFUSEE').length,
        tauxAcceptation: 0,
        parOffre: []
      },
      entretiens: {
        total: entretiens.length,
        planifies: entretiens.filter(e => e.statut === 'PLANIFIE').length,
        realises: entretiens.filter(e => e.statut === 'REALISE').length,
        aVenir: entretiens.filter(e => new Date(e.date) > new Date()).length,
        tauxRealisation: 0,
        moyenneEvaluation: 0,
        parType: []
      },
      activiteRecente: {
        demandes: demandes.slice(0, 5).map(d => ({ reference: d.reference, intitulePoste: d.intitulePoste, statut: d.statut, date: d.createdAt })),
        candidatures: [],
        offres: offres.slice(0, 5).map(o => ({ reference: o.reference, intitule: o.intitule, statut: o.statut, date: o.createdAt })),
        entretiens: []
      },
      tendances: await this.getTendances('', 'DAF')
    };
  }

  async getStatsForDGA(): Promise<DashboardStats> {
    const stats = await this.getStatsForDAF();
    stats.demandes.enCours = stats.demandes.demandes?.filter(d => d.statut === 'EN_VALIDATION_DGA' || d.statut === 'EN_VALIDATION_DG')?.length || 0;
    return stats;
  }

  async getStatsForDG(): Promise<DashboardStats> {
    const stats = await this.getStatsForDAF();
    stats.demandes.enCours = stats.demandes.demandes?.filter(d => d.statut === 'EN_VALIDATION_DG')?.length || 0;
    return stats;
  }

  async getStatsForPaie(): Promise<DashboardStats> {
    const contrats = await prisma.contrat.findMany({
      include: { candidature: true }
    });
    
    const evaluationsPE = await prisma.evaluationPE.findMany({
      include: { employe: true }
    });
    
    const candidaturesAcceptees = await prisma.candidature.findMany({
      where: { statut: 'ACCEPTEE' }
    });
    
    return {
      kpis: {
        delaiMoyenRecrutement: 0,
        tauxTransformation: 0,
        coutMoyenRecrutement: 0,
        tauxSatisfaction: 0,
        tauxValidationDemandes: 0,
        delaiMoyenValidation: 0
      },
      demandes: { total: 0, enCours: 0, validees: 0, rejetees: 0, tauxValidation: 0, parNiveau: {} },
      offres: { total: 0, publiees: 0, brouillons: 0, cloturees: 0, tauxPublication: 0 },
      candidatures: {
        total: candidaturesAcceptees.length,
        nouvelles: 0,
        preselectionnees: 0,
        entretien: 0,
        acceptees: candidaturesAcceptees.length,
        refusees: 0,
        tauxAcceptation: 100,
        parOffre: []
      },
      entretiens: { total: 0, planifies: 0, realises: 0, aVenir: 0, tauxRealisation: 0, moyenneEvaluation: 0, parType: [] },
      activiteRecente: {
        demandes: [],
        candidatures: candidaturesAcceptees.slice(0, 5).map(c => ({ reference: c.reference, nom: c.nom, prenom: c.prenom, date: c.dateSoumission, offre: '' })),
        offres: [],
        entretiens: []
      },
      tendances: await this.getTendances('', 'PAIE')
    };
  }
}

export const statsService = new StatsService();