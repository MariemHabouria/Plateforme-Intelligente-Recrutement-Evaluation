// backend/src/utils/publicSchedulingToken.ts
//
// Token stateless signé HMAC pour le lien de planification envoyé au candidat.
// Pas de colonne DB : tout le payload (candidatureId, type, lieu) est encodé
// dans le token lui-même et vérifié à la volée. Même principe que les tokens
// HMAC déjà utilisés dans le workflow n8n de validation.

import crypto from 'crypto';

const SECRET = process.env.CANDIDAT_TOKEN_SECRET || process.env.N8N_WEBHOOK_SECRET || 'change-me';

export interface SchedulingPayload {
  candidatureId: string;
  type: 'RH' | 'TECHNIQUE' | 'DIRECTION';
  lieu: string;
  iat: number;
}

const sign = (b64: string): string =>
  crypto.createHmac('sha256', SECRET).update(b64).digest('hex');

export function generateSchedulingToken(
  candidatureId: string,
  type: 'RH' | 'TECHNIQUE' | 'DIRECTION',
  lieu: string
): string {
  const payload: SchedulingPayload = { candidatureId, type, lieu, iat: Date.now() };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${b64}.${sign(b64)}`;
}

// expirationMs optionnel (ex: 7 jours). null/undefined = pas d'expiration.
export function verifySchedulingToken(
  token: string,
  expirationMs?: number
): SchedulingPayload | null {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;

    const expectedSig = sign(b64);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: SchedulingPayload = JSON.parse(Buffer.from(b64, 'base64url').toString());

    if (expirationMs && Date.now() - payload.iat > expirationMs) {
      return null; // token expiré
    }

    return payload;
  } catch {
    return null;
  }
}