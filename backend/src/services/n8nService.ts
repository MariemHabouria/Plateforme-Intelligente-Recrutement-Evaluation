// backend/src/services/n8nService.ts
import axios from 'axios';
import { ValidationTokenService as TokenService } from '../middlewares/auth';


// Utiliser l'URL du webhook depuis .env
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL_CIRCUIT || 'http://localhost:5678/webhook/recrutement';

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

    console.log(`[n8n] Envoi du webhook pour la demande ${demandeId}, etape ${etape}, role ${roleActuel}`);
    console.log(`[n8n] URL du webhook: ${N8N_WEBHOOK_URL}`);
    console.log(`[n8n] URL de validation: ${urlValidation}`);
console.log('[n8n] N8N_WEBHOOK_URL_CIRCUIT:', process.env.N8N_WEBHOOK_URL_CIRCUIT);
console.log('[n8n] N8N_WEBHOOK_URL utilisee:', N8N_WEBHOOK_URL);
    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || 'kilani-webhook-2026'
      },
      timeout: 10000
    });

    console.log('[n8n] Webhook envoye avec succes');
    return response.data;

  } catch (error: any) {
    console.error('[n8n] Erreur:', error.message);
    if (error.response) {
      console.error('[n8n] Status:', error.response.status);
      console.error('[n8n] Data:', error.response.data);
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

    console.log(`[n8n] Envoi decision pour la demande ${params.demandeId}, decision ${params.decision}`);

    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || 'kilani-webhook-2026'
      },
      timeout: 10000
    });

    return response.data;
  } catch (error: any) {
    console.error('[n8n] Erreur triggerDecisionCircuit:', error.message);
    if (error.response) {
      console.error('[n8n] Status:', error.response.status);
      console.error('[n8n] Data:', error.response.data);
    }
    throw error;
  }
};