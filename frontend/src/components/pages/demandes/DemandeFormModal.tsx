import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { FormGroup, FormLabel } from '../../ui/FormField';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

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

const NIVEAUX_POSTE = [
  { 
    value: 'TECHNICIEN', 
    label: 'Technicien / Ouvrier', 
    description: 'Postes techniques et ouvriers',
    circuit: ['DIR', 'RH'],
    circuitText: 'Validation par Directeur → RH',
    color: '#ac6b2e',
    budgetMin: 800,
    budgetMax: 1500
  },
  { 
    value: 'EMPLOYE', 
    label: 'Employe / Agent', 
    description: 'Postes administratifs',
    circuit: ['DIR', 'RH'],
    circuitText: 'Validation par Directeur → RH',
    color: '#ac6b2e',
    budgetMin: 1000,
    budgetMax: 2000
  },
  { 
    value: 'CADRE_DEBUTANT', 
    label: 'Cadre debutant', 
    description: 'Cadres juniors (1-3 ans experience)',
    circuit: ['DIR', 'RH', 'DAF'],
    circuitText: 'Validation par Directeur → RH → DAF',
    color: '#ac6b2e',
    budgetMin: 2000,
    budgetMax: 3500
  },
  { 
    value: 'CADRE_CONFIRME', 
    label: 'Cadre confirme', 
    description: 'Cadres seniors (4-8 ans experience)',
    circuit: ['DIR', 'RH', 'DAF', 'DGA'],
    circuitText: 'Validation par Directeur → RH → DAF → DGA',
    color: '#ac6b2e',
    budgetMin: 3500,
    budgetMax: 5500
  },
  { 
    value: 'CADRE_SUPERIEUR', 
    label: 'Cadre superieur', 
    description: 'Directeurs de departement',
    circuit: ['DIR', 'RH', 'DAF', 'DGA', 'DG'],
    circuitText: 'Validation par Directeur → RH → DAF → DGA → DG',
    color: '#ac6b2e',
    budgetMin: 5500,
    budgetMax: 9000
  },
  { 
    value: 'STRATEGIQUE', 
    label: 'Poste strategique', 
    description: 'Postes de direction generale',
    circuit: ['DIR', 'RH', 'DAF', 'DGA', 'DG'],
    circuitText: 'Validation complete (toutes les directions)',
    color: '#ac6b2e',
    budgetMin: 9000,
    budgetMax: 20000
  }
];

const TRANSVERSAL_ROLES = ['rh', 'daf', 'dga', 'dg', 'superadmin'];

export const DemandeFormModal = ({ open, onClose, onSuccess }: any) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [disponibilites, setDisponibilites] = useState<Disponibilite[]>([
    { date: '', heureDebut: '', heureFin: '' }
  ]);
  const [budgetError, setBudgetError] = useState('');
  const [selectedDirectionId, setSelectedDirectionId] = useState('');
  const [dateError, setDateError] = useState('');
  
  const [formData, setFormData] = useState({
    intitulePoste: '',
    niveau: 'CADRE_CONFIRME',
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

  useEffect(() => {
    const niveauConfig = NIVEAUX_POSTE.find(n => n.value === formData.niveau);
    if (niveauConfig && !formData.budgetMin && !formData.budgetMax) {
      setFormData(prev => ({
        ...prev,
        budgetMin: niveauConfig.budgetMin.toString(),
        budgetMax: niveauConfig.budgetMax.toString()
      }));
    }
  }, [formData.niveau]);

  const validateDates = (dateSouhaitee: string, disponibilites: Disponibilite[]) => {
    if (!dateSouhaitee) return true;
    
    const souhaitDate = new Date(dateSouhaitee);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (souhaitDate < today) {
      setDateError('La date souhaitee ne peut pas etre dans le passe');
      return false;
    }
    
    for (const dispo of disponibilites) {
      if (dispo.date && dispo.heureDebut && dispo.heureFin) {
        const entretienDate = new Date(dispo.date);
        
        if (entretienDate < today) {
          setDateError('La date d\'entretien ne peut pas etre dans le passe');
          return false;
        }
        
        const minDaysBefore = 14;
        const diffDays = Math.ceil((souhaitDate.getTime() - entretienDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < minDaysBefore) {
          setDateError(`Les entretiens doivent etre planifies au moins ${minDaysBefore} jours avant la date de debut souhaitee`);
          return false;
        }
        
        if (dispo.heureDebut >= dispo.heureFin) {
          setDateError('L\'heure de debut doit etre anterieure a l\'heure de fin');
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
      setBudgetError('');
      setDateError('');
      setDisponibilites([{ date: '', heureDebut: '', heureFin: '' }]);
      
      setFormData({
        intitulePoste: '',
        niveau: 'CADRE_CONFIRME',
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
      
      if (needsToSelectDirection) {
        fetchDirections();
      }
    }
  }, [open, user]);

  const fetchDirections = async () => {
    try {
      const response = await api.get('/directions');
      setDirections(response.data.data || []);
    } catch (err) {
      console.error('Erreur chargement directions:', err);
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
      setBudgetError('Le budget minimum ne peut pas etre superieur au budget maximum');
    } else if (min && max && minNum === maxNum) {
      setBudgetError('Les budgets minimum et maximum ne peuvent pas etre identiques');
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
    if (!formData.intitulePoste || !formData.niveau || !formData.justification || 
        !formData.budgetMin || !formData.budgetMax || !formData.dateSouhaitee || !formData.motif) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (needsToSelectDirection && !selectedDirectionId) {
      alert('Veuillez selectionner une direction');
      return;
    }

    const minNum = parseFloat(formData.budgetMin);
    const maxNum = parseFloat(formData.budgetMax);
    
    if (minNum > maxNum) {
      alert('Le budget minimum ne peut pas etre superieur au budget maximum');
      return;
    }
    
    if (minNum === maxNum) {
      alert('Les budgets minimum et maximum ne peuvent pas etre identiques');
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
        intitulePoste: formData.intitulePoste,
        niveau: formData.niveau,
        justification: formData.justification,
        motif: formData.motif,
        commentaireMotif: formData.commentaireMotif,
        personneRemplaceeNom: formData.personneRemplaceeNom,
        fonctionRemplacee: formData.fonctionRemplacee,
        typeContrat: formData.typeContrat,
        priorite: formData.priorite,
        budgetMin: parseFloat(formData.budgetMin),
        budgetMax: parseFloat(formData.budgetMax),
        dateSouhaitee: new Date(formData.dateSouhaitee),
        description: formData.description,
        disponibilites: validDisponibilites
      };
      
      if (needsToSelectDirection) {
        payload.directionId = selectedDirectionId;
      } else if (hasFixedDirection && user?.directionId) {
        payload.directionId = user.directionId;
      }
      
      await api.post('/demandes', payload);
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la creation');
    } finally {
      setLoading(false);
    }
  };

  const selectedNiveau = NIVEAUX_POSTE.find(n => n.value === formData.niveau);
  const circuitLabels = selectedNiveau?.circuit || [];

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
            {loading ? 'Creation...' : 'Creer la demande'}
          </Button>
        </div>
      }
    >
      <div style={{ padding: '8px 0', maxHeight: '60vh', overflowY: 'auto' }}>
        {needsToSelectDirection && (
          <FormGroup>
            <FormLabel>Direction <span style={{ color: 'red' }}>*</span></FormLabel>
            <select
              value={selectedDirectionId}
              onChange={(e) => setSelectedDirectionId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            >
              <option value="">Selectionner une direction</option>
              {directions.map(dir => (
                <option key={dir.id} value={dir.id}>{dir.nom}</option>
              ))}
            </select>
          </FormGroup>
        )}

        <FormGroup>
          <FormLabel>Intitule du poste <span style={{ color: 'red' }}>*</span></FormLabel>
          <input
            name="intitulePoste"
            value={formData.intitulePoste}
            onChange={handleChange}
            placeholder="ex: Chef de produit, Lead developpeur, Directeur commercial..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Saisissez l'intitule exact du poste a pourvoir
          </div>
        </FormGroup>

        <FormGroup>
          <FormLabel>Niveau du poste <span style={{ color: 'red' }}>*</span></FormLabel>
          <select
            name="niveau"
            value={formData.niveau}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          >
            {NIVEAUX_POSTE.map(niveau => (
              <option key={niveau.value} value={niveau.value}>
                {niveau.label}
              </option>
            ))}
          </select>
          
          {selectedNiveau && (
            <div style={{ 
              marginTop: 12, 
              padding: 12, 
              background: '#f8f9fa', 
              borderRadius: 8,
              borderLeft: `4px solid ${selectedNiveau.color}`
            }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Circuit de validation
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  {circuitLabels.map((label, idx) => {
                    const stepColors: Record<string, string> = {
                      'DIR': '#4a4a4a',
                      'RH': '#5a5a5a',
                      'DAF': '#6a6a6a',
                      'DGA': '#7a7a7a',
                      'DG': '#8a8a8a',
                    };
                    return (
                      <span key={idx}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          background: `${stepColors[label]}15`,
                          border: `1px solid ${stepColors[label]}40`,
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          color: stepColors[label]
                        }}>
                          {label}
                        </span>
                        {idx < circuitLabels.length - 1 && (
                          <span style={{ marginLeft: 4, marginRight: 4, color: '#bbb' }}>→</span>
                        )}
                      </span>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: '#666' }}>
                  {selectedNiveau.circuitText}
                </div>
              </div>
              <div style={{ 
                fontSize: 11, 
                color: '#888',
                paddingTop: 8,
                borderTop: '1px solid #e0e0e0'
              }}>
                {selectedNiveau.description}
              </div>
            </div>
          )}
        </FormGroup>

        <FormGroup>
          <FormLabel>Motif <span style={{ color: 'red' }}>*</span></FormLabel>
          <select
            name="motif"
            value={formData.motif}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          >
            <option value="CREATION">Creation de poste</option>
            <option value="REMPLACEMENT">Remplacement</option>
            <option value="RENFORCEMENT">Renforcement d'equipe</option>
          </select>
        </FormGroup>

        {formData.motif === 'REMPLACEMENT' && (
          <>
            <FormGroup>
              <FormLabel>Nom de la personne remplacee</FormLabel>
              <input
                name="personneRemplaceeNom"
                value={formData.personneRemplaceeNom}
                onChange={handleChange}
                placeholder="Nom et prenom"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Fonction de la personne remplacee</FormLabel>
              <input
                name="fonctionRemplacee"
                value={formData.fonctionRemplacee}
                onChange={handleChange}
                placeholder="Poste occupe"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
            </FormGroup>
          </>
        )}

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

        <FormGroup>
          <FormLabel>Priorite <span style={{ color: 'red' }}>*</span></FormLabel>
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

        <FormGroup>
          <FormLabel>Date souhaitee <span style={{ color: 'red' }}>*</span></FormLabel>
          <input
            type="date"
            name="dateSouhaitee"
            value={formData.dateSouhaitee}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
        </FormGroup>

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

        <FormGroup>
          <FormLabel>Description du poste</FormLabel>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Decrivez les missions et responsabilites..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>Budget mensuel <span style={{ color: 'red' }}>*</span></FormLabel>
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
          {selectedNiveau && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Suggestion pour {selectedNiveau.label.toLowerCase()} : {selectedNiveau.budgetMin} - {selectedNiveau.budgetMax} DT
            </div>
          )}
          {budgetError && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{budgetError}</div>
          )}
        </FormGroup>

        <FormGroup>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <FormLabel>Disponibilites pour entretien technique</FormLabel>
            <Button variant="ghost" size="xs" onClick={addDisponibilite}>
              <Plus size={14} /> Ajouter un creneau
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
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{dateError}</div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Les entretiens doivent etre planifies au moins 14 jours avant la date de debut souhaitee
          </div>
        </FormGroup>
      </div>
    </Modal>
  );
};