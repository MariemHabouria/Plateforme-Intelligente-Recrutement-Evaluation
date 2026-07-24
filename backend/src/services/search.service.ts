import prisma from '../config/prisma'

export const searchService = {
  async globalSearch(query: string) {
    const q = query?.trim()
    if (!q || q.length < 2) {
      return { demandes: [], candidats: [], offres: [], contrats: [] }
    }

    const [demandes, candidats, offres, contrats] = await Promise.all([
      prisma.demandeRecrutement.findMany({
        where: {
          OR: [
            { intitulePoste: { contains: q, mode: 'insensitive' } },
            { reference: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, reference: true, intitulePoste: true, statut: true },
        take: 5,
      }),
      prisma.candidature.findMany({
        where: {
          OR: [
            { nom: { contains: q, mode: 'insensitive' } },
            { prenom: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { reference: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, reference: true, nom: true, prenom: true, statut: true },
        take: 5,
      }),
      prisma.offreEmploi.findMany({
        where: {
          OR: [
            { intitule: { contains: q, mode: 'insensitive' } },
            { reference: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, reference: true, intitule: true, statut: true },
        take: 5,
      }),
      prisma.contrat.findMany({
        where: { reference: { contains: q, mode: 'insensitive' } },
        select: { id: true, reference: true, typeContrat: true, statut: true },
        take: 5,
      }),
    ])

    return { demandes, candidats, offres, contrats }
  },
}