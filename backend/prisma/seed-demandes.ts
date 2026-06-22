// backend/prisma/seed-demandes.ts
// Kilani Groupe — Seed complet des demandes de recrutement

import {
  PrismaClient,
  CircuitType,
  StatutDemande,
  Motif,
  TypeContrat,
  Priorite,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { triggerCircuitRecrutement } from '../src/services/n8nService';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

const n8nTriggers: Promise<any>[] = [];

// ============================================================
// CONFIGURATION DES NIVEAUX
// ============================================================
const NIVEAU_CONFIG: Record<string, {
  circuitType: CircuitType;
  budgetMin: number;
  budgetMax: number;
}> = {
  TECHNICIEN:      { circuitType: CircuitType.TECHNICIEN,      budgetMin: 900,   budgetMax: 1600  },
  EMPLOYE:         { circuitType: CircuitType.EMPLOYE,         budgetMin: 1100,  budgetMax: 2200  },
  CADRE_DEBUTANT:  { circuitType: CircuitType.CADRE_DEBUTANT,  budgetMin: 2200,  budgetMax: 3800  },
  CADRE_CONFIRME:  { circuitType: CircuitType.CADRE_CONFIRME,  budgetMin: 3800,  budgetMax: 6000  },
  CADRE_SUPERIEUR: { circuitType: CircuitType.CADRE_SUPERIEUR, budgetMin: 6000,  budgetMax: 10000 },
  STRATEGIQUE:     { circuitType: CircuitType.STRATEGIQUE,     budgetMin: 10000, budgetMax: 22000 },
};

// Configuration des circuits par niveau (SANS DG - il remplace DGA si inactif)
const VALIDATEURS_PAR_NIVEAU: Record<string, string[]> = {
  TECHNICIEN:      ['MANAGER', 'DIRECTEUR', 'DRH'],
  EMPLOYE:         ['MANAGER', 'DIRECTEUR', 'DRH'],
  CADRE_DEBUTANT:  ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF'],
  CADRE_CONFIRME:  ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA'],
  CADRE_SUPERIEUR: ['DIRECTEUR', 'DRH', 'DAF', 'DGA'],
  STRATEGIQUE:     ['DIRECTEUR', 'DRH', 'DAF', 'DGA'],
};

const NIVEAUX_AVEC_DIRECTION = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];
const NIVEAUX_AVEC_TECHNIQUE  = ['TECHNICIEN', 'EMPLOYE', 'CADRE_DEBUTANT', 'CADRE_CONFIRME'];

const getRoleLabel = (role: string): string => ({
  MANAGER: 'Manager', DIRECTEUR: 'Directeur', DRH: 'DRH',
  DAF: 'DAF', DGA: 'DGA', DG: 'DG',
}[role] ?? role);

// Fonction determinerCircuit corrigee
const determinerCircuit = async (niveau: string, createurRole: string) => {
  const dgaActif = await prisma.user.findFirst({
    where: { role: 'DGA', actif: true }
  });

  console.log(`   [circuit] DGA actif: ${dgaActif ? 'oui' : 'non -> DG prend le relais'}`);

  let validateurs = VALIDATEURS_PAR_NIVEAU[niveau] ?? ['DIRECTEUR', 'DRH'];

  // Si DGA inactif ou absent, remplacer DGA par DG
  if (!dgaActif) {
    validateurs = validateurs.map(role => role === 'DGA' ? 'DG' : role);
  }

  // Filtrer le createur
  validateurs = validateurs.filter(role => role !== createurRole);

  return {
    etapes: validateurs.map((role, i) => ({ 
      niveau: i + 1, 
      role, 
      label: getRoleLabel(role), 
      delai: 48 
    })),
    totalEtapes: validateurs.length,
  };
};

const getEtapeEnCours = (validationsData?: Array<{ decision: string }>): number => {
  if (!validationsData?.length) return 1;
  const validees = validationsData.filter(v => v.decision === 'VALIDEE').length;
  return validees + 1;
};

// ============================================================
// OFFRES KILANI
// ============================================================
const OFFRES_DATA: Record<string, {
  competences: string[];
  competencesSouhaitees: string[];
  description: string;
  profilRecherche: string;
}> = {
  'Technicien de laboratoire': {
    competences: ['BPF', 'HPLC', 'Contrôle qualité', 'Microbiologie'],
    competencesSouhaitees: ['GMP', 'ISO 9001', 'Spectrophotométrie'],
    description: "Réaliser les analyses physico-chimiques et microbiologiques des matières premières et produits finis dans le respect des BPF.",
    profilRecherche: "Technicien avec expérience en laboratoire pharmaceutique, rigueur et sens du détail requis.",
  },
  'Pharmacien AQ': {
    competences: ['Assurance qualité', 'BPF', 'Audit interne', 'Gestion des déviations', 'Rédaction SOP'],
    competencesSouhaitees: ['ICH Q10', 'Affaires réglementaires', 'SAP QM'],
    description: "Garantir la conformité des processus de fabrication aux référentiels BPF et aux exigences réglementaires.",
    profilRecherche: "Pharmacien avec 3+ ans en AQ industrielle, maîtrise des audits et de la documentation qualité.",
  },
  'Responsable Production Pharma': {
    competences: ['Management équipe', 'Planification production', 'BPF', 'Lean Manufacturing', 'KPI industriels'],
    competencesSouhaitees: ['Six Sigma', 'ERP SAP', 'Validation procédés'],
    description: "Superviser l'ensemble des opérations de production pharmaceutique tout en assurant la conformité qualité et les délais.",
    profilRecherche: "Ingénieur ou pharmacien avec 5+ ans en production pharmaceutique et expérience en management.",
  },
  'Directeur Industriel': {
    competences: ['Direction industrielle', 'Stratégie industrielle', 'Management senior', 'Budget CAPEX/OPEX', 'BPF', 'Relations institutionnelles'],
    competencesSouhaitees: ['Expansion internationale', 'Fusions-acquisitions', 'CSRD'],
    description: "Piloter la stratégie industrielle du groupe, superviser les sites de production et garantir la compétitivité opérationnelle.",
    profilRecherche: "Dirigeant avec 10+ ans d'expérience en industrie pharmaceutique, vision stratégique et leadership avéré.",
  },
  'Technicien Support IT': {
    competences: ['Support N1/N2', 'Active Directory', 'Windows 10/11', 'Ticketing GLPI'],
    competencesSouhaitees: ['ITIL', 'Office 365', 'Réseau TCP/IP'],
    description: "Assurer le support informatique des utilisateurs du groupe, gérer le parc matériel et maintenir les postes de travail.",
    profilRecherche: "Technicien informatique avec 1+ an d'expérience en support utilisateur.",
  },
  'Développeur Full Stack': {
    competences: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'REST API', 'Python', 'FastAPI', 'Docker', 'CI/CD'],
    competencesSouhaitees: ['TensorFlow', 'spaCy', 'SHAP', 'MongoDB', 'Agile SCRUM', 'GraphQL', 'Redis'],
    description: "Concevoir, développer et maintenir les applications métier du groupe dans un environnement Agile.",
    profilRecherche: "Ingénieur ou développeur confirmé, 3+ ans d'expérience full-stack.",
  },
  'Ingénieur IA / Machine Learning': {
    competences: ['Python', 'TensorFlow', 'Scikit-Learn', 'spaCy', 'FastAPI', 'SHAP', 'Pandas', 'NLP'],
    competencesSouhaitees: ['React', 'Docker', 'PostgreSQL', 'MongoDB', 'Agile SCRUM', 'Hugging Face', 'LLM'],
    description: "Développer et industrialiser des modèles d'intelligence artificielle pour les besoins métier du groupe.",
    profilRecherche: "Ingénieur IA junior à confirmé, diplômé Bac+5 en informatique ou data science.",
  },
  'Chef de Projet SI': {
    competences: ['Gestion de projet', 'Méthodes Agile/SCRUM', 'Cahier des charges', 'ERP', 'Conduite du changement'],
    competencesSouhaitees: ['PMP', 'PRINCE2', 'SAP', 'Budget SI'],
    description: "Piloter les projets de transformation digitale du groupe de l'expression du besoin à la mise en production.",
    profilRecherche: "Chef de projet avec 5+ ans d'expérience en environnement multi-sites.",
  },
  "Directeur des Systèmes d'Information": {
    competences: ["Stratégie SI", "Architecture d'entreprise", 'Cybersécurité', 'Budget IT', 'Cloud Azure/AWS', 'Management DSI'],
    competencesSouhaitees: ['TOGAF', 'ISO 27001', 'FinOps', 'IA générative'],
    description: "Définir et piloter la stratégie SI du groupe Kilani.",
    profilRecherche: "DSI confirmé avec 10+ ans d'expérience.",
  },
  'Community Manager': {
    competences: ['Réseaux sociaux', 'Création de contenu', 'Canva', 'Veille digitale', 'Rédaction web'],
    competencesSouhaitees: ['Meta Ads', 'Google Analytics', 'SEO', 'Montage vidéo'],
    description: "Animer et développer la présence digitale du groupe Kilani.",
    profilRecherche: "Créatif, curieux, avec une forte appétence pour le digital.",
  },
  'Chef de Produit Marketing': {
    competences: ['Marketing stratégique', 'Lancement produit', 'Études de marché', 'P&L', 'Négociation enseignes'],
    competencesSouhaitees: ['CRM Salesforce', 'Trade marketing', 'Prévisions des ventes', 'Nielsen'],
    description: "Développer et piloter la stratégie marketing des gammes pharmaceutiques et paramédicales du groupe.",
    profilRecherche: "Chef de produit avec 4+ ans en marketing pharmaceutique ou grande consommation.",
  },
  'Directeur Commercial': {
    competences: ['Direction commerciale', 'Force de vente', 'Négociation grands comptes', 'CRM', 'Développement business', 'Management commercial'],
    competencesSouhaitees: ['Expansion Afrique', 'Digital selling', 'Revenue Management'],
    description: "Définir et déployer la stratégie commerciale du groupe.",
    profilRecherche: "Directeur commercial avec 8+ ans d'expérience.",
  },
  'Directeur Général Adjoint': {
    competences: ['Direction générale', 'Stratégie groupe', 'Gouvernance', 'Management senior', 'Finance groupe', 'Relations institutionnelles'],
    competencesSouhaitees: ['M&A', 'ESG/CSRD', 'Expansion internationale', 'Private Equity'],
    description: "Assister le DG dans le pilotage stratégique et opérationnel du groupe.",
    profilRecherche: "Dirigeant accompli, 12+ ans d'expérience en management de groupe.",
  },
};

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  KILANI GROUPE — Seed Demandes + Offres');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await prisma.$connect();

  // Nettoyage
  console.log('\n[1/3] Nettoyage...');
  await prisma.entretien.deleteMany({});
  await prisma.candidature.deleteMany({});
  await prisma.disponibiliteInterviewer.deleteMany({});
  await prisma.offreEmploi.deleteMany({});
  await prisma.relanceJob.deleteMany({});
  await prisma.validationEtape.deleteMany({});
  await prisma.disponibilite.deleteMany({});
  await prisma.demandeRecrutement.deleteMany({});
  console.log('   ✓ Tables vidées');

  // Chargement utilisateurs
  console.log('\n[2/3] Chargement des utilisateurs...');

  const managerPharma  = await prisma.user.findFirstOrThrow({ where: { role: 'MANAGER', email: 'manager.pharma@kilani.tn' } });
  const managerSI      = await prisma.user.findFirstOrThrow({ where: { role: 'MANAGER', email: 'manager.si@kilani.tn' } });
  const managerMKT     = await prisma.user.findFirstOrThrow({ where: { role: 'MANAGER', email: 'manager.mkt@kilani.tn' } });

  const directionPharma = await prisma.direction.findFirstOrThrow({ where: { code: 'DIR_PHARMA' } });
  const directionSI     = await prisma.direction.findFirstOrThrow({ where: { code: 'DIR_SI' } });
  const directionMKT    = await prisma.direction.findFirstOrThrow({ where: { code: 'DIR_MKT' } });

  const directeurPharma = await prisma.user.findFirstOrThrow({ where: { role: 'DIRECTEUR', directionId: directionPharma.id } });
  const directeurSI     = await prisma.user.findFirstOrThrow({ where: { role: 'DIRECTEUR', directionId: directionSI.id } });
  const directeurMKT    = await prisma.user.findFirstOrThrow({ where: { role: 'DIRECTEUR', directionId: directionMKT.id } });

  const drh = await prisma.user.findFirstOrThrow({ where: { role: 'DRH' } });
  const daf = await prisma.user.findFirstOrThrow({ where: { role: 'DAF' } });
  const dga = await prisma.user.findFirstOrThrow({ where: { role: 'DGA' } });
  const dg  = await prisma.user.findFirstOrThrow({ where: { role: 'DG'  } });

  const circuits: Record<string, any> = {};
  for (const type of ['TECHNICIEN', 'EMPLOYE', 'CADRE_DEBUTANT', 'CADRE_CONFIRME', 'CADRE_SUPERIEUR', 'STRATEGIQUE']) {
    circuits[type] = await prisma.circuitConfig.findFirst({ where: { type: type as CircuitType } });
  }

  console.log('   ✓ Utilisateurs et structures chargés');

  // Dates utilitaires
  const now  = new Date();
  const d    = (days: number)  => { const r = new Date(now); r.setDate(r.getDate() + days); return r; };
  const h    = (hours: number) => { const r = new Date(now); r.setHours(r.getHours() + hours); return r; };
  const past = (days: number)  => d(-days);

  let refCounter = 1000;
  const ref = () => `DEM-${now.getFullYear()}-${String(++refCounter).padStart(3, '0')}`;
  let offreCounter = 100;
  const offreRef = (secteur: string) => `OFF-${now.getFullYear()}-${secteur}-${String(++offreCounter).padStart(3, '0')}`;

  // Helpers
  const addCreneaux = async (managerId: string, directeurId: string | null, demandeId: string, niveau: string, offsets: number[]) => {
    if (NIVEAUX_AVEC_TECHNIQUE.includes(niveau)) {
      await prisma.disponibiliteInterviewer.createMany({
        data: offsets.map((dOffset, i) => ({
          userId: managerId, demandeId,
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + dOffset),
          heureDebut: i % 2 === 0 ? '09:00' : '14:00',
          heureFin:   i % 2 === 0 ? '10:00' : '15:00',
          reservee: false,
        })),
      });
    }
    if (NIVEAUX_AVEC_DIRECTION.includes(niveau) && directeurId) {
      await prisma.disponibiliteInterviewer.createMany({
        data: offsets.map((dOffset, i) => ({
          userId: directeurId, demandeId,
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + dOffset + 2),
          heureDebut: i % 2 === 0 ? '10:00' : '15:00',
          heureFin:   i % 2 === 0 ? '11:00' : '16:00',
          reservee: false,
        })),
      });
    }
  };

  const addDisponibilites = async (demandeId: string, offsets: number[]) => {
    await prisma.disponibilite.createMany({
      data: offsets.map((dOffset, i) => ({
        demandeId,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + dOffset),
        heureDebut: i % 2 === 0 ? '09:00' : '14:00',
        heureFin:   i % 2 === 0 ? '12:00' : '17:00',
      })),
    });
  };

  const creerOffre = async (params: {
    demandeId: string; intitule: string; typeContrat: TypeContrat;
    secteur: 'PHARMA' | 'SI' | 'MKT'; rhId: string;
    description?: string; fourchetteSalariale?: string; statut?: string;
  }) => {
    const offreData = OFFRES_DATA[params.intitule];
    return prisma.offreEmploi.create({
      data: {
        reference:          offreRef(params.secteur),
        intitule:           params.intitule,
        typeContrat:        params.typeContrat,
        statut:             params.statut ?? 'PUBLIEE',
        rhId:               params.rhId,
        demandeId:          params.demandeId,
        lienCandidature:    `http://localhost:5173/candidature/${params.secteur.toLowerCase()}-${Date.now()}`,
        description:        offreData?.description ?? params.description ?? '',
        profilRecherche:    offreData?.profilRecherche ?? '',
        competences:        offreData?.competences ?? [],
        fourchetteSalariale: params.fourchetteSalariale ?? null,
        datePublication:    now,
      },
    });
  };

  interface DemandeParams {
    intitulePoste: string; niveau: string; description: string;
    justification: string; commentaireMotif?: string; motif: Motif;
    personneRemplaceeNom?: string; fonctionRemplacee?: string;
    typeContrat: TypeContrat; priorite: Priorite; dateSouhaitee: Date;
    statut: StatutDemande; createurId: string; createurRole: string;
    managerId: string; directeurId: string; directionId: string;
    etapeActuelle?: number; valideeAt?: Date;
    avecOffre?: boolean; avecCreneaux?: boolean; avecDisponibilites?: boolean;
    secteur: 'PHARMA' | 'SI' | 'MKT'; fourchetteSalariale?: string;
    validationsData?: Array<{
      niveauEtape: number; acteurId: string; decision: string;
      commentaire?: string; dateDecision?: Date;
    }>;
  }

  const createDemande = async (p: DemandeParams) => {
    const config = NIVEAU_CONFIG[p.niveau];
    const circuitConfig = circuits[p.niveau];
    const { totalEtapes } = await determinerCircuit(p.niveau, p.createurRole);

    const demande = await prisma.demandeRecrutement.create({
      data: {
        reference:            ref(),
        intitulePoste:        p.intitulePoste,
        description:          p.description,
        justification:        p.justification,
        commentaireMotif:     p.commentaireMotif ?? null,
        motif:                p.motif,
        personneRemplaceeNom: p.personneRemplaceeNom ?? null,
        fonctionRemplacee:    p.fonctionRemplacee ?? null,
        typeContrat:          p.typeContrat,
        priorite:             p.priorite,
        budgetMin:            config.budgetMin,
        budgetMax:            config.budgetMax,
        dateSouhaitee:        p.dateSouhaitee,
        statut:               p.statut,
        niveau:               p.niveau as CircuitType,
        circuitType:          config.circuitType,
        totalEtapes,
        etapeActuelle:        p.etapeActuelle ?? 0,
        valideeAt:            p.valideeAt ?? null,
        circuitConfigId:      circuitConfig?.id ?? null,
        createurId:           p.createurId,
        managerId:            p.managerId,
        directionId:          p.directionId,
      },
    });

    if (p.validationsData?.length) {
      await prisma.validationEtape.createMany({
        data: p.validationsData.map(v => ({
          demandeId:      demande.id,
          niveauEtape:    v.niveauEtape,
          acteurId:       v.acteurId,
          decision:       v.decision as any,
          commentaire:    v.commentaire ?? null,
          dateDecision:   v.dateDecision ?? null,
          dateLimite:     h(48),
          relanceEnvoyee: false,
        })),
      });
    }

    if (p.avecCreneaux) {
      await addCreneaux(p.managerId, p.directeurId, demande.id, p.niveau, [5, 7, 9]);
    }

    if (p.avecDisponibilites) {
      await addDisponibilites(demande.id, [3, 5, 8]);
    }

    if (p.avecOffre && p.statut === 'VALIDEE') {
      await creerOffre({
        demandeId: demande.id, intitule: p.intitulePoste,
        typeContrat: p.typeContrat, secteur: p.secteur,
        rhId: drh.id, fourchetteSalariale: p.fourchetteSalariale,
      });
    }

    if (p.statut.startsWith('EN_VALIDATION_')) {
      const etapeEnCours = getEtapeEnCours(p.validationsData);
      const { etapes, totalEtapes: total } = await determinerCircuit(p.niveau, p.createurRole);
      const roleActuel = etapes[etapeEnCours - 1]?.role;

      n8nTriggers.push(
        triggerCircuitRecrutement(
          demande.id, p.niveau, etapeEnCours, false, roleActuel, total
        ).catch(console.error)
      );
      console.log(`   -> n8n déclenché pour ${demande.reference} (étape ${etapeEnCours}, rôle ${roleActuel})`);
    }

    return demande;
  };

  // ============================================================
  // CREATION DES DEMANDES
  // ============================================================
  console.log('\n[3/3] Création des demandes...\n');

  // CAS 01 — BROUILLON | Technicien laboratoire | PHARMA
  console.log('CAS 01 — BROUILLON | Technicien laboratoire | PHARMA');
  await createDemande({
    intitulePoste: 'Technicien de laboratoire', niveau: 'TECHNICIEN',
    description:   "Réaliser les analyses de contrôle qualité des matières premières et produits finis pharmaceutiques.",
    justification: "Augmentation des volumes de production suite à l'obtention d'un nouveau marché export.",
    commentaireMotif: "Marché Afrique subsaharienne signé Q1 2026",
    motif: 'CREATION', typeContrat: 'CDI', priorite: 'MOYENNE', dateSouhaitee: d(30),
    statut: 'BROUILLON', createurId: managerPharma.id, createurRole: 'MANAGER',
    managerId: managerPharma.id, directeurId: directeurPharma.id, directionId: directionPharma.id,
    secteur: 'PHARMA', fourchetteSalariale: '900 – 1 400 DT', avecOffre: false, avecCreneaux: false,
  });

  // CAS 02 — BROUILLON | Technicien Support IT | SI
  console.log('CAS 02 — BROUILLON | Technicien Support IT | SI');
  await createDemande({
    intitulePoste: 'Technicien Support IT', niveau: 'EMPLOYE',
    description:   "Assurer le support de proximité pour l'ensemble des collaborateurs du groupe sur les sites Tunis et Sousse.",
    justification: "L'extension du groupe à Sousse nécessite un technicien IT dédié.",
    motif: 'EXPANSION', commentaireMotif: "Ouverture site Sousse prévue Q3 2026",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(45),
    statut: 'BROUILLON', createurId: directeurSI.id, createurRole: 'DIRECTEUR',
    managerId: managerSI.id, directeurId: directeurSI.id, directionId: directionSI.id,
    secteur: 'SI', fourchetteSalariale: '1 100 – 1 800 DT', avecOffre: false, avecCreneaux: false,
  });

  // CAS 03 — SOUMISE | Community Manager | MKT
  console.log('CAS 03 — SOUMISE | Community Manager | MKT');
  await createDemande({
    intitulePoste: 'Community Manager', niveau: 'CADRE_DEBUTANT',
    description:   "Créer et animer les communautés digitales du groupe Kilani.",
    justification: "La stratégie digitale 2026 requiert une présence renforcée sur les réseaux sociaux.",
    commentaireMotif: "Plan digital approuvé en CODIR janvier 2026",
    motif: 'CREATION', typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(30),
    statut: 'SOUMISE', createurId: managerMKT.id, createurRole: 'MANAGER',
    managerId: managerMKT.id, directeurId: directeurMKT.id, directionId: directionMKT.id,
    secteur: 'MKT', fourchetteSalariale: '2 200 – 3 200 DT', avecOffre: false, avecCreneaux: false,
  });

  // CAS 04 — EN_VALIDATION_DIR | Pharmacien AQ | PHARMA
  console.log('CAS 04 — EN_VALIDATION_DIR | Pharmacien AQ | PHARMA');
  await createDemande({
    intitulePoste: 'Pharmacien AQ', niveau: 'CADRE_DEBUTANT',
    description:   "Assurer la conformité du système qualité pharmaceutique.",
    justification: "Inspection DPHP programmée en mai 2026.",
    motif: 'RENFORCEMENT', commentaireMotif: "Audit externe prévu Q2 2026",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(21),
    statut: 'EN_VALIDATION_DIR', createurId: managerPharma.id, createurRole: 'MANAGER',
    managerId: managerPharma.id, directeurId: directeurPharma.id, directionId: directionPharma.id,
    secteur: 'PHARMA', fourchetteSalariale: '2 500 – 3 800 DT', avecOffre: false, avecCreneaux: false,
    validationsData: [
      { niveauEtape: 1, acteurId: directeurPharma.id, decision: 'EN_ATTENTE' },
    ],
  });

  // CAS 05 — EN_VALIDATION_DRH | Développeur Full Stack | SI
  console.log('CAS 05 — EN_VALIDATION_DRH | Développeur Full Stack | SI');
  await createDemande({
    intitulePoste: 'Développeur Full Stack', niveau: 'CADRE_DEBUTANT',
    description:   "Concevoir, développer et maintenir les applications métier du groupe.",
    justification: "Lancement du projet de refonte du portail RH prévu S2 2026.",
    motif: 'NOUVEAU_POSTE', commentaireMotif: "Budget projet validé en CODIR",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(30),
    statut: 'EN_VALIDATION_DRH', createurId: managerSI.id, createurRole: 'MANAGER',
    managerId: managerSI.id, directeurId: directeurSI.id, directionId: directionSI.id,
    secteur: 'SI', fourchetteSalariale: '2 800 – 4 000 DT', avecOffre: false, avecCreneaux: false,
    validationsData: [
      { niveauEtape: 1, acteurId: directeurSI.id, decision: 'VALIDEE', dateDecision: past(2) },
      { niveauEtape: 2, acteurId: drh.id,         decision: 'EN_ATTENTE' },
    ],
  });

  // CAS 06 — EN_VALIDATION_DAF | Chef de Produit Marketing | MKT
  console.log('CAS 06 — EN_VALIDATION_DAF | Chef de Produit Marketing | MKT');
  await createDemande({
    intitulePoste: 'Chef de Produit Marketing', niveau: 'CADRE_CONFIRME',
    description:   "Piloter le plan marketing des gammes OTC et parapharmacie.",
    justification: "Développement de 3 nouvelles gammes prévu 2026-2027.",
    motif: 'CREATION', commentaireMotif: "Roadmap produit validée par le DGA",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(45),
    statut: 'EN_VALIDATION_DAF', createurId: managerMKT.id, createurRole: 'MANAGER',
    managerId: managerMKT.id, directeurId: directeurMKT.id, directionId: directionMKT.id,
    secteur: 'MKT', fourchetteSalariale: '4 000 – 5 500 DT', avecOffre: false, avecCreneaux: false,
    validationsData: [
      { niveauEtape: 1, acteurId: directeurMKT.id, decision: 'VALIDEE', dateDecision: past(5) },
      { niveauEtape: 2, acteurId: drh.id,          decision: 'VALIDEE', dateDecision: past(3) },
      { niveauEtape: 3, acteurId: daf.id,          decision: 'EN_ATTENTE' },
    ],
  });

  // CAS 07 — EN_VALIDATION_DGA | Chef de Projet SI | SI
  console.log('CAS 07 — EN_VALIDATION_DGA | Chef de Projet SI | SI');
  await createDemande({
    intitulePoste: 'Chef de Projet SI', niveau: 'CADRE_CONFIRME',
    description:   "Piloter les projets de transformation numérique du groupe.",
    justification: "Portefeuille de projets SI 2026 en forte croissance.",
    motif: 'CREATION', typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(60),
    statut: 'EN_VALIDATION_DGA', createurId: directeurSI.id, createurRole: 'DIRECTEUR',
    managerId: managerSI.id, directeurId: directeurSI.id, directionId: directionSI.id,
    secteur: 'SI', fourchetteSalariale: '4 500 – 6 000 DT', avecOffre: false, avecCreneaux: false,
    validationsData: [
      { niveauEtape: 1, acteurId: managerSI.id, decision: 'VALIDEE', dateDecision: past(10) },
      { niveauEtape: 2, acteurId: drh.id,       decision: 'VALIDEE', dateDecision: past(7)  },
      { niveauEtape: 3, acteurId: daf.id,       decision: 'VALIDEE', dateDecision: past(4)  },
      { niveauEtape: 4, acteurId: dga.id,       decision: 'EN_ATTENTE' },
    ],
  });

  // CAS 08 — VALIDEE+OFFRE | Directeur Commercial | MKT
  console.log('CAS 08 — VALIDEE+OFFRE | Directeur Commercial | MKT');
  await createDemande({
    intitulePoste: 'Directeur Commercial', niveau: 'CADRE_SUPERIEUR',
    description:   "Définir et déployer la stratégie commerciale du groupe Kilani.",
    justification: "Départ à la retraite du directeur commercial actuel fin Q1 2026.",
    motif: 'REMPLACEMENT', personneRemplaceeNom: 'Mohamed Karoui', fonctionRemplacee: 'Directeur Commercial',
    commentaireMotif: "Retraite effective au 31/03/2026",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(14),
    statut: 'VALIDEE', createurId: daf.id, createurRole: 'DAF',
    managerId: managerMKT.id, directeurId: directeurMKT.id, directionId: directionMKT.id,
    etapeActuelle: 5, valideeAt: past(3), secteur: 'MKT',
    fourchetteSalariale: '6 500 – 10 000 DT', avecOffre: true, avecCreneaux: true, avecDisponibilites: true,
    validationsData: [
      { niveauEtape: 1, acteurId: directeurMKT.id, decision: 'VALIDEE', dateDecision: past(14) },
      { niveauEtape: 2, acteurId: drh.id,          decision: 'VALIDEE', dateDecision: past(10) },
      { niveauEtape: 3, acteurId: daf.id,          decision: 'VALIDEE', dateDecision: past(7)  },
      { niveauEtape: 4, acteurId: dga.id,          decision: 'VALIDEE', dateDecision: past(5)  },
      { niveauEtape: 5, acteurId: dg.id,           decision: 'VALIDEE', dateDecision: past(3)  },
    ],
  });

  // CAS 09 — VALIDEE+OFFRE | Directeur Général Adjoint | PHARMA
  console.log('CAS 09 — VALIDEE+OFFRE | Directeur Général Adjoint | PHARMA');
  await createDemande({
    intitulePoste: 'Directeur Général Adjoint', niveau: 'STRATEGIQUE',
    description:   "Seconder le Directeur Général dans le pilotage stratégique du groupe.",
    justification: "Création d'un poste de DGA pour accompagner la phase d'expansion du groupe.",
    motif: 'NOUVEAU_POSTE', commentaireMotif: "Décision du Conseil d'Administration",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(60),
    statut: 'VALIDEE', createurId: dg.id, createurRole: 'DG',
    managerId: managerPharma.id, directeurId: directeurPharma.id, directionId: directionPharma.id,
    etapeActuelle: 5, valideeAt: past(7), secteur: 'PHARMA',
    fourchetteSalariale: '12 000 – 22 000 DT', avecOffre: true, avecCreneaux: true, avecDisponibilites: true,
    validationsData: [
      { niveauEtape: 1, acteurId: directeurPharma.id, decision: 'VALIDEE', dateDecision: past(21) },
      { niveauEtape: 2, acteurId: drh.id,             decision: 'VALIDEE', dateDecision: past(18) },
      { niveauEtape: 3, acteurId: daf.id,             decision: 'VALIDEE', dateDecision: past(14) },
      { niveauEtape: 4, acteurId: dga.id,             decision: 'VALIDEE', dateDecision: past(10) },
      { niveauEtape: 5, acteurId: dg.id,              decision: 'VALIDEE', dateDecision: past(7)  },
    ],
  });

  // CAS 10 — VALIDEE+OFFRE | Responsable Production Pharma
  console.log('CAS 10 — VALIDEE+OFFRE | Responsable Production Pharma | PHARMA');
  await createDemande({
    intitulePoste: 'Responsable Production Pharma', niveau: 'CADRE_SUPERIEUR',
    description:   "Superviser les lignes de production pharmaceutique.",
    justification: "Départ du responsable production actuel.",
    motif: 'REMPLACEMENT', personneRemplaceeNom: 'Hatem Zribi', fonctionRemplacee: 'Responsable Production',
    commentaireMotif: "Démission acceptée",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(30),
    statut: 'VALIDEE', createurId: directeurPharma.id, createurRole: 'DIRECTEUR',
    managerId: managerPharma.id, directeurId: directeurPharma.id, directionId: directionPharma.id,
    etapeActuelle: 5, valideeAt: past(5), secteur: 'PHARMA',
    fourchetteSalariale: '5 500 – 8 500 DT', avecOffre: true, avecCreneaux: true, avecDisponibilites: true,
    validationsData: [
      { niveauEtape: 1, acteurId: managerPharma.id, decision: 'VALIDEE', dateDecision: past(18) },
      { niveauEtape: 2, acteurId: drh.id,           decision: 'VALIDEE', dateDecision: past(14) },
      { niveauEtape: 3, acteurId: daf.id,           decision: 'VALIDEE', dateDecision: past(10) },
      { niveauEtape: 4, acteurId: dga.id,           decision: 'VALIDEE', dateDecision: past(7)  },
      { niveauEtape: 5, acteurId: dg.id,            decision: 'VALIDEE', dateDecision: past(5)  },
    ],
  });

  // CAS 11 — VALIDEE sans offre | DSI | SI
  console.log("CAS 11 — VALIDEE (sans offre) | Directeur des Systèmes d'Information | SI");
  await createDemande({
    intitulePoste: "Directeur des Systèmes d'Information", niveau: 'CADRE_SUPERIEUR',
    description:   "Définir la stratégie SI du groupe.",
    justification: "Création du poste de DSI pour accompagner la maturité digitale du groupe.",
    motif: 'NOUVEAU_POSTE', commentaireMotif: "Recommandation du cabinet conseil externe",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(90),
    statut: 'VALIDEE', createurId: dga.id, createurRole: 'DGA',
    managerId: managerSI.id, directeurId: directeurSI.id, directionId: directionSI.id,
    etapeActuelle: 5, valideeAt: past(2), secteur: 'SI',
    fourchetteSalariale: '7 000 – 11 000 DT', avecOffre: false, avecCreneaux: true,
    validationsData: [
      { niveauEtape: 1, acteurId: directeurSI.id, decision: 'VALIDEE', dateDecision: past(12) },
      { niveauEtape: 2, acteurId: drh.id,         decision: 'VALIDEE', dateDecision: past(9)  },
      { niveauEtape: 3, acteurId: daf.id,         decision: 'VALIDEE', dateDecision: past(6)  },
      { niveauEtape: 4, acteurId: dga.id,         decision: 'VALIDEE', dateDecision: past(4)  },
      { niveauEtape: 5, acteurId: dg.id,          decision: 'VALIDEE', dateDecision: past(2)  },
    ],
  });

  // CAS 12 — REJETEE | Community Manager CDD | MKT
  console.log('CAS 12 — REJETEE | Community Manager | MKT');
  await createDemande({
    intitulePoste: 'Community Manager', niveau: 'EMPLOYE',
    description:   "Créer les visuels et animations pour les campagnes digitales.",
    justification: "Besoin en production graphique en hausse.",
    motif: 'CREATION', typeContrat: 'CDD', priorite: 'BASSE', dateSouhaitee: d(30),
    statut: 'REJETEE', createurId: managerMKT.id, createurRole: 'MANAGER',
    managerId: managerMKT.id, directeurId: directeurMKT.id, directionId: directionMKT.id,
    secteur: 'MKT', avecOffre: false, avecCreneaux: false,
    validationsData: [
      { niveauEtape: 1, acteurId: directeurMKT.id, decision: 'VALIDEE', dateDecision: past(8) },
      { niveauEtape: 2, acteurId: drh.id, decision: 'REFUSEE',
        commentaire: "Le budget RH pour ce profil n'est pas disponible en CDD.",
        dateDecision: past(5) },
    ],
  });

  // CAS 13 — REJETEE | Directeur Industriel | PHARMA
  console.log('CAS 13 — REJETEE | Directeur Industriel | PHARMA');
  await createDemande({
    intitulePoste: 'Directeur Industriel', niveau: 'STRATEGIQUE',
    description:   "Piloter l'ensemble des opérations industrielles du groupe.",
    justification: "Restructuration industrielle prévue.",
    motif: 'CREATION', typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(90),
    statut: 'REJETEE', createurId: directeurPharma.id, createurRole: 'DIRECTEUR',
    managerId: managerPharma.id, directeurId: directeurPharma.id, directionId: directionPharma.id,
    secteur: 'PHARMA', avecOffre: false, avecCreneaux: false,
    validationsData: [
      { niveauEtape: 1, acteurId: managerPharma.id, decision: 'VALIDEE', dateDecision: past(20) },
      { niveauEtape: 2, acteurId: drh.id,           decision: 'VALIDEE', dateDecision: past(16) },
      { niveauEtape: 3, acteurId: daf.id,           decision: 'VALIDEE', dateDecision: past(12) },
      { niveauEtape: 4, acteurId: dga.id, decision: 'REFUSEE',
        commentaire: "Création prématurée.",
        dateDecision: past(8) },
    ],
  });

  // CAS 14 — ANNULEE | Alternant Marketing | MKT
  console.log('CAS 14 — ANNULEE | Community Manager | MKT');
  await createDemande({
    intitulePoste: 'Community Manager', niveau: 'EMPLOYE',
    description:   "Soutien à l'équipe marketing digital.",
    justification: "Accueil d'un alternant.",
    motif: 'RENFORCEMENT', typeContrat: 'ALTERNANCE', priorite: 'BASSE', dateSouhaitee: d(60),
    statut: 'ANNULEE', createurId: managerMKT.id, createurRole: 'MANAGER',
    managerId: managerMKT.id, directeurId: directeurMKT.id, directionId: directionMKT.id,
    secteur: 'MKT', avecOffre: false, avecCreneaux: false,
  });

  // CAS 15 — EN_VALIDATION_DIR | Chef Projet Digital | PHARMA
  console.log('CAS 15 — EN_VALIDATION_DIR | Chef Projet Digital | PHARMA');
  await createDemande({
    intitulePoste: 'Chef de Projet SI', niveau: 'CADRE_DEBUTANT',
    description:   "Piloter la mise en œuvre du module qualité du nouvel ERP pharmaceutique.",
    justification: "Le projet ERP pharma démarre en Q2 2026.",
    motif: 'NOUVEAU_POSTE', commentaireMotif: "Projet ERP validé en CODIR",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(45),
    statut: 'EN_VALIDATION_DIR', createurId: directeurPharma.id, createurRole: 'DIRECTEUR',
    managerId: managerPharma.id, directeurId: directeurPharma.id, directionId: directionPharma.id,
    secteur: 'PHARMA', fourchetteSalariale: '2 500 – 3 800 DT', avecOffre: false, avecCreneaux: false,
    validationsData: [
      { niveauEtape: 1, acteurId: managerPharma.id, decision: 'EN_ATTENTE' },
    ],
  });

  // CAS 16 — VALIDEE+OFFRE | Développeur Full Stack | SI
  console.log('CAS 16 — VALIDEE+OFFRE | Développeur Full Stack | SI');
  await createDemande({
    intitulePoste: 'Développeur Full Stack', niveau: 'CADRE_CONFIRME',
    description:   "Concevoir, développer et maintenir les applications métier du groupe.",
    justification: "Lancement de la phase 2 du projet de transformation digitale RH.",
    motif: 'CREATION', commentaireMotif: "Feuille de route digitale 2026 validée en CODIR",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(30),
    statut: 'VALIDEE', createurId: directeurSI.id, createurRole: 'DIRECTEUR',
    managerId: managerSI.id, directeurId: directeurSI.id, directionId: directionSI.id,
    etapeActuelle: 4, valideeAt: past(4), secteur: 'SI',
    fourchetteSalariale: '3 800 – 5 500 DT', avecOffre: true, avecCreneaux: true, avecDisponibilites: true,
    validationsData: [
      { niveauEtape: 1, acteurId: managerSI.id, decision: 'VALIDEE', dateDecision: past(14) },
      { niveauEtape: 2, acteurId: drh.id,       decision: 'VALIDEE', dateDecision: past(10) },
      { niveauEtape: 3, acteurId: daf.id,       decision: 'VALIDEE', dateDecision: past(7)  },
      { niveauEtape: 4, acteurId: dga.id,       decision: 'VALIDEE', dateDecision: past(4)  },
    ],
  });

  // CAS 17 — VALIDEE+OFFRE | Ingénieur IA | SI
  console.log('CAS 17 — VALIDEE+OFFRE | Ingénieur IA / Machine Learning | SI');
  await createDemande({
    intitulePoste: 'Ingénieur IA / Machine Learning', niveau: 'CADRE_DEBUTANT',
    description:   "Développer et industrialiser des modèles d'intelligence artificielle.",
    justification: "Le microservice de scoring IA actuel nécessite d'être renforcé.",
    motif: 'NOUVEAU_POSTE', commentaireMotif: "Recommandation du DSI",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(45),
    statut: 'VALIDEE', createurId: managerSI.id, createurRole: 'MANAGER',
    managerId: managerSI.id, directeurId: directeurSI.id, directionId: directionSI.id,
    etapeActuelle: 4, valideeAt: past(6), secteur: 'SI',
    fourchetteSalariale: '2 800 – 4 200 DT', avecOffre: true, avecCreneaux: true, avecDisponibilites: true,
    validationsData: [
      { niveauEtape: 1, acteurId: directeurSI.id, decision: 'VALIDEE', dateDecision: past(18) },
      { niveauEtape: 2, acteurId: drh.id,         decision: 'VALIDEE', dateDecision: past(14) },
      { niveauEtape: 3, acteurId: daf.id,         decision: 'VALIDEE', dateDecision: past(10) },
      { niveauEtape: 4, acteurId: dga.id,         decision: 'VALIDEE', dateDecision: past(6)  },
    ],
  });

  // CAS 18 — TEST relance 48h
  console.log('CAS 18 — EN_VALIDATION_DIR | Test relance 48h | PHARMA');
  await createDemande({
    intitulePoste: 'Technicien Test Relance', niveau: 'TECHNICIEN',
    description:   "Demande de test pour vérifier le mécanisme de rappel automatique.",
    justification: "Test du délai de relance n8n.",
    motif: 'CREATION', commentaireMotif: "Test relance",
    typeContrat: 'CDI', priorite: 'HAUTE', dateSouhaitee: d(30),
    statut: 'EN_VALIDATION_DIR', createurId: managerPharma.id, createurRole: 'MANAGER',
    managerId: managerPharma.id, directeurId: directeurPharma.id, directionId: directionPharma.id,
    secteur: 'PHARMA', avecOffre: false, avecCreneaux: false,
    validationsData: [
      { niveauEtape: 1, acteurId: directeurPharma.id, decision: 'EN_ATTENTE' },
    ],
  });

  // Attente des déclenchements n8n
  console.log(`\n  Attente des ${n8nTriggers.length} déclenchements n8n...`);
  await Promise.all(n8nTriggers);
  console.log('  ✓ Tous les webhooks n8n ont été envoyés');

  // Statistiques
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RÉSUMÉ DU SEED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const total         = await prisma.demandeRecrutement.count();
  const parStatut     = await prisma.demandeRecrutement.groupBy({ by: ['statut'], _count: true });
  const offresCount   = await prisma.offreEmploi.count();
  const offresPubliees = await prisma.offreEmploi.count({ where: { statut: 'PUBLIEE' } });
  const creneaux      = await prisma.disponibiliteInterviewer.count();
  const dispos        = await prisma.disponibilite.count();
  const validations   = await prisma.validationEtape.count();

  console.log(`  Demandes     : ${total}`);
  console.log(`  Validations  : ${validations}`);
  console.log(`  Offres       : ${offresCount} (${offresPubliees} publiées)`);
  console.log(`  Créneaux     : ${creneaux} interviewers + ${dispos} RH`);
  console.log('\n  Par statut :');
  for (const s of parStatut) console.log(`    ${s.statut.padEnd(25)} ${s._count}`);
  console.log('\n  ✓ Seed terminé avec succès');
}

main()
  .catch(e => { console.error('Erreur seed-demandes:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());