// backend/src/controllers/candidatureController.ts

import { Request, Response } from 'express';
import path from 'path';
import prisma from '../config/prisma';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/helpers';
import { iaService } from '../services/ia.service';
import fetch from 'node-fetch';
import { emailService } from '../services/email.service';

// GENERER UNE REFERENCE UNIQUE

const generateReference = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.candidature.count({
    where: { reference: { startsWith: `CAND-${year}` } }
  });
  return `CAND-${year}-${String(count + 1).padStart(4, '0')}`;
};


// CONSTRUIRE LE CHEMIN ABSOLU DU CV

const getCvAbsPath = (cvUrl: string): string => {
  // cvUrl ressemble à "/uploads/cv/cv_1234567890.pdf"
  const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
  return path.join(uploadsDir, cvUrl.replace(/^\/uploads\//, ''));
};


// SOUMETTRE UNE CANDIDATURE (public)


export const soumettreCandidature = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const {
      nom,
      prenom,
      email,
      telephone,
      cvUrl,
      consentementRGPD,
      consentementIA
    } = req.body;

    if (!nom || !prenom || !email || !cvUrl) {
      return sendError(res, 'Nom, prenom, email et CV sont obligatoires', 400);
    }

    if (!consentementRGPD) {
      return sendError(res, 'Le consentement RGPD est obligatoire', 400);
    }

    const offre = await prisma.offreEmploi.findFirst({
      where: {
        lienCandidature: { contains: token },
        statut: 'PUBLIEE'
      },
      include: { demande: true }
    });

    if (!offre) {
      return sendNotFound(res, 'Offre non trouvee ou non publiee');
    }

    const candidatureExistante = await prisma.candidature.findFirst({
      where: { email, offreId: offre.id }
    });

    if (candidatureExistante) {
      return sendError(res, 'Vous avez deja postule a cette offre', 400);
    }

    const reference = await generateReference();

    //  Parser le CV via l'API IA pour obtenir cvTexte
    let cvTexte = '';
    let competencesDetectees: string[] = [];
    
    if (cvUrl && consentementIA) {
      try {
        const cvAbsPath = getCvAbsPath(cvUrl);
        // Appeler l'API /parse-cv pour extraire le texte
        const parseResult = await iaService.parseCV(cvAbsPath);
        if (parseResult.success) {
          cvTexte = parseResult.texte_brut || '';
          competencesDetectees = parseResult.competences || [];
          console.log(` CV parsé: ${cvTexte.length} caractères, ${competencesDetectees.length} compétences`);
        }
      } catch (err) {
        console.error(` Parsing CV échoué:`, err);
      }
    }

    // 1. Créer la candidature AVEC le cvTexte parsé
    const candidature = await prisma.candidature.create({
      data: {
        reference,
        nom,
        prenom,
        email,
        telephone,
        cvUrl,
        cvTexte,
        scoreGlobal: 0,
        scoreExp: 0,
        competencesDetectees: competencesDetectees,
        competencesManquantes: [],
        statut: 'NOUVELLE',
        consentementRGPD,
        consentementIA: consentementIA || false,
        offreId: offre.id
      }
    });

    // 2. Calculer le score IA (si consentement)
    let scoringResult = null;
    
    if (consentementIA && cvUrl) {
      try {
        const cvAbsPath = getCvAbsPath(cvUrl);
        scoringResult = await iaService.scorerCV(cvAbsPath, offre.id, candidature.id);
        console.log(` Scoring IA terminé pour ${candidature.reference}: ${scoringResult.score_global}/100`);
      } catch (err) {
        console.error(` Scoring IA échoué pour ${candidature.reference}:`, err);
      }
    }

    // 3. Mettre à jour la candidature avec le score calculé
    let candidatureMaj = candidature;
    if (scoringResult && scoringResult.success) {
      candidatureMaj = await prisma.candidature.update({
        where: { id: candidature.id },
        data: {
          scoreGlobal: scoringResult.score_global,
          scoreExp: scoringResult.score_experience,
          competencesDetectees: scoringResult.competences_detectees || competencesDetectees,
          competencesManquantes: scoringResult.competences_manquantes,
        },
        include: { offre: true }
      });
    }

    sendCreated(res, {
      candidature: {
        id: candidatureMaj.id,
        reference: candidatureMaj.reference,
        statut: candidatureMaj.statut,
        scoreGlobal: candidatureMaj.scoreGlobal,
        scoreExp: candidatureMaj.scoreExp,
        competencesDetectees: candidatureMaj.competencesDetectees,
        competencesManquantes: candidatureMaj.competencesManquantes,
      }
    }, 'Candidature envoyee avec succes');

  } catch (error) {
    console.error('soumettreCandidature error:', error);
    sendError(res, 'Erreur lors de la soumission de la candidature');
  }
};


// RELANCER LE SCORING IA D'UNE CANDIDATURE

export const rescorerCandidature = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user?.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Non autorisé', 403);
    }

    const candidature = await prisma.candidature.findUnique({
      where: { id },
      include: { offre: true }
    });

    if (!candidature) {
      return sendNotFound(res, 'Candidature non trouvée');
    }

    if (!candidature.cvUrl || !candidature.offreId) {
      return sendError(res, 'CV ou offre manquant pour le scoring', 400);
    }

    const cvAbsPath = getCvAbsPath(candidature.cvUrl);
    const scoring = await iaService.scorerCV(cvAbsPath, candidature.offreId, candidature.id);

    return sendSuccess(res, {
      scoreGlobal:           scoring.score_global,
      scoreExp:              scoring.score_experience,
      recommandation:        scoring.recommandation,
      competencesDetectees:  scoring.competences_detectees,
      competencesManquantes: scoring.competences_manquantes,
      shapDetails:           scoring.shap_details,
      versionModele:         scoring.version_modele,
    }, 'Score recalculé avec succès');

  } catch (error) {
    console.error('rescorerCandidature error:', error);
    return sendError(res, 'Erreur lors du rescoring');
  }
};


// RECUPERER TOUTES LES CANDIDATURES

export const getCandidatures = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const { page = 1, limit = 100, statut, offreId, type } = req.query;

    const where: any = {};

    if (statut) where.statut = statut;

    if (type === 'actifs') {
      where.offreId = { not: null };
    } else if (type === 'passifs') {
      where.offreId = null;
    } else if (offreId) {
      where.offreId = offreId;
    }

    if (
      userRole !== 'DRH' &&
      userRole !== 'SUPER_ADMIN' &&
      userRole !== 'MANAGER' &&
      userRole !== 'RESP_PAIE'
    ) {
      return sendError(res, 'Non autorise', 403);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [candidatures, total] = await Promise.all([
      prisma.candidature.findMany({
        where,
        include: {
          offre: {
            select: {
              id: true,
              reference: true,
              intitule: true,
              demande: {
                select: { id: true, niveau: true }
              }
            }
          }
        },
        orderBy: { dateSoumission: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.candidature.count({ where })
    ]);

    const actifsCount = await prisma.candidature.count({
      where: { offreId: { not: null } }
    });
    const passifsCount = await prisma.candidature.count({
      where: { offreId: null }
    });

    sendSuccess(res, {
      candidatures,
      stats: { total, actifs: actifsCount, passifs: passifsCount },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('getCandidatures error:', error);
    sendError(res, 'Erreur lors de la recuperation des candidatures');
  }
};


// RECUPERER LES CANDIDATURES ACCEPTEES (toutes)

export const getCandidaturesAcceptees = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;

    if (userRole !== 'RESP_PAIE' && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Non autorise', 403);
    }

    const candidatures = await prisma.candidature.findMany({
      where: { statut: 'ACCEPTEE' },
      include: {
        offre: {
          select: { id: true, reference: true, intitule: true }
        }
      },
      orderBy: { dateSoumission: 'desc' }
    });

    sendSuccess(res, { candidatures });

  } catch (error) {
    console.error('getCandidaturesAcceptees error:', error);
    sendError(res, 'Erreur lors de la recuperation');
  }
};


// RECUPERER LES CANDIDATURES ACCEPTEES SANS CONTRAT

export const getCandidaturesAccepteesSansContrat = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;

    if (userRole !== 'RESP_PAIE' && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Non autorise', 403);
    }

    const candidatures = await prisma.candidature.findMany({
      where: {
        statut: 'ACCEPTEE',
        contrat: null
      },
      include: {
        offre: {
          select: { id: true, reference: true, intitule: true }
        }
      },
      orderBy: { dateSoumission: 'desc' }
    });

    console.log(` Candidatures ACCEPTEE sans contrat: ${candidatures.length}`);
    sendSuccess(res, { candidatures });

  } catch (error) {
    console.error('getCandidaturesAccepteesSansContrat error:', error);
    sendError(res, 'Erreur lors de la recuperation');
  }
};


// RECUPERER UNE CANDIDATURE PAR ID

export const getCandidatureById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 'ID manquant', 400);
    }

    const candidature = await prisma.candidature.findUnique({
      where: { id },
      include: {
        offre: {
          include: {
            demande: {
              select: { id: true, niveau: true }
            }
          }
        },
        entretiens: {
          include: {
            interviewer: {
              select: { id: true, nom: true, prenom: true, role: true }
            }
          },
          orderBy: { date: 'asc' }
        },
        contrat: true
      }
    });

    if (!candidature) {
      return sendNotFound(res, 'Candidature non trouvee');
    }

    //  Récupérer les détails IA depuis le microservice
    let iaDetails = null;
    if (candidature.offreId && candidature.cvUrl) {
      try {
        const cvAbsPath = getCvAbsPath(candidature.cvUrl);
        const scoring = await iaService.scorerCV(cvAbsPath, candidature.offreId, candidature.id);
        iaDetails = {
          recommandation: scoring.recommandation,
          shapDetails: scoring.shap_details,
          versionModele: scoring.version_modele,
          scoreGlobal: scoring.score_global,
          scoreExp: scoring.score_experience,
          competencesDetectees: scoring.competences_detectees,
          competencesManquantes: scoring.competences_manquantes,
        };
        
        // Mettre à jour la BDD avec les scores si nécessaire
        if (candidature.scoreGlobal !== scoring.score_global) {
          await prisma.candidature.update({
            where: { id: candidature.id },
            data: {
              scoreGlobal: scoring.score_global,
              scoreExp: scoring.score_experience,
              competencesDetectees: scoring.competences_detectees,
              competencesManquantes: scoring.competences_manquantes,
            }
          });
        }
      } catch (err) {
        console.error('Erreur récupération scoring IA:', err);
      }
    }

    // Fusionner les données
    const responseData = {
      ...candidature,
      recommandation: iaDetails?.recommandation || 'FAIBLE',
      shapDetails: iaDetails?.shapDetails || [],
      versionModele: iaDetails?.versionModele || 'M3-Hybride-v1.0',
    };

    return sendSuccess(res, { candidature: responseData });

  } catch (error) {
    console.error('getCandidatureById error:', error);
    return sendError(res, 'Erreur lors de la recuperation de la candidature');
  }
};


// CHANGER LE STATUT D'UNE CANDIDATURE

export const updateCandidatureStatut = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const statutsValides = [
      'NOUVELLE', 'PRESELECTIONNEE', 'FICHE_ENVOYEE',
      'FICHE_RECUE', 'ENTRETIEN', 'ACCEPTEE', 'REFUSEE'
    ];
    if (!statutsValides.includes(statut)) {
      return sendError(res, 'Statut invalide', 400);
    }

    const candidature = await prisma.candidature.update({
      where: { id },
      data: { statut },
      include: { offre: true }
    });

    // ── MLOps : envoyer le feedback à l'IA si décision finale ──
    if (statut === 'ACCEPTEE' || statut === 'REFUSEE') {
      try {
        const cvParsed = {
          raw_text:               candidature.cvTexte || '',
          competences_detectees:  candidature.competencesDetectees,
          competences_manquantes: candidature.competencesManquantes,
          score_experience:       candidature.scoreExp,
        };

        const feedbackRes = await fetch(`${process.env.IA_SERVICE_URL}/ai/feedback`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cv_parsed:       cvParsed,
            score_ia:        (candidature.scoreGlobal || 0) / 100,
            decision_finale: statut === 'ACCEPTEE' ? 'RETENU' : 'REJETE',
            offre_id:        candidature.offreId || '',
          }),
        });

        const feedbackData = await feedbackRes.json() as any;
        console.log(' Feedback raw response:', JSON.stringify(feedbackData));
        // Si seuil atteint → déclencher GitHub Actions via n8n webhook
        if (feedbackData.threshold_reached) {
  console.log('Seuil atteint — declenchement du re-entrainement IA');

  const githubRes = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/workflows/retrain.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  );

  if (githubRes.ok) {
    console.log('GitHub Actions declenche — re-entrainement lance');
  } else {
    const err = await githubRes.text();
    console.error('Erreur declenchement GitHub Actions:', err);
  }
} {
          console.log(' Seuil atteint — déclenchement du ré-entraînement IA');
          // n8n s'occupera de déclencher GitHub Actions
          // (le webhook n8n est configuré séparément)
        }

      } catch (err) {
        // Ne pas bloquer la réponse si le feedback échoue
        console.error(' Feedback MLOps échoué (non bloquant):', err);
      }
    }

    sendSuccess(res, candidature, `Statut mis a jour : ${statut}`);

  } catch (error) {
    console.error('updateCandidatureStatut error:', error);
    sendError(res, 'Erreur lors de la mise a jour du statut');
  }
};


// SUPPRIMER UNE CANDIDATURE

export const deleteCandidature = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.candidature.delete({ where: { id } });

    sendSuccess(res, null, 'Candidature supprimee avec succes');

  } catch (error) {
    console.error('deleteCandidature error:', error);
    sendError(res, 'Erreur lors de la suppression');
  }
};


// RECUPERER L'OFFRE PAR TOKEN (public)

export const getOffreByToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const offre = await prisma.offreEmploi.findFirst({
      where: {
        lienCandidature: { contains: token },
        statut: 'PUBLIEE'
      },
      select: {
        id: true,
        reference: true,
        intitule: true,
        description: true,
        profilRecherche: true,
        competences: true,
        fourchetteSalariale: true,
        typeContrat: true
      }
    });

    if (!offre) {
      return sendNotFound(res, 'Offre non trouvée ou expirée');
    }

    sendSuccess(res, { offre });
  } catch (error) {
    console.error('getOffreByToken error:', error);
    sendError(res, 'Erreur lors de la récupération de l\'offre');
  }
};


// UPLOAD DE CV (public)

export const uploadCV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, 'Aucun fichier fourni', 400);
    }

    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const extension = originalName.split('.').pop();
    const filename = `cv_${timestamp}.${extension}`;
    const cvUrl = `/uploads/cv/${filename}`;

    // Sauvegarder le fichier
    const fs = require('fs');
    const uploadDir = path.join(__dirname, '../../uploads/cv');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const targetPath = path.join(uploadDir, filename);
    fs.renameSync(req.file.path, targetPath);

    sendSuccess(res, { cvUrl }, 'CV uploadé avec succès');
  } catch (error) {
    console.error('uploadCV error:', error);
    sendError(res, 'Erreur lors de l\'upload du CV');
  }
};


// ENVOYER LA FICHE DE RENSEIGNEMENT

export const envoyerFicheRenseignement = async (req: Request, res: Response) => {
  try {
    const { candidatureId } = req.params;
    const userRole = (req as any).user.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Non autorisé', 403);
    }

    const candidature = await prisma.candidature.findUnique({
      where: { id: candidatureId },
      include: { offre: true }
    });

    if (!candidature) {
      return sendNotFound(res, 'Candidature non trouvée');
    }

    if (candidature.statut !== 'PRESELECTIONNEE') {
      return sendError(res, 'La fiche ne peut être envoyée qu\'à un candidat présélectionné', 400);
    }

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const ficheUrl = `${process.env.FRONTEND_URL}/fiche-renseignement/${token}`;

    await prisma.candidature.update({
      where: { id: candidatureId },
      data: {
        ficheRenseignementEnvoyee: true,
        ficheRenseignementEnvoyeeAt: new Date(),
        ficheRenseignementToken: token,
        statut: 'FICHE_ENVOYEE'
      }
    });

await emailService.sendFicheRenseignement({
      nom: candidature.nom,
      prenom: candidature.prenom,
      email: candidature.email,
      ficheUrl,
      poste: candidature.offre?.intitule || ''
    });

    sendSuccess(res, { token, ficheUrl }, 'Fiche de renseignement envoyée avec succès');
  } catch (error) {
    console.error('envoyerFicheRenseignement error:', error);
    sendError(res, 'Erreur lors de l\'envoi de la fiche');
  }
};


// RECUPERER LA FICHE DE RENSEIGNEMENT (public)

export const getFicheRenseignement = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const candidature = await prisma.candidature.findFirst({
      where: {
        ficheRenseignementToken: token,
        ficheRenseignementEnvoyee: true,
        ficheRenseignementRecue: false
      },
      include: {
        offre: { select: { intitule: true } }
      }
    });

    if (!candidature) {
      return sendNotFound(res, 'Fiche invalide ou déjà soumise');
    }

    sendSuccess(res, {
      token,
      candidat: {
        nom: candidature.nom,
        prenom: candidature.prenom,
        email: candidature.email,
        poste: candidature.offre?.intitule || ''
      }
    });
  } catch (error) {
    console.error('getFicheRenseignement error:', error);
    sendError(res, 'Erreur lors de la récupération de la fiche');
  }
};


// SOUMETTRE LA FICHE DE RENSEIGNEMENT (public)

export const soumettreFicheRenseignement = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { data } = req.body;

    const candidature = await prisma.candidature.findFirst({
      where: {
        ficheRenseignementToken: token,
        ficheRenseignementEnvoyee: true,
        ficheRenseignementRecue: false
      }
    });

    if (!candidature) {
      return sendNotFound(res, 'Fiche invalide ou déjà soumise');
    }

    await prisma.candidature.update({
      where: { id: candidature.id },
      data: {
        ficheRenseignementRecue: true,
        ficheRenseignementRecueAt: new Date(),
        ficheRenseignementData: data,
        statut: 'FICHE_RECUE'
      }
    });

    sendSuccess(res, null, 'Fiche de renseignement soumise avec succès');
  } catch (error) {
    console.error('soumettreFicheRenseignement error:', error);
    sendError(res, 'Erreur lors de la soumission de la fiche');
  }
};


// RECUPERER LA FICHE PAR ID CANDIDATURE

export const getFicheByCandidatureId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const candidature = await prisma.candidature.findUnique({
      where: { id },
      select: {
        ficheRenseignementData: true,
        ficheRenseignementRecue: true,
        ficheRenseignementRecueAt: true,
        nom: true,
        prenom: true
      }
    });

    if (!candidature) {
      return sendNotFound(res, 'Candidature non trouvée');
    }

    sendSuccess(res, {
      ficheData: candidature.ficheRenseignementData,
      recue: candidature.ficheRenseignementRecue,
      recueAt: candidature.ficheRenseignementRecueAt
    });
  } catch (error) {
    console.error('getFicheByCandidatureId error:', error);
    sendError(res, 'Erreur lors de la récupération de la fiche');
  }
};
export const classifierCandidaturesOffre = async (req: Request, res: Response) => {
  try {
    const { offreId } = req.params;
    const userRole = (req as any).user?.role;

    if (userRole !== 'DRH' && userRole !== 'SUPER_ADMIN') {
      return sendError(res, 'Non autorisé', 403);
    }

    // Récupérer toutes les candidatures NOUVELLE de cette offre
const candidatures = await prisma.candidature.findMany({
  where: {
    offreId,
    statut: { notIn: ['ACCEPTEE', 'REFUSEE'] }, // exclut seulement les décisions finales
  },
  select: { id: true, scoreGlobal: true, statut: true },
});

    if (candidatures.length === 0) {
      return sendSuccess(res, { classes: [], total: 0 }, 'Aucune candidature à classifier');
    }

    // ── Stratégie S3 : Percentile dynamique ──────────────────────────────────
    const scores = candidatures.map(c => c.scoreGlobal);
    const n      = scores.length;

    const percentile = (arr: number[], p: number) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx    = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, idx)];
    };

    const seuilEntretien    = percentile(scores, 85);
    const seuilPreselection = percentile(scores, 60);
    const seuilNouvelle     = percentile(scores, 35);
    const PLANCHER          = 45;

    const classifier = (score: number): string => {
      if (score < PLANCHER)            return 'REFUSEE';
      if (score >= seuilEntretien)     return 'ENTRETIEN';
      if (score >= seuilPreselection)  return 'PRESELECTIONNEE';
      if (score >= seuilNouvelle)      return 'NOUVELLE';
      return 'REFUSEE';
    };

    // ── Appliquer en base (transaction) ──────────────────────────────────────
    const updates = await prisma.$transaction(
      candidatures.map(c =>
        prisma.candidature.update({
          where: { id: c.id },
          data:  { statut: classifier(c.scoreGlobal) },
        })
      )
    );

    // ── Résumé ────────────────────────────────────────────────────────────────
    const resume = { ENTRETIEN: 0, PRESELECTIONNEE: 0, NOUVELLE: 0, REFUSEE: 0 };
    updates.forEach(c => {
      if (c.statut in resume) resume[c.statut as keyof typeof resume]++;
    });

    return sendSuccess(res, {
      total: candidatures.length,
      seuils: {
        entretien:     seuilEntretien,
        preselection:  seuilPreselection,
        nouvelle:      seuilNouvelle,
        plancher:      PLANCHER,
      },
      resume,
      classes: updates.map(c => ({ id: c.id, statut: c.statut, score: c.scoreGlobal })),
    }, `${candidatures.length} candidature(s) classifiées automatiquement`);

  } catch (error) {
    console.error('classifierCandidaturesOffre error:', error);
    return sendError(res, 'Erreur lors de la classification');
  }
};