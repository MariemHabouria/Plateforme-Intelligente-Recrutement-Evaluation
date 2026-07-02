// backend/src/controllers/publicEntretienController.ts
//
// Endpoints PUBLICS (pas d'auth JWT) accessibles via le lien envoyé au
// candidat par email. Sécurisés uniquement par le token HMAC — le candidat
// n'a pas de compte Kilani RH.

import { Request, Response } from 'express';
import { verifySchedulingToken } from '../utils/publicSchedulingToken';
import { getCreneauxDisponibles, reserverCreneauEtCreerEntretien } from '../services/entretienScheduling.service';

const EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

// GET /public/entretiens/creneaux?token=...
export const getCreneauxPublic = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) return res.status(400).json({ success: false, message: 'Token manquant' });

    const payload = verifySchedulingToken(token, EXPIRATION_MS);
    if (!payload) return res.status(403).json({ success: false, message: 'Lien invalide ou expire' });

    const { candidature, creneaux } = await getCreneauxDisponibles(payload.candidatureId, payload.type);

    if (!candidature) {
      return res.status(404).json({ success: false, message: 'Candidature introuvable' });
    }

    res.json({
      success: true,
      data: {
        candidat: { nom: candidature.nom, prenom: candidature.prenom },
        poste: candidature.offre?.intitule || '',
        type: payload.type,
        lieu: payload.lieu,
        creneaux: creneaux.map(c => ({
          id: c.id,
          date: c.date,
          heureDebut: c.heureDebut,
          heureFin: c.heureFin
        }))
        // volontairement pas de user.nom/prenom exposé au candidat ici,
        // pour ne pas divulguer le nom de l'interviewer avant confirmation
      }
    });
  } catch (error) {
    console.error('getCreneauxPublic error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /public/entretiens/reserver  { token, disponibiliteId }
export const reserverCreneauPublic = async (req: Request, res: Response) => {
  try {
    const { token, disponibiliteId } = req.body;
    if (!token || !disponibiliteId) {
      return res.status(400).json({ success: false, message: 'Token et disponibiliteId requis' });
    }

    const payload = verifySchedulingToken(token, EXPIRATION_MS);
    if (!payload) return res.status(403).json({ success: false, message: 'Lien invalide ou expire' });

    const result = await reserverCreneauEtCreerEntretien(
      payload.candidatureId,
      payload.type,
      disponibiliteId,
      payload.lieu
    );

    if (!result.success) {
      return res.status(result.statusCode || 400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: 'Entretien confirme',
      data: {
        date: result.entretien.date,
        heure: result.entretien.heure,
        lieu: result.entretien.lieu
      }
    });
  } catch (error) {
    console.error('reserverCreneauPublic error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};