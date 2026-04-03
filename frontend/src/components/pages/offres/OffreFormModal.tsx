// frontend/src/components/pages/offres/OffreFormModal.tsx

import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import { offreService } from '@/services/offre.service';
import { demandeService } from '@/services/demande.service';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Offre } from '@/services/offre.service';
// Interface pour les props (sans size)
interface OffreFormModalProps {
  offreExistant?: Offre | null; 
  onClose: () => void;
  
  onSuccess: () => void;
}

export function OffreFormModal({ onClose, onSuccess }: OffreFormModalProps) {
  const [demandes, setDemandes] = useState<any[]>([]);
  const [selectedDemandeId, setSelectedDemandeId] = useState('');
  const [loadingDemandes, setLoadingDemandes] = useState(true);
  const [generatingIA, setGeneratingIA] = useState(false);
  const [iaResult, setIaResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    intitule: '',
    description: '',
    profilRecherche: '',
    competences: [] as string[],
    fourchetteSalariale: '',
    typeContrat: 'CDI',
    canauxPublication: ['Kilani']
  });
  const [newCompetence, setNewCompetence] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDemandesValidees();
  }, []);

  const loadDemandesValidees = async () => {
    try {
      const response = await demandeService.getDemandes({ statut: 'VALIDEE' });
      setDemandes(response.data.demandes || []);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    } finally {
      setLoadingDemandes(false);
    }
  };

  const handleGenererIA = async () => {
    if (!selectedDemandeId) {
      alert('Veuillez sélectionner une demande validée');
      return;
    }

    setGeneratingIA(true);
    try {
      const response = await offreService.genererAvecIA(selectedDemandeId);
      const data = response.data;
      setIaResult(data);
      setFormData({
        intitule: data.intitule || formData.intitule,
        description: data.description,
        profilRecherche: data.profilRecherche,
        competences: data.competences || [],
        fourchetteSalariale: data.fourchetteSalariale,
        typeContrat: formData.typeContrat,
        canauxPublication: formData.canauxPublication
      });
    } catch (error) {
      console.error('Erreur génération IA:', error);
      alert('Erreur lors de la génération IA');
    } finally {
      setGeneratingIA(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDemandeId) {
      alert('Veuillez sélectionner une demande');
      return;
    }

    setSubmitting(true);
    try {
      await offreService.createOffre({
        demandeId: selectedDemandeId,
        ...formData
      });
      onSuccess();
    } catch (error) {
      console.error('Erreur création:', error);
      alert('Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const addCompetence = () => {
    if (newCompetence.trim() && !formData.competences.includes(newCompetence.trim())) {
      setFormData({
        ...formData,
        competences: [...formData.competences, newCompetence.trim()]
      });
      setNewCompetence('');
    }
  };

  const removeCompetence = (comp: string) => {
    setFormData({
      ...formData,
      competences: formData.competences.filter(c => c !== comp)
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              <Sparkles size={18} style={{ display: 'inline', marginRight: 8 }} />
              Créer une offre d'emploi
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Demande de recrutement validée *
            </label>
            <select
              value={selectedDemandeId}
              onChange={(e) => setSelectedDemandeId(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
              disabled={loadingDemandes}
            >
              <option value="">Sélectionner une demande...</option>
              {demandes.map(d => (
                <option key={d.id} value={d.id}>
                  {d.reference} - {d.intitulePoste}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <Button onClick={handleGenererIA} disabled={!selectedDemandeId || generatingIA}>
              {generatingIA ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generatingIA ? 'Génération en cours...' : 'Générer avec IA'}
            </Button>
            {iaResult && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--gold-light)', borderRadius: 8, border: '1px solid var(--gold)' }}>
                ✅ Offre générée par IA (modèle maison 100% gratuit)
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Intitulé du poste *</label>
              <input
                type="text"
                value={formData.intitule}
                onChange={(e) => setFormData({ ...formData, intitule: e.target.value })}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Description du poste</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Profil recherché</label>
              <textarea
                value={formData.profilRecherche}
                onChange={(e) => setFormData({ ...formData, profilRecherche: e.target.value })}
                rows={4}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Compétences</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  value={newCompetence}
                  onChange={(e) => setNewCompetence(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCompetence()}
                  placeholder="Ajouter une compétence"
                  style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
                />
                <Button onClick={addCompetence} size="sm">Ajouter</Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {formData.competences.map(comp => (
                  <span key={comp} style={{ background: 'var(--gold-light)', padding: '4px 12px', borderRadius: 20, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {comp}
                    <button onClick={() => removeCompetence(comp)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold-deep)' }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Fourchette salariale</label>
              <input
                type="text"
                value={formData.fourchetteSalariale}
                onChange={(e) => setFormData({ ...formData, fourchetteSalariale: e.target.value })}
                placeholder="Ex: 2500 - 3200 TND mensuel"
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Type de contrat *</label>
              <select
                value={formData.typeContrat}
                onChange={(e) => setFormData({ ...formData, typeContrat: e.target.value })}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
              >
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="STAGE">Stage</option>
                <option value="ALTERNANCE">Alternance</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Créer l'offre
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}