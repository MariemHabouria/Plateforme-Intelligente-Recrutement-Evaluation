import prisma from '../config/prisma';
import { CIRCUITS_PAR_DEFAUT } from '../config/constants';

export const circuitConfigService = {
  /**
   * Initialiser les circuits par défaut
   */
  async initDefaultCircuits() {
    const circuits = Object.values(CIRCUITS_PAR_DEFAUT);
    
    for (const circuit of circuits) {
      await prisma.circuitConfig.upsert({
        where: { type: circuit.type as any },
        update: {
          nom: circuit.nom,
          description: circuit.description,
          seuilMin: circuit.seuilMin,
          seuilMax: circuit.seuilMax,
          etapes: circuit.etapes,
          totalEtapes: circuit.totalEtapes,
          delaiParDefaut: circuit.delaiParDefaut,
          actif: true
        },
        create: {
          type: circuit.type as any,
          nom: circuit.nom,
          description: circuit.description,
          seuilMin: circuit.seuilMin,
          seuilMax: circuit.seuilMax,
          etapes: circuit.etapes,
          totalEtapes: circuit.totalEtapes,
          delaiParDefaut: circuit.delaiParDefaut,
          actif: true
        }
      });
    }
    
    console.log('✅ Circuits de validation initialisés');
  },

  /**
   * Récupérer tous les circuits actifs
   */
  async getAllCircuits() {
    return await prisma.circuitConfig.findMany({
      where: { actif: true },
      orderBy: { seuilMin: 'asc' }
    });
  },

  /**
   * Déterminer le circuit selon le budget
   */
  async determinerCircuitParBudget(budget: number): Promise<any> {
    const circuits = await prisma.circuitConfig.findMany({
      where: { actif: true },
      orderBy: { seuilMin: 'asc' }
    });

    for (const circuit of circuits) {
      const seuilMin = circuit.seuilMin ?? 0;
      const seuilMax = circuit.seuilMax ?? Infinity;
      
      if (budget >= seuilMin && budget < seuilMax) {
        return circuit;
      }
    }

    return circuits[circuits.length - 1];
  },

  /**
   * Mettre à jour un circuit
   */
  async updateCircuit(id: string, data: any, userId: string) {
    if (data.etapes) {
      const rolesValides = ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG', 'CONSEIL'];
      for (const etape of data.etapes) {
        if (!rolesValides.includes(etape.role)) {
          throw new Error(`Rôle invalide: ${etape.role}`);
        }
        if (!etape.label || !etape.niveau) {
          throw new Error('Chaque étape doit avoir un niveau et un label');
        }
      }
    }

    return await prisma.circuitConfig.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  },

  /**
   * Créer un circuit personnalisé
   */
  async createCircuit(data: any, userId: string) {
    return await prisma.circuitConfig.create({
      data: {
        ...data,
        type: 'PERSONNALISE',
        actif: true,
        createdBy: userId
      }
    });
  },

  /**
   * Activer/Désactiver un circuit
   */
  async toggleCircuitActivation(id: string, actif: boolean) {
    return await prisma.circuitConfig.update({
      where: { id },
      data: { actif }
    });
  },

  /**
   * Récupérer un circuit par ID
   */
  async getCircuitById(id: string) {
    return await prisma.circuitConfig.findUnique({
      where: { id }
    });
  }
};