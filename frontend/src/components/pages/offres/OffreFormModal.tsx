// frontend/src/components/pages/offres/OffreFormModal.tsx

import { useState, useEffect } from 'react';
import { X, Loader2, Check, Eye, Calendar, Briefcase, User, FileText, Clock, AlertCircle } from 'lucide-react';
import { offreService, Offre, DemandeLight } from '../../../services/offre.service';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import api from '../../../services/api';

interface DemandeDetail {
  id: string;
  reference: string;
  intitulePoste: string;
  niveau: string;
  description?: string;
  justification: string;
  motif: string;
  typeContrat: string;
  priorite: string;
  budgetMin?: number;
  budgetMax?: number;
  dateSouhaitee: string;
  statut: string;
  createur?: {
    nom: string;
    prenom: string;
    email: string;
    role: string;
  };
  manager?: {
    nom: string;
    prenom: string;
    email: string;
  };
  direction?: {
    nom: string;
  };
  validations?: {
    niveauEtape: number;
    acteur: { nom: string; prenom: string; role: string };
    decision: string;
    commentaire?: string;
    dateDecision?: string;
  }[];
  disponibilitesInterviewers?: {
    id: string;
    user: { nom: string; prenom: string; role: string };
    date: string;
    heureDebut: string;
    heureFin: string;
  }[];
}

interface OffreFormModalProps {
  offreExistant?: Offre | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function OffreFormModal({ offreExistant, onClose, onSuccess }: OffreFormModalProps) {
  const [demandes, setDemandes] = useState<DemandeLight[]>([]);
  const [selectedDemandeId, setSelectedDemandeId] = useState('');
  const [selectedDemandeDetail, setSelectedDemandeDetail] = useState<DemandeDetail | null>(null);
  const [loadingDemandes, setLoadingDemandes] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [formData, setFormData] = useState({
    intitule: offreExistant?.intitule || '',
    description: offreExistant?.description || '',
    profilRecherche: offreExistant?.profilRecherche || '',
    competences: offreExistant?.competences || ([] as string[]),
    fourchetteSalariale: offreExistant?.fourchetteSalariale || '',
    typeContrat: offreExistant?.typeContrat || 'CDI'
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
        loadDemandeDetail(offreExistant.demandeId);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedDemandeId && !isEditing) {
      loadDemandeDetail(selectedDemandeId);
    }
  }, [selectedDemandeId]);

  const loadDemandesSansOffre = async () => {
    try {
      const response = await offreService.getDemandesSansOffre();
      const liste = response.data?.demandes || [];
      setDemandes(liste);
      if (liste.length === 0) {
        setError('Aucune demande validée sans offre disponible.');
      }
    } catch (err) {
      console.error('Erreur chargement demandes:', err);
      setError('Impossible de charger les demandes disponibles.');
    } finally {
      setLoadingDemandes(false);
    }
  };

  const loadDemandeDetail = async (demandeId: string) => {
    setLoadingDetail(true);
    try {
      const response = await api.get(`/demandes/${demandeId}`);
      setSelectedDemandeDetail(response.data.data.demande);
      
      // Auto-remplir les champs avec les données de la demande
      const demande = response.data.data.demande;
      setFormData(prev => ({
        ...prev,
        intitule: prev.intitule || demande.intitulePoste,
        typeContrat: prev.typeContrat || demande.typeContrat,
        description: prev.description || `Poste: ${demande.intitulePoste}\n\n${demande.description || ''}`,
      }));
    } catch (err) {
      console.error('Erreur chargement détail demande:', err);
    } finally {
      setLoadingDetail(false);
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

  const getNiveauLabel = (niveau: string) => {
    const labels: Record<string, string> = {
      TECHNICIEN: 'Technicien',
      EMPLOYE: 'Employé',
      CADRE_DEBUTANT: 'Cadre débutant',
      CADRE_CONFIRME: 'Cadre confirmé',
      CADRE_SUPERIEUR: 'Cadre supérieur',
      STRATEGIQUE: 'Stratégique'
    };
    return labels[niveau] || niveau;
  };

  const getPrioriteLabel = (priorite: string) => {
    const labels: Record<string, string> = {
      HAUTE: 'Haute',
      MOYENNE: 'Moyenne',
      BASSE: 'Basse'
    };
    return labels[priorite] || priorite;
  };

  const getMotifLabel = (motif: string) => {
    const labels: Record<string, string> = {
      CREATION: 'Création de poste',
      REMPLACEMENT: 'Remplacement',
      RENFORCEMENT: "Renforcement d'équipe",
      NOUVEAU_POSTE: 'Nouveau poste',
      EXPANSION: 'Expansion'
    };
    return labels[motif] || motif;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
          maxWidth: 1000, width: '90%', maxHeight: '90vh', overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 24 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {isEditing ? "Modifier l'offre" : "Créer une offre d'emploi"}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Sélection de la demande avec aperçu */}
          {!isEditing && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Demande de recrutement validée *
              </label>

              {loadingDemandes ? (
                <div style={{ padding: 10, color: 'var(--text-muted)', fontSize: 13 }}>
                  <Loader2 size={14} style={{ display: 'inline', marginRight: 6, animation: 'spin 1s linear infinite' }} />
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
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}
                  >
                    <option value="">Sélectionner une demande ({demandes.length} disponible{demandes.length > 1 ? 's' : ''})...</option>
                    {demandes.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.reference} — {d.intitulePoste}
                        {d.direction?.nom ? ` · ${d.direction.nom}` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Aperçu de la demande sélectionnée */}
                  {selectedDemandeId && (
                    <div style={{
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      marginTop: 8
                    }}>
                      {loadingDetail ? (
                        <div style={{ padding: 40, textAlign: 'center' }}>
                          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                            Chargement des détails de la demande...
                          </div>
                        </div>
                      ) : selectedDemandeDetail ? (
                        <>
                          {/* En-tête de l'aperçu */}
                          <div style={{
                            padding: 16,
                            background: 'var(--surface)',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 16 }}>
                                {selectedDemandeDetail.intitulePoste}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                {selectedDemandeDetail.reference} · {getNiveauLabel(selectedDemandeDetail.niveau)} · {selectedDemandeDetail.direction?.nom}
                              </div>
                            </div>
                            <Badge variant="green">VALIDÉE</Badge>
                          </div>

                          {/* Grille d'informations */}
                          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Motif</div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{getMotifLabel(selectedDemandeDetail.motif)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Priorité</div>
                              <Badge variant={selectedDemandeDetail.priorite === 'HAUTE' ? 'red' : selectedDemandeDetail.priorite === 'MOYENNE' ? 'amber' : 'green'}>
                                {getPrioriteLabel(selectedDemandeDetail.priorite)}
                              </Badge>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Budget</div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>
                                {selectedDemandeDetail.budgetMin} - {selectedDemandeDetail.budgetMax} DT
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Date souhaitée</div>
                              <div style={{ fontSize: 13 }}>{formatDate(selectedDemandeDetail.dateSouhaitee)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Créateur</div>
                              <div style={{ fontSize: 13 }}>
                                {selectedDemandeDetail.createur?.prenom} {selectedDemandeDetail.createur?.nom}
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                                  ({selectedDemandeDetail.createur?.role})
                                </span>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Manager</div>
                              <div style={{ fontSize: 13 }}>
                                {selectedDemandeDetail.manager?.prenom} {selectedDemandeDetail.manager?.nom}
                              </div>
                            </div>
                          </div>

                          {/* Justification */}
                          {selectedDemandeDetail.justification && (
                            <div style={{ padding: '0 16px 12px 16px' }}>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FileText size={12} /> Justification
                              </div>
                              <div style={{
                                fontSize: 12,
                                background: 'var(--surface)',
                                padding: 10,
                                borderRadius: 8,
                                color: 'var(--text-secondary)'
                              }}>
                                {selectedDemandeDetail.justification}
                              </div>
                            </div>
                          )}

                          {/* Commentaires des validateurs */}
                          {selectedDemandeDetail.validations && selectedDemandeDetail.validations.length > 0 && (
                            <div style={{ padding: '0 16px 16px 16px' }}>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertCircle size={12} /> Commentaires des validateurs
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {selectedDemandeDetail.validations
                                  .filter(v => v.commentaire)
                                  .map((v, idx) => (
                                    <div key={idx} style={{
                                      fontSize: 12,
                                      background: '#f0fdf4',
                                      padding: 8,
                                      borderRadius: 6,
                                      borderLeft: '3px solid var(--green)'
                                    }}>
                                      <strong>{v.acteur.role}</strong>: {v.commentaire}
                                    </div>
                                  ))}
                                {selectedDemandeDetail.validations.filter(v => v.commentaire).length === 0 && (
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    Aucun commentaire des validateurs
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Disponibilités des interviewers */}
                          {selectedDemandeDetail.disponibilitesInterviewers && selectedDemandeDetail.disponibilitesInterviewers.length > 0 && (
                            <div style={{ padding: '0 16px 16px 16px' }}>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={12} /> Disponibilités pour entretiens
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {selectedDemandeDetail.disponibilitesInterviewers.map((dispo, idx) => (
                                  <span key={idx} style={{
                                    fontSize: 11,
                                    background: 'var(--gold-pale)',
                                    padding: '4px 10px',
                                    borderRadius: 16,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}>
                                    <User size={10} />
                                    {dispo.user.prenom} {dispo.user.nom} ({dispo.user.role === 'MANAGER' ? 'Manager' : 'Directeur'})
                                    : {formatDate(dispo.date)} {dispo.heureDebut}-{dispo.heureFin}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bouton pour utiliser les données */}
                          <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                              💡 Les champs ci-dessous ont été pré-remplis à partir de cette demande.
                              Vous pouvez les modifier avant de créer l'offre.
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Formulaire de l'offre */}
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
                  border: '1px solid var(--border)', fontSize: 13
                }}
                placeholder="Décrivez les missions, responsabilités, etc."
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
                placeholder="Formation, expérience, compétences, qualités personnelles..."
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
                  placeholder="Ajouter une compétence"
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
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold-deep)' }}
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
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={submitting || (demandes.length === 0 && !isEditing) || !selectedDemandeId}>
              {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
              {isEditing ? "Mettre à jour" : "Créer l'offre"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}