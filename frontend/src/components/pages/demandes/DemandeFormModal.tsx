import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { demandeService } from '../../../services/demande.service';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input, FormGroup, FormLabel, FormRow, Select } from '../../ui/FormField';
import { Alert } from '../../ui/Alert';

interface DemandeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DemandeFormModal = ({ open, onClose, onSuccess }: DemandeFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    intitulePoste: '',
    justification: '',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'MOYENNE',
    budgetEstime: 0,
    dateSouhaitee: '',
    description: '',
    disponibilites: [{ date: '', heureDebut: '09:00', heureFin: '12:00' }]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await demandeService.createDemande(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const addDisponibilite = () => {
    setFormData({
      ...formData,
      disponibilites: [...formData.disponibilites, { date: '', heureDebut: '09:00', heureFin: '12:00' }]
    });
  };

  const removeDisponibilite = (index: number) => {
    const newDispos = [...formData.disponibilites];
    newDispos.splice(index, 1);
    setFormData({ ...formData, disponibilites: newDispos });
  };

  const updateDisponibilite = (index: number, field: string, value: string) => {
    const newDispos = [...formData.disponibilites];
    newDispos[index] = { ...newDispos[index], [field]: value };
    setFormData({ ...formData, disponibilites: newDispos });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle demande de recrutement"
      maxWidth={700}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer la demande'}
          </Button>
        </div>
      }
    >
      <div style={{ padding: '8px 0' }}>
        {error && <Alert variant="red" style={{ marginBottom: 16 }}>{error}</Alert>}

        <FormGroup>
          <FormLabel required>Intitulé du poste</FormLabel>
          <Input
            value={formData.intitulePoste}
            onChange={(e) => setFormData({ ...formData, intitulePoste: e.target.value })}
            placeholder="Ex: Ingénieur DevOps"
          />
        </FormGroup>

        <FormGroup>
          <FormLabel required>Justification du besoin</FormLabel>
          <Input
            value={formData.justification}
            onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
            placeholder="Pourquoi ce poste est nécessaire ?"
          />
        </FormGroup>

        <FormRow>
          <FormGroup>
            <FormLabel required>Motif</FormLabel>
            <Select
              value={formData.motif}
              onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
            >
              <option value="CREATION">Création de poste</option>
              <option value="REMPLACEMENT">Remplacement</option>
              <option value="RENFORCEMENT">Renforcement d'équipe</option>
              <option value="NOUVEAU_POSTE">Nouveau poste</option>
              <option value="EXPANSION">Expansion d'activité</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel required>Type de contrat</FormLabel>
            <Select
              value={formData.typeContrat}
              onChange={(e) => setFormData({ ...formData, typeContrat: e.target.value })}
            >
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="STAGE">Stage</option>
              <option value="ALTERNANCE">Alternance</option>
              <option value="FREELANCE">Freelance</option>
            </Select>
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup>
            <FormLabel required>Priorité</FormLabel>
            <Select
              value={formData.priorite}
              onChange={(e) => setFormData({ ...formData, priorite: e.target.value })}
            >
              <option value="HAUTE">Haute</option>
              <option value="MOYENNE">Moyenne</option>
              <option value="BASSE">Basse</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel required>Budget estimé (DT/an)</FormLabel>
            <Input
              type="number"
              value={formData.budgetEstime}
              onChange={(e) => setFormData({ ...formData, budgetEstime: Number(e.target.value) })}
              placeholder="Ex: 45000"
            />
          </FormGroup>
        </FormRow>

        <FormGroup>
          <FormLabel required>Date souhaitée</FormLabel>
          <Input
            type="date"
            value={formData.dateSouhaitee}
            onChange={(e) => setFormData({ ...formData, dateSouhaitee: e.target.value })}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>Description du poste</FormLabel>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
            placeholder="Description des missions et responsabilités..."
          />
        </FormGroup>

        {/* Disponibilités pour entretiens techniques */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <FormLabel>Disponibilités pour entretiens techniques</FormLabel>
            <Button variant="secondary" size="xs" onClick={addDisponibilite}>
              <Plus size={12} /> Ajouter un créneau
            </Button>
          </div>
          
          {formData.disponibilites.map((dispo, index) => (
            <div key={index} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
              <Input
                type="date"
                value={dispo.date}
                onChange={(e) => updateDisponibilite(index, 'date', e.target.value)}
                style={{ flex: 2 }}
                placeholder="Date"
              />
              <Input
                type="time"
                value={dispo.heureDebut}
                onChange={(e) => updateDisponibilite(index, 'heureDebut', e.target.value)}
                style={{ flex: 1 }}
              />
              <Input
                type="time"
                value={dispo.heureFin}
                onChange={(e) => updateDisponibilite(index, 'heureFin', e.target.value)}
                style={{ flex: 1 }}
              />
              {formData.disponibilites.length > 1 && (
                <Button variant="danger" size="xs" onClick={() => removeDisponibilite(index)}>
                  <Trash2 size={12} />
                </Button>
              )}
            </div>
          ))}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            💡 Ces créneaux seront utilisés pour planifier les entretiens techniques avec les candidats présélectionnés.
          </div>
        </div>
      </div>
    </Modal>
  );
};