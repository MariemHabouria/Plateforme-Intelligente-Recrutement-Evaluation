// frontend/src/components/pages/contrats/AvenantModal.tsx

import { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input, Select, Textarea, FormGroup, FormLabel, FormRow } from '../../ui/FormField';
import { Alert } from '../../ui/Alert';
import api from '../../../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  contratId: string;
  contratRef: string;
  salaireActuel: string;
  posteActuel?: string;
  onSuccess: () => void;
}

const TYPES_AVENANT = [
  { value: 'CONFIRMATION_PE', label: 'Confirmation de période d\'essai' },
  { value: 'PROLONGATION_PE', label: 'Prolongation de période d\'essai' },
  { value: 'CHANGEMENT_SITUATION', label: 'Changement de situation' },
  { value: 'AUGMENTATION_SALAIRE', label: 'Augmentation de salaire' },
  { value: 'CHANGEMENT_POSTE', label: 'Changement de poste' },
  { value: 'RUPTURE', label: 'Rupture' },
  { value: 'AUTRE', label: 'Autre' }
];

// Regroupe les types qui nécessitent les mêmes champs additionnels,
// pour rester cohérent avec le circuit d'évaluation (ViewProposition) :
// on ne montre que ce qui est pertinent pour le type choisi, et on
// impose les champs obligatoires par type au lieu de tout rendre optionnel.
const necessitePosteOuDirection = (type: string) =>
  type === 'CHANGEMENT_SITUATION' || type === 'CHANGEMENT_POSTE';
const necessiteResiliation = (type: string) => type === 'RUPTURE';
const necessiteDateFin = (type: string) => type === 'PROLONGATION_PE';

interface Direction { id: string; nom: string; }

export function AvenantModal({ open, onClose, contratId, contratRef, salaireActuel, posteActuel, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [directions, setDirections] = useState<Direction[]>([]);

  const initialState = {
    typeAvenant: 'CONFIRMATION_PE',
    description: '',
    dateEffet: new Date().toISOString().split('T')[0],
    nouveauSalaire: '',
    nouvelleDateFin: '',
    nouveauPoste: '',
    nouvelleDirectionId: '',
    dateResiliation: '',
    motifResiliation: ''
  };
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (open) {
      api.get('/directions').then(res => setDirections(res.data?.data?.directions || [])).catch(() => setDirections([]));
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!formData.description || !formData.dateEffet) {
      setError('La description et la date d\'effet sont obligatoires');
      return;
    }
    if (necessiteResiliation(formData.typeAvenant) && (!formData.dateResiliation || !formData.motifResiliation)) {
      setError('La date de résiliation et le motif sont obligatoires pour une rupture');
      return;
    }
    if (necessiteDateFin(formData.typeAvenant) && !formData.nouvelleDateFin) {
      setError('La nouvelle date de fin est obligatoire pour une prolongation');
      return;
    }
    if (necessitePosteOuDirection(formData.typeAvenant) && !formData.nouveauPoste && !formData.nouvelleDirectionId) {
      setError('Merci de renseigner au moins le nouveau poste ou la nouvelle direction');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/contrats/avenant', {
        contratId,
        typeAvenant: formData.typeAvenant,
        description: formData.description,
        dateEffet: formData.dateEffet,
        nouveauSalaire: formData.nouveauSalaire || undefined,
        nouvelleDateFin: necessiteDateFin(formData.typeAvenant) ? formData.nouvelleDateFin : undefined,
        nouveauPoste: necessitePosteOuDirection(formData.typeAvenant) ? (formData.nouveauPoste || undefined) : undefined,
        nouvelleDirectionId: necessitePosteOuDirection(formData.typeAvenant) ? (formData.nouvelleDirectionId || undefined) : undefined,
        dateResiliation: necessiteResiliation(formData.typeAvenant) ? formData.dateResiliation : undefined,
        motifResiliation: necessiteResiliation(formData.typeAvenant) ? formData.motifResiliation : undefined
      });
      onSuccess();
      onClose();
      setFormData(initialState);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création de l\'avenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Nouvel avenant — Contrat ${contratRef}`}
      maxWidth={700}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer l\'avenant et notifier l\'employé'}
          </Button>
        </div>
      }
    >
      <div style={{ padding: '16px' }}>
        {error && <Alert variant="red">{error}</Alert>}

        <Alert variant="gold">
          L'employé recevra un email automatiquement avec le détail de cette modification une fois l'avenant créé.
        </Alert>

        <FormGroup>
          <FormLabel required>Type d'avenant</FormLabel>
          <Select value={formData.typeAvenant} onChange={e => setFormData({ ...formData, typeAvenant: e.target.value })}>
            {TYPES_AVENANT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </FormGroup>

        <FormGroup>
          <FormLabel required>Date d'effet</FormLabel>
          <Input type="date" value={formData.dateEffet} onChange={e => setFormData({ ...formData, dateEffet: e.target.value })} />
        </FormGroup>

        <FormGroup>
          <FormLabel required>Description</FormLabel>
          <Textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            placeholder="Détail de la modification apportée au contrat..."
          />
        </FormGroup>

        {/* Salaire : pertinent pour AUGMENTATION_SALAIRE et CONFIRMATION_PE, mais on
            le laisse disponible pour tout type sauf RUPTURE (une rupture ne touche pas le salaire) */}
        {formData.typeAvenant !== 'RUPTURE' && (
          <FormRow>
            <FormGroup>
              <FormLabel>Nouveau salaire (optionnel)</FormLabel>
              <Input
                value={formData.nouveauSalaire}
                onChange={e => setFormData({ ...formData, nouveauSalaire: e.target.value })}
                placeholder={`Actuel : ${salaireActuel}`}
              />
            </FormGroup>

            {necessiteDateFin(formData.typeAvenant) && (
              <FormGroup>
                <FormLabel required>Nouvelle date de fin de période d'essai</FormLabel>
                <Input type="date" value={formData.nouvelleDateFin} onChange={e => setFormData({ ...formData, nouvelleDateFin: e.target.value })} />
              </FormGroup>
            )}
          </FormRow>
        )}

        {necessitePosteOuDirection(formData.typeAvenant) && (
          <FormRow>
            <FormGroup>
              <FormLabel>Nouveau poste</FormLabel>
              <Input
                value={formData.nouveauPoste}
                onChange={e => setFormData({ ...formData, nouveauPoste: e.target.value })}
                placeholder={posteActuel ? `Actuel : ${posteActuel}` : ''}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Nouvelle direction</FormLabel>
              <Select value={formData.nouvelleDirectionId} onChange={e => setFormData({ ...formData, nouvelleDirectionId: e.target.value })}>
                <option value="">Direction inchangée</option>
                {directions.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </Select>
            </FormGroup>
          </FormRow>
        )}

        {necessiteResiliation(formData.typeAvenant) && (
          <>
            <Alert variant="red">Ceci mettra fin au contrat (statut RESILIE).</Alert>
            <FormRow>
              <FormGroup>
                <FormLabel required>Date de résiliation</FormLabel>
                <Input type="date" value={formData.dateResiliation} onChange={e => setFormData({ ...formData, dateResiliation: e.target.value })} />
              </FormGroup>
            </FormRow>
            <FormGroup>
              <FormLabel required>Motif de résiliation</FormLabel>
              <Textarea value={formData.motifResiliation} onChange={e => setFormData({ ...formData, motifResiliation: e.target.value })} rows={3} />
            </FormGroup>
          </>
        )}
      </div>
    </Modal>
  );
}