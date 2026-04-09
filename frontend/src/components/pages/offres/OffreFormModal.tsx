// frontend/src/components/pages/offres/OffreFormModal.tsx

import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import { offreService, Offre, DemandeLight } from '@/services/offre.service';
import { Button } from '@/components/ui/Button';

interface OffreFormModalProps {
  offreExistant?: Offre | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function OffreFormModal({ offreExistant, onClose, onSuccess }: OffreFormModalProps) {
  const [demandes, setDemandes] = useState<DemandeLight[]>([]);
  const [selectedDemandeId, setSelectedDemandeId] = useState('');
  const [loadingDemandes, setLoadingDemandes] = useState(true);
  const [generatingIA, setGeneratingIA] = useState(false);
  const [iaResult, setIaResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    intitule: offreExistant?.intitule || '',
    description: offreExistant?.description || '',
    profilRecherche: offreExistant?.profilRecherche || '',
    competences: offreExistant?.competences || ([] as string[]),
    fourchetteSalariale: offreExistant?.fourchetteSalariale || '',
    typeContrat: offreExistant?.typeContrat || 'CDI',
    canauxPublication: offreExistant?.canauxPublication || ['Kilani']
  });
  const [newCompetence, setNewCompetence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!offreExistant;

  useEffect(() => {
    if (!isEditing) {
      loadDemandesSansOffre();
    } else {
      setLoadingDemandes(false);
      if (offreExistant?.demandeId) {
        setSelectedDemandeId(offreExistant.demandeId);
      }
    }
  }, []);

  const loadDemandesSansOffre = async () => {
    try {
      const response = await offreService.getDemandesSansOffre();
      const liste = response.data?.demandes || [];
      setDemandes(liste);

      if (liste.length === 0) {
        setError('Aucune demande validée sans offre disponible. Toutes les demandes validées ont déjà une offre associée.');
      }
    } catch (err) {
      console.error('Erreur chargement demandes sans offre:', err);
      setError('Impossible de charger les demandes disponibles.');
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
      setFormData(prev => ({
        ...prev,
        intitule: data.intitule || prev.intitule,
        description: data.description || '',
        profilRecherche: data.profilRecherche || '',
        competences: data.competences || [],
        fourchetteSalariale: data.fourchetteSalariale || ''
      }));
    } catch (err) {
      console.error('Erreur génération IA:', err);
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
    if (!formData.intitule.trim()) {
      alert("Veuillez saisir l'intitulé du poste");
      return;
    }

    setSubmitting(true);
    try {
      await offreService.createOffre({
        demandeId: selectedDemandeId,
        ...formData
      });
      onSuccess();
    } catch (err: any) {
      console.error('Erreur création:', err);
      alert(`Erreur : ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const addCompetence = () => {
    const val = newCompetence.trim();
    if (val && !formData.competences.includes(val)) {
      setFormData(prev => ({ ...prev, competences: [...prev.competences, val] }));
      setNewCompetence('');
    }
  };

  const removeCompetence = (comp: string) => {
    setFormData(prev => ({ ...prev, competences: prev.competences.filter(c => c !== comp) }));
  };

  const toggleCanal = (canal: string) => {
    setFormData(prev => {
      if (prev.canauxPublication.includes(canal)) {
        return { ...prev, canauxPublication: prev.canauxPublication.filter(c => c !== canal) };
      } else {
        return { ...prev, canauxPublication: [...prev.canauxPublication, canal] };
      }
    });
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: 16,
          maxWidth: 800, width: '90%', maxHeight: '90vh', overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 24 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              <Sparkles size={18} style={{ display: 'inline', marginRight: 8 }} />
              {isEditing ? "Modifier l'offre" : "Créer une offre d'emploi"}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Sélection de la demande — uniquement en mode création */}
          {!isEditing && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Demande de recrutement validée *
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                  (uniquement les demandes sans offre)
                </span>
              </label>

              {loadingDemandes ? (
                <div style={{ padding: 10, color: 'var(--text-muted)', fontSize: 13 }}>
                  <Loader2 size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Chargement des demandes disponibles...
                </div>
              ) : error && demandes.length === 0 ? (
                <div style={{
                  padding: 12, background: '#fef3c7', borderRadius: 8,
                  border: '1px solid #fcd34d', fontSize: 13, color: '#92400e'
                }}>
                  ⚠️ {error}
                </div>
              ) : (
                <>
                  <select
                    value={selectedDemandeId}
                    onChange={(e) => setSelectedDemandeId(e.target.value)}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
                  >
                    <option value="">Sélectionner une demande ({demandes.length} disponible{demandes.length > 1 ? 's' : ''})...</option>
                    {demandes.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.reference} — {d.intitulePoste}
                        {d.direction?.nom ? ` · ${d.direction.nom}` : ''}
                        {d.typeContrat ? ` · ${d.typeContrat}` : ''}
                      </option>
                    ))}
                  </select>
                  {demandes.length === 0 && !error && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      Toutes les demandes validées ont déjà une offre associée.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Bouton génération IA */}
          {!isEditing && (
            <div style={{ marginBottom: 20 }}>
              <Button onClick={handleGenererIA} disabled={!selectedDemandeId || generatingIA}>
                {generatingIA ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generatingIA ? 'Génération en cours...' : 'Générer avec IA'}
              </Button>
              {iaResult && (
                <div style={{
                  marginTop: 12, padding: 12,
                  background: 'var(--gold-light)', borderRadius: 8,
                  border: '1px solid var(--gold)', fontSize: 13
                }}>
                  ✅ Offre générée par IA — vous pouvez modifier les champs ci-dessous avant de sauvegarder.
                </div>
              )}
            </div>
          )}

          {/* Formulaire */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Intitulé du poste *
              </label>
              <input
                type="text"
                value={formData.intitule}
                onChange={(e) => setFormData(prev => ({ ...prev, intitule: e.target.value }))}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Description du poste
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={6}
                style={{
                  width: '100%', padding: 10, borderRadius: 8,
                  border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 12
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Profil recherché
              </label>
              <textarea
                value={formData.profilRecherche}
                onChange={(e) => setFormData(prev => ({ ...prev, profilRecherche: e.target.value }))}
                rows={4}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Compétences requises
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  value={newCompetence}
                  onChange={(e) => setNewCompetence(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCompetence()}
                  placeholder="Ajouter une compétence (Entrée pour valider)"
                  style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
                />
                <Button onClick={addCompetence} size="sm">Ajouter</Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {formData.competences.map(comp => (
                  <span
                    key={comp}
                    style={{
                      background: 'var(--gold-light)', padding: '4px 12px',
                      borderRadius: 20, fontSize: 12,
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    {comp}
                    <button
                      onClick={() => removeCompetence(comp)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold-deep)', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Fourchette salariale
              </label>
              <input
                type="text"
                value={formData.fourchetteSalariale}
                onChange={(e) => setFormData(prev => ({ ...prev, fourchetteSalariale: e.target.value }))}
                placeholder="Ex: 2500 - 3200 TND mensuel"
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Type de contrat *
              </label>
              <select
                value={formData.typeContrat}
                onChange={(e) => setFormData(prev => ({ ...prev, typeContrat: e.target.value }))}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
              >
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="STAGE">Stage</option>
                <option value="ALTERNANCE">Alternance</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </div>

            {/* SECTION CANAUX DE PUBLICATION - NOUVEAU */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                Canaux de publication
              </label>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.canauxPublication.includes('Kilani')}
                    disabled
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span>Kilani (interne - obligatoire)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.canauxPublication.includes('LinkedIn')}
                    onChange={() => toggleCanal('LinkedIn')}
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span>LinkedIn</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.canauxPublication.includes('TanitJobs')}
                    onChange={() => toggleCanal('TanitJobs')}
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span>TanitJobs</span>
                </label>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                💡 Les canaux sélectionnés seront utilisés lors de la publication de l'offre.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={submitting || (demandes.length === 0 && !isEditing)}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {isEditing ? "Mettre à jour" : "Créer l'offre"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}