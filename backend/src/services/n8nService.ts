// backend/src/services/n8nService.ts
import axios from 'axios';
import { ValidationTokenService as TokenService } from '../middlewares/auth';

// CORRECTION SÉCURITÉ : plus de fallback en dur pour les secrets.
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL_CIRCUIT;
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

if (!N8N_WEBHOOK_URL) {
  throw new Error('[SECURITY] N8N_WEBHOOK_URL_CIRCUIT manquant dans les variables d\'environnement.');
}
if (!N8N_WEBHOOK_SECRET) {
  throw new Error('[SECURITY] N8N_WEBHOOK_SECRET manquant dans les variables d\'environnement.');
}

export const triggerCircuitRecrutement = async (
  demandeId: string,
  niveau: string,
  etape: number,
  isLast: boolean,
  roleActuel: string,
  totalEtapes: number
) => {
  try {
    // Generer le token pour le validateur actuel
    const token = TokenService.genererToken(demandeId, roleActuel, etape);
    const urlValidation = TokenService.genererUrlWorkflow(demandeId, roleActuel, etape);

    const payload = {
      demandeId,
      niveau,
      etape,
      isLast,
      roleActuel,
      totalEtapes,
      token,
      urlValidation,
      platformUrl: urlValidation
    };

    //  CORRECTION SÉCURITÉ : ne jamais logger le token ni l'URL complète
    // (elle contient le token en query param). On logue uniquement le
    // contexte métier, utile pour le debug sans exposer de secret.
    console.log(
      `[n8n] Envoi du webhook - demande=${demandeId} etape=${etape} role=${roleActuel} isLast=${isLast}`
    );

    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': N8N_WEBHOOK_SECRET
      },
      timeout: 10000
    });

    console.log(`[n8n] Webhook envoye avec succes - demande=${demandeId}`);
    return response.data;

  } catch (error: any) {
    //  On logue le statut HTTP et le message, jamais le payload (qui contient le token)
    console.error(`[n8n] Erreur envoi webhook - demande=${demandeId}:`, error.message);
    if (error.response) {
      console.error('[n8n] Status:', error.response.status);
    }
    throw error;
  }
};

export const triggerDecisionCircuit = async (params: {
  demandeId: string;
  decision: string;
  niveauPoste: string;
  etape: number;
  totalEtapes: number;
  isLast: boolean;
  roleValidateur: string;
}) => {
  try {
    let nextToken = null;
    let nextUrl = null;
    let nextRole = null;

    if (!params.isLast && params.etape < params.totalEtapes) {
      const prochainRole = 'DG';
      const prochaineEtape = params.etape + 1;

      nextToken = TokenService.genererToken(params.demandeId, prochainRole, prochaineEtape);
      nextUrl = TokenService.genererUrlWorkflow(params.demandeId, prochainRole, prochaineEtape);
      nextRole = prochainRole;
    }

    const payload = {
      ...params,
      nextToken,
      nextUrl,
      nextRole
    };

    //  Pas de token ni d'URL dans les logs
    console.log(
      `[n8n] Envoi decision - demande=${params.demandeId} decision=${params.decision} etape=${params.etape}`
    );

    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': N8N_WEBHOOK_SECRET
      },
      timeout: 10000
    });

    return response.data;
  } catch (error: any) {
    console.error(`[n8n] Erreur triggerDecisionCircuit - demande=${params.demandeId}:`, error.message);
    if (error.response) {
      console.error('[n8n] Status:', error.response.status);
    }
    throw error;
  }
};