// frontend/src/components/pages/demandes/ValidationModal.tsx

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Demande } from '../../../services/demande.service';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { FormGroup, FormLabel, Textarea } from '../../ui/FormField';
import { useAuth } from '../../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

interface ValidationModalProps {
  open: boolean;
  demande: Demande | null;
  onClose: () => void;
  onValidate: (decision: 'Validee' | 'Refusee', commentaire?: string, disponibilites?: any[]) => void;
  defaultAction?: 'Validee' | 'Refusee' | null;
}

interface Disponibilite {
  date: string;
  heureDebut: string;
  heureFin: string;
}

const MOTIF_LABELS: Record<string, string> = {
  CREATION: 'Creation de poste',
  REMPLACEMENT: 'Remplacement',
  RENFORCEMENT: "Renforcement d'equipe",
  NOUVEAU_POSTE: 'Nouveau poste',
  EXPANSION: 'Expansion',
};

const CONTRAT_LABELS: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  STAGE: 'Stage',
  ALTERNANCE: 'Alternance',
  FREELANCE: 'Freelance',
};

// Niveaux qui necessitent un entretien direction
const NIVEAUX_AVEC_DIRECTION = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];

export const ValidationModal = ({ open, demande, onClose, onValidate, defaultAction }: ValidationModalProps) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);
  const [disponibilites, setDisponibilites] = useState<Disponibilite[]>([
    { date: '', heureDebut: '', heureFin: '' }
  ]);

  // Recuperer le token depuis l'URL
  const token = searchParams.get('token');

  // Verifier si l'utilisateur doit saisir ses disponibilites
  const needsDisponibilites = (): boolean => {
    if (!user || !demande) return false;
    
    if (user.role === 'MANAGER') return true;
    
    if (user.role === 'DIRECTEUR') {
      return NIVEAUX_AVEC_DIRECTION.includes(demande.niveau);
    }
    
    return false;
  };

  // Reset a chaque ouverture
  useEffect(() => {
    if (open) {
      setCommentaire('');
      setDisponibilites([{ date: '', heureDebut: '', heureFin: '' }]);
    }
  }, [open, defaultAction]);

  const addDisponibilite = () => {
    setDisponibilites([...disponibilites, { date: '', heureDebut: '', heureFin: '' }]);
  };

  const removeDisponibilite = (index: number) => {
    const newDispos = [...disponibilites];
    newDispos.splice(index, 1);
    setDisponibilites(newDispos);
  };

  const updateDisponibilite = (index: number, field: string, value: string) => {
    const newDispos = [...disponibilites];
    newDispos[index] = { ...newDispos[index], [field]: value };
    setDisponibilites(newDispos);
  };

  const validateDisponibilites = (): boolean => {
    const validDispos = disponibilites.filter(d => d.date && d.heureDebut && d.heureFin);
    
    for (const dispo of validDispos) {
      const dispoDate = new Date(dispo.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dispoDate < today) {
        alert('La date de disponibilite ne peut pas etre dans le passe');
        return false;
      }
      
      if (dispo.heureDebut >= dispo.heureFin) {
        alert('L heure de debut doit etre anterieure a l heure de fin');
        return false;
      }
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!defaultAction) return;
    
    if (defaultAction === 'Refusee' && !commentaire) {
      alert('Veuillez indiquer un motif de refus');
      return;
    }
    
    let disponibilitesToSend = undefined;
    if (needsDisponibilites() && defaultAction === 'Validee') {
      const validDispos = disponibilites.filter(d => d.date && d.heureDebut && d.heureFin);
      if (validDispos.length === 0) {
        alert('Veuillez saisir au moins une disponibilite pour les entretiens');
        return;
      }
      if (!validateDisponibilites()) return;
      disponibilitesToSend = validDispos;
    }
    
    setLoading(true);
    await onValidate(defaultAction, commentaire || undefined, disponibilitesToSend);
    setLoading(false);
    setCommentaire('');
    setDisponibilites([{ date: '', heureDebut: '', heureFin: '' }]);
  };

  if (!demande) return null;

  const isRefus = defaultAction === 'Refusee';
  const isValidate = defaultAction === 'Validee';
  const showDisponibilites = needsDisponibilites() && isValidate;

  const budgetText = demande.budgetMin && demande.budgetMax
    ? `${demande.budgetMin} - ${demande.budgetMax} DT / mois`
    : demande.budgetMin
    ? `A partir de ${demande.budgetMin} DT / mois`
    : 'Non specifie';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isRefus
          ? `Refuser la demande ${demande.reference}`
          : `Valider la demande ${demande.reference}`
      }
      maxWidth={550}
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
      <div style={{ padding: '8px 0', maxHeight: '60vh', overflowY: 'auto' }}>
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
            ? 'Vous etes sur le point de refuser cette demande. Cette action notifiera le createur.'
            : 'Vous etes sur le point de valider cette demande et de la transmettre a l etape suivante.'}
        </div>

        {/* Token de validation (debug) */}
        {token && (
          <div style={{
            marginBottom: 16,
            padding: '8px 12px',
            background: '#f0fdf4',
            borderRadius: 4,
            fontSize: 11,
            color: '#15803d',
            wordBreak: 'break-all'
          }}>
            Token de validation: {token}
          </div>
        )}

        {/* Recap demande */}
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
              Un commentaire est obligatoire pour justifier le refus.
            </p>
          )}
        </FormGroup>

        {/* Section disponibilites pour Manager/Directeur */}
        {showDisponibilites && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <FormLabel>
                Mes disponibilites pour entretiens
                {user?.role === 'DIRECTEUR' && (
                  <span style={{ fontSize: 11, marginLeft: 8, fontWeight: 'normal' }}>
                    (Cadre superieur / Strategique uniquement)
                  </span>
                )}
              </FormLabel>
              <Button variant="ghost" size="xs" onClick={addDisponibilite}>
                <Plus size={14} /> Ajouter un creneau
              </Button>
            </div>
            
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {user?.role === 'MANAGER' 
                ? 'En tant que manager, veuillez saisir vos creneaux disponibles pour les entretiens techniques.'
                : 'En tant que directeur, veuillez saisir vos creneaux disponibles pour les entretiens direction.'}
            </div>
            
            {disponibilites.map((dispo, index) => (
              <div key={index} style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr auto', 
                gap: 12, 
                marginBottom: 12,
                alignItems: 'center'
              }}>
                <input
                  type="date"
                  value={dispo.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => updateDisponibilite(index, 'date', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
                  placeholder="Date"
                />
                <input
                  type="time"
                  value={dispo.heureDebut}
                  onChange={(e) => updateDisponibilite(index, 'heureDebut', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
                  placeholder="Debut"
                />
                <input
                  type="time"
                  value={dispo.heureFin}
                  onChange={(e) => updateDisponibilite(index, 'heureFin', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
                  placeholder="Fin"
                />
                {disponibilites.length > 1 && (
                  <Button variant="ghost" size="xs" onClick={() => removeDisponibilite(index)}>
                    <X size={14} />
                  </Button>
                )}
              </div>
            ))}
            
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Ces creneaux seront utilises pour planifier les entretiens avec les candidats.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};