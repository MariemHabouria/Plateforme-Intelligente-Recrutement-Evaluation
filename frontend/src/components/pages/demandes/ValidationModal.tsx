import { useState } from 'react';
import { Demande } from '../../../services/demande.service';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { FormGroup, FormLabel, Textarea } from '../../ui/FormField';

interface ValidationModalProps {
  open: boolean;
  demande: Demande | null;
  onClose: () => void;
  onValidate: (decision: 'Validee' | 'Refusee', commentaire?: string) => void;
}

export const ValidationModal = ({ open, demande, onClose, onValidate }: ValidationModalProps) => {
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async (decision: 'Validee' | 'Refusee') => {
    setLoading(true);
    await onValidate(decision, commentaire || undefined);
    setLoading(false);
    setCommentaire('');
  };

  if (!demande) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Valider la demande ${demande.reference}`}
      maxWidth={500}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="danger" onClick={() => handleValidate('Refusee')} disabled={loading}>
            Refuser
          </Button>
          <Button variant="primary" onClick={() => handleValidate('Validee')} disabled={loading}>
            Valider
          </Button>
        </div>
      }
    >
      <div style={{ padding: '8px 0' }}>
        <div style={{ marginBottom: 16, padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
          <p><strong>Poste :</strong> {demande.intitulePoste}</p>
          <p><strong>Budget :</strong> {demande.budgetEstime} DT/an</p>
          <p><strong>Motif :</strong> {demande.motif}</p>
          <p><strong>Type de contrat :</strong> {demande.typeContrat}</p>
        </div>

        <FormGroup>
          <FormLabel>Commentaire (optionnel)</FormLabel>
          <Textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={3}
            placeholder="Ajoutez un commentaire pour votre décision..."
          />
        </FormGroup>
      </div>
    </Modal>
  );
};