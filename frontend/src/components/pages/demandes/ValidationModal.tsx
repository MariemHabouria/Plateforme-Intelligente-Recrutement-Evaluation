import { useState, useEffect } from 'react';
import { Demande } from '../../../services/demande.service';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { FormGroup, FormLabel, Textarea } from '../../ui/FormField';

interface ValidationModalProps {
  open: boolean;
  demande: Demande | null;
  onClose: () => void;
  onValidate: (decision: 'Validee' | 'Refusee', commentaire?: string) => void;
  defaultAction?: 'Validee' | 'Refusee' | null;
}

const MOTIF_LABELS: Record<string, string> = {
  CREATION:      'Création de poste',
  REMPLACEMENT:  'Remplacement',
  RENFORCEMENT:  "Renforcement d'équipe",
  NOUVEAU_POSTE: 'Nouveau poste',
  EXPANSION:     'Expansion',
};

const CONTRAT_LABELS: Record<string, string> = {
  CDI:        'CDI',
  CDD:        'CDD',
  STAGE:      'Stage',
  ALTERNANCE: 'Alternance',
  FREELANCE:  'Freelance',
};

export const ValidationModal = ({ open, demande, onClose, onValidate, defaultAction }: ValidationModalProps) => {
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading]         = useState(false);

  // Reset commentaire à chaque ouverture
  useEffect(() => {
    if (open) setCommentaire('');
  }, [open, defaultAction]);

  const handleConfirm = async () => {
    if (!defaultAction) return;
    setLoading(true);
    await onValidate(defaultAction, commentaire || undefined);
    setLoading(false);
    setCommentaire('');
  };

  if (!demande) return null;

  const isRefus    = defaultAction === 'Refusee';
  const isValidate = defaultAction === 'Validee';

  const budgetText = demande.budgetMin && demande.budgetMax
    ? `${demande.budgetMin} - ${demande.budgetMax} DT / mois`
    : demande.budgetMin
    ? `À partir de ${demande.budgetMin} DT / mois`
    : 'Non spécifié';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isRefus
          ? `Refuser la demande ${demande.reference}`
          : `Valider la demande ${demande.reference}`
      }
      maxWidth={500}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          {isRefus && (
            <Button variant="danger" onClick={handleConfirm} disabled={loading}>
              {loading ? 'Refus en cours...' : 'Confirmer le refus'}
            </Button>
          )}
          {isValidate && (
            <Button variant="primary" onClick={handleConfirm} disabled={loading}>
              {loading ? 'Validation en cours...' : 'Confirmer la validation'}
            </Button>
          )}
        </div>
      }
    >
      <div style={{ padding: '8px 0' }}>

        {/* Bandeau contextuel */}
        <div style={{
          marginBottom: 16,
          padding: '10px 14px',
          borderRadius: 8,
          background: isRefus ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${isRefus ? '#fecaca' : '#bbf7d0'}`,
          color: isRefus ? '#b91c1c' : '#15803d',
          fontSize: 14,
          fontWeight: 500,
        }}>
          {isRefus
            ? '⚠️ Vous êtes sur le point de refuser cette demande. Cette action notifiera le créateur.'
            : '✅ Vous êtes sur le point de valider cette demande et de la transmettre à l\'étape suivante.'}
        </div>

        {/* Récap demande */}
        <div style={{ marginBottom: 16, padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
          <p style={{ marginBottom: 6 }}><strong>Poste :</strong> {demande.intitulePoste}</p>
          <p style={{ marginBottom: 6 }}><strong>Budget :</strong> {budgetText}</p>
          <p style={{ marginBottom: 6 }}><strong>Motif :</strong> {MOTIF_LABELS[demande.motif] ?? demande.motif}</p>
          <p style={{ marginBottom: 0 }}><strong>Type de contrat :</strong> {CONTRAT_LABELS[demande.typeContrat] ?? demande.typeContrat}</p>
        </div>

        {/* Commentaire */}
        <FormGroup>
          <FormLabel>
            Commentaire{' '}
            {isRefus
              ? <span style={{ color: '#ef4444' }}>*</span>
              : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optionnel)</span>
            }
          </FormLabel>
          <Textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={3}
            placeholder={
              isRefus
                ? 'Indiquez le motif du refus...'
                : 'Ajoutez un commentaire pour votre validation...'
            }
          />
          {isRefus && !commentaire && (
            <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
              Un commentaire est recommandé pour justifier le refus.
            </p>
          )}
        </FormGroup>
      </div>
    </Modal>
  );
};