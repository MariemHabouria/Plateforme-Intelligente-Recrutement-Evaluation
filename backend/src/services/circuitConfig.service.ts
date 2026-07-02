import prisma from '../config/prisma';
import { CIRCUITS_PAR_DEFAUT } from '../config/constants';

export const circuitConfigService = {
  /**
   * Initialiser les circuits par défaut
   * (seuilMin/seuilMax restent dans la config, pas en DB)
   */
  async initDefaultCircuits() {
    const circuits = Object.values(CIRCUITS_PAR_DEFAUT);

    for (const circuit of circuits) {
      await prisma.circuitConfig.upsert({
        where: { type: circuit.type as any },
        update: {
          nom: circuit.nom,
          description: circuit.description,
          etapes: circuit.etapes,
          totalEtapes: circuit.totalEtapes,
          delaiParDefaut: circuit.delaiParDefaut,
          actif: true
        },
        create: {
          type: circuit.type as any,
          nom: circuit.nom,
          description: circuit.description,
          etapes: circuit.etapes,
          totalEtapes: circuit.totalEtapes,
          delaiParDefaut: circuit.delaiParDefaut,
          actif: true
        }
      });
    }

    console.log('Circuits de validation initialises');
  },

  /**
   * Recuperer tous les circuits actifs
   * (tri par seuilMin fait en JS via la config, car pas de colonne seuilMin en DB)
   */
  async getAllCircuits() {
    const circuits = await prisma.circuitConfig.findMany({
      where: { actif: true }
    });

    return circuits
      .map((c) => ({
        ...c,
        seuilMin: (CIRCUITS_PAR_DEFAUT as any)[c.type]?.seuilMin ?? 0,
        seuilMax: (CIRCUITS_PAR_DEFAUT as any)[c.type]?.seuilMax ?? Infinity
      }))
      .sort((a, b) => a.seuilMin - b.seuilMin);
  },

  /**
   * Determiner le circuit selon le budget
   * Le matching seuilMin/seuilMax se fait en JS sur la config statique,
   * puis on va chercher la CircuitConfig correspondante en DB par type.
   */
  async determinerCircuitParBudget(budget: number): Promise<any> {
    const circuitsConfig = Object.values(CIRCUITS_PAR_DEFAUT).sort(
      (a: any, b: any) => (a.seuilMin ?? 0) - (b.seuilMin ?? 0)
    );

    let typeTrouve: string | null = null;
    for (const circuit of circuitsConfig as any[]) {
      const seuilMin = circuit.seuilMin ?? 0;
      const seuilMax = circuit.seuilMax ?? Infinity;

      if (budget >= seuilMin && budget < seuilMax) {
        typeTrouve = circuit.type;
        break;
      }
    }

    if (!typeTrouve) {
      typeTrouve = (circuitsConfig[circuitsConfig.length - 1] as any).type;
    }

    const circuit = await prisma.circuitConfig.findUnique({
      where: { type: typeTrouve as any }
    });

    if (!circuit) {
      throw new Error(`Aucune CircuitConfig trouvee en DB pour le type ${typeTrouve}`);
    }

    return circuit;
  },

  /**
   * Mettre a jour un circuit
   */
  async updateCircuit(id: string, data: any, userId: string) {
    if (data.etapes) {
      const rolesValides = ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'];
      for (const etape of data.etapes) {
        if (!rolesValides.includes(etape.role)) {
          throw new Error(`Role invalide: ${etape.role}. Roles supportes: DIRECTEUR, DRH, DAF, DGA, DG`);
        }
        if (!etape.label || !etape.niveau) {
          throw new Error('Chaque etape doit avoir un niveau et un label');
        }
      }
    }

    // seuilMin/seuilMax ne sont pas des colonnes DB : on les retire
    // du payload si le front les envoie par erreur, pour eviter l'erreur Prisma.
    const { seuilMin, seuilMax, ...dataDb } = data;

    return await prisma.circuitConfig.update({
      where: { id },
      data: {
        ...dataDb,
        updatedAt: new Date()
      }
    });
  },

  /**
   * Creer un circuit personnalise
   */
  async createCircuit(data: any, userId: string) {
    const { seuilMin, seuilMax, ...dataDb } = data;

    return await prisma.circuitConfig.create({
      data: {
        ...dataDb,
        type: 'PERSONNALISE',
        actif: true
      }
    });
  },

  /**
   * Activer/Desactiver un circuit
   */
  async toggleCircuitActivation(id: string, actif: boolean) {
    return await prisma.circuitConfig.update({
      where: { id },
      data: { actif }
    });
  },

  /**
   * Recuperer un circuit par ID
   */
  async getCircuitById(id: string) {
    const circuit = await prisma.circuitConfig.findUnique({
      where: { id }
    });

    if (!circuit) return null;

    return {
      ...circuit,
      seuilMin: (CIRCUITS_PAR_DEFAUT as any)[circuit.type]?.seuilMin ?? 0,
      seuilMax: (CIRCUITS_PAR_DEFAUT as any)[circuit.type]?.seuilMax ?? Infinity
    };
  }
};