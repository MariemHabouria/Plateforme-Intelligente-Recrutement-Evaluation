import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { FormGroup, FormLabel } from '../../ui/FormField';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

interface TypePoste {
  id: string;
  nom: string;
  circuitType: string;
}

interface Direction {
  id: string;
  code: string;
  nom: string;
}

interface Disponibilite {
  date: string;
  heureDebut: string;
  heureFin: string;
}

const TRANSVERSAL_ROLES = ['rh', 'daf', 'dga', 'dg', 'superadmin'];

export const DemandeFormModal = ({ open, onClose, onSuccess }: any) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [typePostes, setTypePostes] = useState<TypePoste[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [disponibilites, setDisponibilites] = useState<Disponibilite[]>([
    { date: '', heureDebut: '', heureFin: '' }
  ]);
  const [budgetError, setBudgetError] = useState('');
  const [selectedDirectionId, setSelectedDirectionId] = useState('');
  const [dateError, setDateError] = useState('');
  
  const [formData, setFormData] = useState({
    intitulePoste: '',
    typePosteId: '',
    justification: '',
    motif: 'CREATION',
    commentaireMotif: '',
    personneRemplaceeNom: '',
    fonctionRemplacee: '',
    typeContrat: 'CDI',
    priorite: 'MOYENNE',
    budgetMin: '',
    budgetMax: '',
    dateSouhaitee: '',
    description: ''
  });

  const isTransversal = TRANSVERSAL_ROLES.includes(user?.role || '');
  const hasFixedDirection = !isTransversal && user?.directionId;
  const needsToSelectDirection = isTransversal;
  const currentDirectionId = hasFixedDirection ? user?.directionId : selectedDirectionId;

  const validateDates = (dateSouhaitee: string, disponibilites: Disponibilite[]) => {
    if (!dateSouhaitee) return true;
    
    const souhaitDate = new Date(dateSouhaitee);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (souhaitDate < today) {
      setDateError('La date souhaitée ne peut pas être dans le passé');
      return false;
    }
    
    for (const dispo of disponibilites) {
      if (dispo.date && dispo.heureDebut && dispo.heureFin) {
        const entretienDate = new Date(dispo.date);
        
        if (entretienDate < today) {
          setDateError('La date d\'entretien ne peut pas être dans le passé');
          return false;
        }
        
        const minDaysBefore = 14;
        const diffDays = Math.ceil((souhaitDate.getTime() - entretienDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < minDaysBefore) {
          setDateError(`Les entretiens doivent être planifiés au moins ${minDaysBefore} jours avant la date de début souhaitée`);
          return false;
        }
        
        if (dispo.heureDebut >= dispo.heureFin) {
          setDateError('L\'heure de début doit être antérieure à l\'heure de fin');
          return false;
        }
      }
    }
    
    setDateError('');
    return true;
  };

  useEffect(() => {
    if (open) {
      setSelectedDirectionId('');
      setTypePostes([]);
      setFormData(prev => ({ ...prev, typePosteId: '' }));
      setBudgetError('');
      setDateError('');
      setDisponibilites([{ date: '', heureDebut: '', heureFin: '' }]);
      
      if (needsToSelectDirection) {
        fetchDirections();
      } else if (hasFixedDirection && user?.directionId) {
        fetchTypePostes(user.directionId);
      }
    }
  }, [open, user]);

  useEffect(() => {
    if (selectedDirectionId && open && needsToSelectDirection) {
      fetchTypePostes(selectedDirectionId);
      setFormData(prev => ({ ...prev, typePosteId: '' }));
    }
  }, [selectedDirectionId]);

  const fetchDirections = async () => {
    try {
      const response = await api.get('/directions');
      setDirections(response.data.data || []);
    } catch (err) {
      console.error('Erreur chargement directions:', err);
    }
  };

  const fetchTypePostes = async (directionId: string) => {
    try {
      const response = await api.get(`/type-postes?directionId=${directionId}`);
      setTypePostes(response.data.data || []);
    } catch (err) {
      console.error('Erreur chargement types de poste:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'budgetMin' || name === 'budgetMax') {
      validateBudget(name === 'budgetMin' ? value : formData.budgetMin, 
                     name === 'budgetMax' ? value : formData.budgetMax);
    }
    
    if (name === 'dateSouhaitee') {
      validateDates(value, disponibilites);
    }
  };

  const validateBudget = (min: string, max: string) => {
    const minNum = parseFloat(min);
    const maxNum = parseFloat(max);
    
    if (min && max && minNum > maxNum) {
      setBudgetError('Le budget minimum ne peut pas être supérieur au budget maximum');
    } else if (min && max && minNum === maxNum) {
      setBudgetError('Les budgets minimum et maximum ne peuvent pas être identiques');
    } else {
      setBudgetError('');
    }
  };

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
    
    if (formData.dateSouhaitee) {
      validateDates(formData.dateSouhaitee, newDispos);
    }
  };

  const handleSubmit = async () => {
    if (!formData.intitulePoste || !formData.typePosteId || !formData.justification || 
        !formData.budgetMin || !formData.budgetMax || !formData.dateSouhaitee) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (needsToSelectDirection && !selectedDirectionId) {
      alert('Veuillez sélectionner une direction');
      return;
    }

    const minNum = parseFloat(formData.budgetMin);
    const maxNum = parseFloat(formData.budgetMax);
    
    if (minNum > maxNum) {
      alert('Le budget minimum ne peut pas être supérieur au budget maximum');
      return;
    }
    
    if (minNum === maxNum) {
      alert('Les budgets minimum et maximum ne peuvent pas être identiques');
      return;
    }

    if (!validateDates(formData.dateSouhaitee, disponibilites)) {
      alert(dateError);
      return;
    }

    const validDisponibilites = disponibilites.filter(
      d => d.date && d.heureDebut && d.heureFin
    );

    setLoading(true);
    try {
      const payload: any = {
        ...formData,
        disponibilites: validDisponibilites
      };
      
      if (needsToSelectDirection) {
        payload.directionId = selectedDirectionId;
      }
      
      await api.post('/demandes', payload);
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
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
          <Button variant="primary" onClick={handleSubmit} disabled={loading || !!budgetError || !!dateError}>
            {loading ? 'Création...' : 'Créer la demande'}
          </Button>
        </div>
      }
    >
      <div style={{ padding: '8px 0', maxHeight: '60vh', overflowY: 'auto' }}>
        {/* Direction - AU DÉBUT du formulaire */}
        {needsToSelectDirection && (
          <FormGroup>
            <FormLabel>Direction <span style={{ color: 'red' }}>*</span></FormLabel>
            <select
              value={selectedDirectionId}
              onChange={(e) => setSelectedDirectionId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            >
              <option value="">Sélectionner une direction</option>
              {directions.map(dir => (
                <option key={dir.id} value={dir.id}>{dir.nom}</option>
              ))}
            </select>
          </FormGroup>
        )}

        {/* Intitulé du poste */}
        <FormGroup>
          <FormLabel>Intitulé du poste <span style={{ color: 'red' }}>*</span></FormLabel>
          <input
            name="intitulePoste"
            value={formData.intitulePoste}
            onChange={handleChange}
            placeholder="ex: Développeur Full Stack"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
        </FormGroup>

        {/* Type de poste */}
        {currentDirectionId && (
          <FormGroup>
            <FormLabel>Type de poste <span style={{ color: 'red' }}>*</span></FormLabel>
            <select
              name="typePosteId"
              value={formData.typePosteId}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            >
              <option value="">Sélectionner un type de poste</option>
              {typePostes.map(tp => (
                <option key={tp.id} value={tp.id}>{tp.nom}</option>
              ))}
            </select>
          </FormGroup>
        )}

        {/* Budget mensuel */}
        <FormGroup>
          <FormLabel>Budget mensuel (DT) <span style={{ color: 'red' }}>*</span></FormLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <input
              type="number"
              name="budgetMin"
              placeholder="Min"
              value={formData.budgetMin}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
            <input
              type="number"
              name="budgetMax"
              placeholder="Max"
              value={formData.budgetMax}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
          </div>
          {budgetError && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>⚠️ {budgetError}</div>
          )}
        </FormGroup>

        {/* Motif */}
        <FormGroup>
          <FormLabel>Motif <span style={{ color: 'red' }}>*</span></FormLabel>
          <select
            name="motif"
            value={formData.motif}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          >
            <option value="CREATION">Création de poste</option>
            <option value="REMPLACEMENT">Remplacement</option>
            <option value="RENFORCEMENT">Renforcement d'équipe</option>
          </select>
        </FormGroup>

        {/* Champs spécifiques au motif */}
        {(formData.motif === 'CREATION' || formData.motif === 'RENFORCEMENT') && (
          <FormGroup>
            <FormLabel>Argumentaire</FormLabel>
            <textarea
              name="commentaireMotif"
              value={formData.commentaireMotif}
              onChange={handleChange}
              rows={3}
              placeholder={formData.motif === 'CREATION' 
                ? "Expliquez pourquoi ce poste est nécessaire..."
                : "Expliquez pourquoi l'équipe doit être renforcée..."}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
          </FormGroup>
        )}

        {formData.motif === 'REMPLACEMENT' && (
          <>
            <FormGroup>
              <FormLabel>Nom de la personne remplacée</FormLabel>
              <input
                name="personneRemplaceeNom"
                value={formData.personneRemplaceeNom}
                onChange={handleChange}
                placeholder="Nom et prénom"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Fonction de la personne remplacée</FormLabel>
              <input
                name="fonctionRemplacee"
                value={formData.fonctionRemplacee}
                onChange={handleChange}
                placeholder="Poste occupé"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
            </FormGroup>
          </>
        )}

        {/* Type de contrat */}
        <FormGroup>
          <FormLabel>Type de contrat <span style={{ color: 'red' }}>*</span></FormLabel>
          <select
            name="typeContrat"
            value={formData.typeContrat}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          >
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="STAGE">Stage</option>
            <option value="ALTERNANCE">Alternance</option>
            <option value="FREELANCE">Freelance</option>
          </select>
        </FormGroup>

        {/* Priorité */}
        <FormGroup>
          <FormLabel>Priorité <span style={{ color: 'red' }}>*</span></FormLabel>
          <select
            name="priorite"
            value={formData.priorite}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          >
            <option value="HAUTE">Haute</option>
            <option value="MOYENNE">Moyenne</option>
            <option value="BASSE">Basse</option>
          </select>
        </FormGroup>

        {/* Date souhaitée */}
        <FormGroup>
          <FormLabel>Date souhaitée <span style={{ color: 'red' }}>*</span></FormLabel>
          <input
            type="date"
            name="dateSouhaitee"
            value={formData.dateSouhaitee}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
        </FormGroup>

        {/* Justification */}
        <FormGroup>
          <FormLabel>Justification <span style={{ color: 'red' }}>*</span></FormLabel>
          <textarea
            name="justification"
            value={formData.justification}
            onChange={handleChange}
            rows={3}
            placeholder="Expliquez le besoin de recrutement..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
        </FormGroup>

        {/* Description */}
        <FormGroup>
          <FormLabel>Description du poste</FormLabel>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Décrivez les missions et responsabilités..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
        </FormGroup>

        {/* Créneaux pour entretien technique */}
        <FormGroup>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <FormLabel>Disponibilités pour entretien technique</FormLabel>
            <Button variant="ghost" size="xs" onClick={addDisponibilite}>
              <Plus size={14} /> Ajouter un créneau
            </Button>
          </div>
          
          {disponibilites.map((dispo, index) => {
            const minDate = formData.dateSouhaitee 
              ? new Date(new Date(formData.dateSouhaitee).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0];
            
            return (
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
                  min={minDate}
                  max={formData.dateSouhaitee || ''}
                  onChange={(e) => updateDisponibilite(index, 'date', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
                />
                <input
                  type="time"
                  value={dispo.heureDebut}
                  onChange={(e) => updateDisponibilite(index, 'heureDebut', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
                />
                <input
                  type="time"
                  value={dispo.heureFin}
                  onChange={(e) => updateDisponibilite(index, 'heureFin', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
                />
                {disponibilites.length > 1 && (
                  <Button variant="ghost" size="xs" onClick={() => removeDisponibilite(index)}>
                    <X size={14} />
                  </Button>
                )}
              </div>
            );
          })}
          {dateError && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>⚠️ {dateError}</div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Les entretiens doivent être planifiés au moins 14 jours avant la date de début souhaitée
          </div>
        </FormGroup>
      </div>
    </Modal>
  );
};