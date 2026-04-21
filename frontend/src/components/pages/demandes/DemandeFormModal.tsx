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

// ✅ Disponibilités de l'interviewer (Manager/Directeur)
interface DisponibiliteInterviewer {
  date: string;
  heureDebut: string;
  heureFin: string;
}

const NIVEAUX_POSTE = [
  { 
    value: 'TECHNICIEN', 
    label: 'Technicien / Ouvrier', 
    description: 'Postes techniques et ouvriers',
    circuit: ['MANAGER', 'DIR', 'RH'],  
    circuitText: 'Validation par Manager → Directeur → RH',
    color: '#ac6b2e',
    budgetMin: 800,
    budgetMax: 1500
  },
  { 
    value: 'EMPLOYE', 
    label: 'Employe / Agent', 
    description: 'Postes administratifs',
    circuit: ['MANAGER', 'DIR', 'RH'],  // ✅ Corrigé
    circuitText: 'Validation par Manager → Directeur → RH',
    color: '#ac6b2e',
    budgetMin: 1000,
    budgetMax: 2000
  },
  { 
    value: 'CADRE_DEBUTANT', 
    label: 'Cadre debutant', 
    description: 'Cadres juniors (1-3 ans experience)',
    circuit: ['MANAGER', 'DIR', 'RH', 'DAF'],  // ✅ Corrigé
    circuitText: 'Validation par Manager → Directeur → RH → DAF',
    color: '#ac6b2e',
    budgetMin: 2000,
    budgetMax: 3500
  },
  { 
    value: 'CADRE_CONFIRME', 
    label: 'Cadre confirme', 
    description: 'Cadres seniors (4-8 ans experience)',
    circuit: ['MANAGER', 'DIR', 'RH', 'DAF', 'DGA'],  // ✅ Corrigé
    circuitText: 'Validation par Manager → Directeur → RH → DAF → DGA',
    color: '#ac6b2e',
    budgetMin: 3500,
    budgetMax: 5500
  },
  { 
    value: 'CADRE_SUPERIEUR', 
    label: 'Cadre superieur', 
    description: 'Directeurs de departement',
    circuit: ['DIR', 'RH', 'DAF', 'DGA', 'DG'],  // ✅ Correct (pas de Manager)
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
    circuitText: 'Validation par Directeur → RH → DAF → DGA → DG',
    color: '#ac6b2e',
    budgetMin: 9000,
    budgetMax: 20000
  }
];

const TRANSVERSAL_ROLES = ['rh', 'daf', 'dga', 'dg', 'superadmin'];
const INTERVIEWER_ROLES = ['manager', 'directeur'];
const NIVEAUX_AVEC_DIRECTION = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];

export const DemandeFormModal = ({ open, onClose, onSuccess }: any) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [budgetError, setBudgetError] = useState('');
  const [selectedDirectionId, setSelectedDirectionId] = useState('');
  const [dateError, setDateError] = useState('');
  
  // ✅ Disponibilités de l'interviewer (Manager/Directeur créateur)
  const [mesDisponibilites, setMesDisponibilites] = useState<DisponibiliteInterviewer[]>([
    { date: '', heureDebut: '', heureFin: '' }
  ]);
  
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
  
  // ✅ Vérifier si l'utilisateur est un interviewer
  const isInterviewer = INTERVIEWER_ROLES.includes(user?.role || '');
  
  // ✅ Vérifier si l'utilisateur doit saisir ses disponibilités
  const needsToAddDisponibilites = () => {
    if (!isInterviewer) return false;
    
    // Manager → toujours (toujours entretien technique)
    if (user?.role === 'manager') return true;
    
    // Directeur → uniquement pour cadres supérieurs ou stratégiques
    if (user?.role === 'directeur') {
      return NIVEAUX_AVEC_DIRECTION.includes(formData.niveau);
    }
    
    return false;
  };

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

  const validateDates = (dateSouhaitee: string) => {
    if (!dateSouhaitee) return true;
    
    const souhaitDate = new Date(dateSouhaitee);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (souhaitDate < today) {
      setDateError('La date souhaitee ne peut pas etre dans le passe');
      return false;
    }
    
    setDateError('');
    return true;
  };

  // ✅ Validation des disponibilités de l'interviewer
  const validateMesDisponibilites = (disponibilites: DisponibiliteInterviewer[]): boolean => {
    for (const dispo of disponibilites) {
      if (dispo.date && dispo.heureDebut && dispo.heureFin) {
        const dispoDate = new Date(dispo.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dispoDate < today) {
          setDateError('La date de disponibilité ne peut pas etre dans le passe');
          return false;
        }
        
        if (dispo.heureDebut >= dispo.heureFin) {
          setDateError('L\'heure de debut doit etre anterieure a l\'heure de fin');
          return false;
        }
      }
    }
    return true;
  };

  useEffect(() => {
    if (open) {
      setSelectedDirectionId('');
      setBudgetError('');
      setDateError('');
      setMesDisponibilites([{ date: '', heureDebut: '', heureFin: '' }]);
      
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
      validateDates(value);
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

  // ✅ Gestion des disponibilités de l'interviewer
  const addDisponibilite = () => {
    setMesDisponibilites([...mesDisponibilites, { date: '', heureDebut: '', heureFin: '' }]);
  };

  const removeDisponibilite = (index: number) => {
    const newDispos = [...mesDisponibilites];
    newDispos.splice(index, 1);
    setMesDisponibilites(newDispos);
  };

  const updateDisponibilite = (index: number, field: string, value: string) => {
    const newDispos = [...mesDisponibilites];
    newDispos[index] = { ...newDispos[index], [field]: value };
    setMesDisponibilites(newDispos);
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

    if (!validateDates(formData.dateSouhaitee)) {
      alert(dateError);
      return;
    }

    // ✅ Valider les disponibilités de l'interviewer si nécessaire
    const validDisponibilites = mesDisponibilites.filter(d => d.date && d.heureDebut && d.heureFin);
    if (needsToAddDisponibilites() && validDisponibilites.length === 0) {
      alert('Veuillez saisir au moins une disponibilité pour les entretiens');
      return;
    }
    
    if (!validateMesDisponibilites(validDisponibilites)) {
      alert(dateError);
      return;
    }

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
        description: formData.description
      };
      
      if (needsToSelectDirection) {
        payload.directionId = selectedDirectionId;
      } else if (hasFixedDirection && user?.directionId) {
        payload.directionId = user.directionId;
      }
      
      // ✅ Ajouter les disponibilités de l'interviewer si nécessaire
      if (needsToAddDisponibilites() && validDisponibilites.length > 0) {
        payload.disponibilitesInterviewers = validDisponibilites;
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

        {/* ✅ Mes disponibilités (pour Manager/Directeur créateurs) */}
        {needsToAddDisponibilites() && (
          <FormGroup>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <FormLabel>
                Mes disponibilités pour entretiens
                {user?.role === 'directeur' && (
                  <span style={{ fontSize: 11, marginLeft: 8, fontWeight: 'normal' }}>
                    (Cadre supérieur / Stratégique uniquement)
                  </span>
                )}
              </FormLabel>
              <Button variant="ghost" size="xs" onClick={addDisponibilite}>
                <Plus size={14} /> Ajouter un creneau
              </Button>
            </div>
            
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {user?.role === 'manager' 
                ? 'En tant que manager, veuillez saisir vos créneaux disponibles pour les entretiens techniques.'
                : 'En tant que directeur, veuillez saisir vos créneaux disponibles pour les entretiens direction.'}
            </div>
            
            {mesDisponibilites.map((dispo, index) => (
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
                {mesDisponibilites.length > 1 && (
                  <Button variant="ghost" size="xs" onClick={() => removeDisponibilite(index)}>
                    <X size={14} />
                  </Button>
                )}
              </div>
            ))}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Ces créneaux seront utilisés pour planifier les entretiens.
            </div>
          </FormGroup>
        )}
      </div>
    </Modal>
  );
};