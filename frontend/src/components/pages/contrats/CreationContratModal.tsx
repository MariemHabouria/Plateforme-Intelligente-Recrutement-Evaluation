// frontend/src/components/pages/contrats/CreationContratModal.tsx

import { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input, Select, Textarea } from '../../ui/FormField';
import api from '../../../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  candidatureId: string;
  onSuccess: () => void;
}

export function CreationContratModal({ open, onClose, candidatureId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [preloading, setPreloading] = useState(true);
  const [error, setError] = useState('');
  const [donnees, setDonnees] = useState<any>(null);

  const [formData, setFormData] = useState({
    reference: '',
    typeContrat: 'CDI',
    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: '',
    salaire: '',
    prime: '',
    avantages: '',
    clauseParticuliere: '',
    employeurNom: 'KILANI GROUPE',
    employeurRepresentant: 'M. Karim Kilani, Directeur Général',
    employeurAdresse: 'Immeuble Kilani, Centre Urbain Nord, Tunis',
    employePoste: '',
    employeDirection: '',
    employeSuperieur: 'Manager direct',
    employeLieuTravail: 'Siège social - Tunis',
    periodeEssaiDuree: '3',
    periodeEssaiRenouvelable: true,
    horairesHebdo: '40 heures',
    horairesPrecision: 'Du lundi au vendredi, 8h30 - 17h00',
    congesPayes: '30 jours ouvrables par an',
    preavis: '1 mois',
    observations: '',
    documentsFournis: ''
  });

  useEffect(() => {
    if (open && candidatureId) {
      chargerDonneesPrecontrat();
    }
  }, [open, candidatureId]);

  const chargerDonneesPrecontrat = async () => {
    setPreloading(true);
    try {
      const response = await api.get(`/contrats/precontrat/${candidatureId}`);
      const data = response.data.data.donnees;
      setDonnees(data);
      
      // Pré-remplir le formulaire
      setFormData(prev => ({
        ...prev,
        salaire: data.demande?.budgetMax ? `${data.demande.budgetMax} DT` : '3000 DT',
        typeContrat: data.offre?.typeContrat || 'CDI',
        employePoste: data.offre?.intitule || '',
        employeDirection: data.demande?.direction || ''
      }));
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setPreloading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/contrats', {
        candidatureId,
        ...formData
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  if (preloading) {
    return (
      <Modal open={open} onClose={onClose} title="Chargement..." maxWidth={800}>
        <div style={{ padding: 40, textAlign: 'center' }}>Chargement des données...</div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Créer un contrat - Formulaire complet"
      maxWidth={900}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer le contrat'}
          </Button>
        </div>
      }
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '16px' }}>
        {error && <div style={{ marginBottom: 16, color: 'red' }}>{error}</div>}
        
        {/* Section Informations candidat */}
        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Candidat</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><strong>Nom:</strong> {donnees?.candidat?.prenom} {donnees?.candidat?.nom}</div>
            <div><strong>Email:</strong> {donnees?.candidat?.email}</div>
            <div><strong>Téléphone:</strong> {donnees?.candidat?.telephone || '-'}</div>
            <div><strong>Adresse:</strong> {donnees?.candidat?.adresse || '-'}</div>
          </div>
        </div>

        {/* Section Contrat */}
        <h3 style={{ marginBottom: 16 }}>1. Informations générales du contrat</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label>Référence (auto)</label>
            <Input value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="Auto-générée" />
          </div>
          <div>
            <label>Type de contrat *</label>
            <Select value={formData.typeContrat} onChange={e => setFormData({...formData, typeContrat: e.target.value})}>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="STAGE">Stage</option>
              <option value="ALTERNANCE">Alternance</option>
              <option value="FREELANCE">Freelance</option>
            </Select>
          </div>
          <div>
            <label>Date de début *</label>
            <Input type="date" value={formData.dateDebut} onChange={e => setFormData({...formData, dateDebut: e.target.value})} />
          </div>
          <div>
            <label>Date de fin période d'essai</label>
            <Input type="date" value={formData.dateFin} onChange={e => setFormData({...formData, dateFin: e.target.value})} />
          </div>
          <div>
            <label>Salaire brut mensuel *</label>
            <Input value={formData.salaire} onChange={e => setFormData({...formData, salaire: e.target.value})} placeholder="ex: 3000 DT" />
          </div>
          <div>
            <label>Prime / Bonus</label>
            <Input value={formData.prime} onChange={e => setFormData({...formData, prime: e.target.value})} placeholder="ex: 13ème mois, prime de performance..." />
          </div>
        </div>

        {/* Section Employeur */}
        <h3 style={{ marginBottom: 16 }}>2. Informations employeur</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label>Nom de l'entreprise</label>
            <Input value={formData.employeurNom} onChange={e => setFormData({...formData, employeurNom: e.target.value})} />
          </div>
          <div>
            <label>Représentant</label>
            <Input value={formData.employeurRepresentant} onChange={e => setFormData({...formData, employeurRepresentant: e.target.value})} />
          </div>
          <div className="col-span-2">
            <label>Adresse de l'entreprise</label>
            <Input value={formData.employeurAdresse} onChange={e => setFormData({...formData, employeurAdresse: e.target.value})} />
          </div>
        </div>

        {/* Section Employé */}
        <h3 style={{ marginBottom: 16 }}>3. Informations poste</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label>Poste occupé *</label>
            <Input value={formData.employePoste} onChange={e => setFormData({...formData, employePoste: e.target.value})} />
          </div>
          <div>
            <label>Direction / Service</label>
            <Input value={formData.employeDirection} onChange={e => setFormData({...formData, employeDirection: e.target.value})} />
          </div>
          <div>
            <label>Supérieur hiérarchique</label>
            <Input value={formData.employeSuperieur} onChange={e => setFormData({...formData, employeSuperieur: e.target.value})} />
          </div>
          <div>
            <label>Lieu de travail</label>
            <Input value={formData.employeLieuTravail} onChange={e => setFormData({...formData, employeLieuTravail: e.target.value})} />
          </div>
        </div>

        {/* Section Période d'essai */}
        <h3 style={{ marginBottom: 16 }}>4. Période d'essai</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label>Durée (mois)</label>
            <Select value={formData.periodeEssaiDuree} onChange={e => setFormData({...formData, periodeEssaiDuree: e.target.value})}>
              <option value="1">1 mois</option>
              <option value="2">2 mois</option>
              <option value="3">3 mois</option>
              <option value="4">4 mois</option>
            </Select>
          </div>
          <div>
            <label>Renouvelable</label>
            <Select value={String(formData.periodeEssaiRenouvelable)} onChange={e => setFormData({...formData, periodeEssaiRenouvelable: e.target.value === 'true'})}>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </Select>
          </div>
        </div>

        {/* Section Horaires et Congés */}
        <h3 style={{ marginBottom: 16 }}>5. Horaires et congés</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label>Horaires hebdomadaires</label>
            <Input value={formData.horairesHebdo} onChange={e => setFormData({...formData, horairesHebdo: e.target.value})} />
          </div>
          <div>
            <label>Précision horaires</label>
            <Input value={formData.horairesPrecision} onChange={e => setFormData({...formData, horairesPrecision: e.target.value})} />
          </div>
          <div>
            <label>Congés payés</label>
            <Input value={formData.congesPayes} onChange={e => setFormData({...formData, congesPayes: e.target.value})} />
          </div>
          <div>
            <label>Préavis</label>
            <Input value={formData.preavis} onChange={e => setFormData({...formData, preavis: e.target.value})} />
          </div>
        </div>

        {/* Section Avantages et clauses */}
        <h3 style={{ marginBottom: 16 }}>6. Avantages et clauses particulières</h3>
        <div style={{ marginBottom: 16 }}>
          <label>Avantages</label>
          <Textarea value={formData.avantages} onChange={e => setFormData({...formData, avantages: e.target.value})} rows={2} placeholder="Ticket restaurant, mutuelle, voiture de fonction..." />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Clauses particulières</label>
          <Textarea value={formData.clauseParticuliere} onChange={e => setFormData({...formData, clauseParticuliere: e.target.value})} rows={2} placeholder="Clause de non-concurrence, mobilité, confidentialité..." />
        </div>

        {/* Section Observations */}
        <h3 style={{ marginBottom: 16 }}>7. Observations et documents</h3>
        <div style={{ marginBottom: 16 }}>
          <label>Observations</label>
          <Textarea value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} rows={2} />
        </div>
        <div>
          <label>Documents fournis</label>
          <Textarea value={formData.documentsFournis} onChange={e => setFormData({...formData, documentsFournis: e.target.value})} rows={2} placeholder="CV, diplômes, attestations..." />
        </div>
      </div>
    </Modal>
  );
}