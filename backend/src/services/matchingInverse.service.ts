import prisma from '../config/prisma';
import { iaService, MatchCandidat } from './ia.service';

export const matchingInverseService = {

  async executerMatching(offreId: string): Promise<MatchCandidat[]> {
    const result = await iaService.matchingInverse(offreId, 20);
    return result.shortlist;
  },

  async creerCandidaturesMatching(offreId: string, candidatureIds: string[]): Promise<number> {
    // Récupérer les candidatures sources (offreId peut être ≠ offreId cible)
    const sources = await prisma.candidature.findMany({
      where: { id: { in: candidatureIds } },
    });

    if (sources.length === 0) return 0;

    // Exclure les emails déjà candidats sur l'offre cible
    const emailsDejaPresents = await prisma.candidature.findMany({
      where: { offreId, email: { in: sources.map(s => s.email) } },
      select: { email: true },
    });
    const emailsExclus = new Set(emailsDejaPresents.map(c => c.email));

    const aCreer = sources.filter(s => !emailsExclus.has(s.email));
    if (aCreer.length === 0) return 0;

    // Générer les références
    const year = new Date().getFullYear();
    const baseCount = await prisma.candidature.count({
      where: { reference: { startsWith: `CAND-${year}` } },
    });

    const nouvelles = aCreer.map((src, i) => ({
      reference:               `CAND-${year}-${String(baseCount + i + 1).padStart(4, '0')}`,
      nom:                     src.nom,
      prenom:                  src.prenom,
      email:                   src.email,
      telephone:               src.telephone,
      cvUrl:                   src.cvUrl,
      cvTexte:                 src.cvTexte,
      scoreGlobal:             src.scoreGlobal,
      scoreExp:                src.scoreExp,
      competencesDetectees:    src.competencesDetectees,
      competencesManquantes:   src.competencesManquantes,
      consentementRGPD:        src.consentementRGPD,
      consentementIA:          src.consentementIA,
      statut:                  'MATCHING_INVERSE',
      offreId,
    }));

    await prisma.candidature.createMany({ data: nouvelles });
    return nouvelles.length;
  },
};