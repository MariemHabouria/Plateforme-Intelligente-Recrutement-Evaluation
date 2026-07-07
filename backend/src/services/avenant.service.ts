import prisma from '../config/prisma';

interface AppliquerAvenantParams {
  contratId: string;
  employeId?: string;
  typeAvenant: string;
  description: string;
  dateEffet: Date;
  nouveauSalaire?: string | null;
  nouvelleDateFin?: Date | null;
  nouveauPoste?: string | null;
  nouvelleDirectionId?: string | null;
  dateResiliation?: Date | null;
  motifResiliation?: string | null;
}

export const avenantService = {
  async appliquerAvenant(params: AppliquerAvenantParams) {
    const {
      contratId, employeId, typeAvenant, description, dateEffet,
      nouveauSalaire, nouvelleDateFin, nouveauPoste, nouvelleDirectionId,
      dateResiliation, motifResiliation
    } = params;

    const descriptionComplete = motifResiliation
      ? `${description} — Motif de résiliation: ${motifResiliation}`
      : description;

    const avenant = await prisma.avenant.create({
      data: { typeAvenant, description: descriptionComplete, date: dateEffet, contratId }
    });

    // ── Contrat : salaire / dates ──
    const dataContrat: any = {};
    if (nouveauSalaire) dataContrat.salaire = nouveauSalaire;
    if (nouvelleDateFin) dataContrat.dateFin = nouvelleDateFin;

    // RUPTURE : le contrat passe à RESILIE, avec la date de résiliation
    // comme date de fin réelle — ce n'est pas un avenant "cosmétique",
    // c'est une fin de contrat.
    if (typeAvenant === 'RUPTURE') {
      dataContrat.statut = 'RESILIE';
      if (dateResiliation) dataContrat.dateFin = dateResiliation;
    }

    if (Object.keys(dataContrat).length > 0) {
      await prisma.contrat.update({ where: { id: contratId }, data: dataContrat });
    }

    // CHANGEMENT : le poste et/ou la direction de l'employé changent
    // réellement — sinon la proposition n'a aucun effet visible dans
    // l'annuaire RH / les écrans employé.
    if (employeId && (nouveauPoste || nouvelleDirectionId)) {
      const dataEmploye: any = {};
      if (nouveauPoste) dataEmploye.poste = nouveauPoste;
      if (nouvelleDirectionId) dataEmploye.directionId = nouvelleDirectionId;
      await prisma.user.update({ where: { id: employeId }, data: dataEmploye });

      // On garde aussi une trace dans donneesContrat.poste, pour cohérence
      // avec ce qui est affiché sur le PDF du contrat (contratController.ts
      // lit donneesContrat.poste.intitule / .direction).
      const contrat = await prisma.contrat.findUnique({ where: { id: contratId } });
      const donnees = (contrat?.donneesContrat as any) || {};
      await prisma.contrat.update({
        where: { id: contratId },
        data: {
          donneesContrat: {
            ...donnees,
            poste: {
              ...(donnees.poste || {}),
              ...(nouveauPoste ? { intitule: nouveauPoste } : {})
            }
          }
        }
      });
    }

    return avenant;
  }
};