// frontend/src/components/pages/contrats/ContratsPage.tsx

import { useState, useEffect } from 'react';
import { Plus, Eye, Send, CheckCircle, FileText } from 'lucide-react';
import { Card, CardBody } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Avatar } from '../../ui/Avatar';
import { Alert } from '../../ui/Alert';
import { Modal } from '../../ui/Modal';
import { FormGroup, FormLabel, Input, Select, Textarea } from '../../ui/FormField';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { normalizeRole } from '../../../types';
import { AvenantModal } from './AvenantModal';

interface Avenant {
  id: string;
  typeAvenant: string;
  date: string;
  description: string;
}

interface Contrat {
  id: string;
  reference: string;
  typeContrat: string;
  salaire: string;
  dateDebut: string;
  dateFin?: string;
  statut: string;
  avenants?: Avenant[];
  candidature: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    offre: {
      intitule: string;
      reference: string;
      demande?: {
        budgetMin?: number;
        budgetMax?: number;
        direction?: {
          nom: string;
        };
      };
    };
  } | null;
}

interface CandidatureAcceptee {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  offre?: {
    intitule: string;
    reference: string;
    typeContrat: string;
    demande?: {
      budgetMin?: number;
      budgetMax?: number;
      direction?: {
        nom: string;
      };
    };
  };
  ficheRenseignementData?: any;
}

type BadgeVariant = 'amber' | 'gold' | 'green' | 'red';

export function ContratsPage() {
  const { user } = useAuth();
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCandidatureId, setSelectedCandidatureId] = useState<string>('');
  const [candidaturesAcceptees, setCandidaturesAcceptees] = useState<CandidatureAcceptee[]>([]);
  const [preloading, setPreloading] = useState(false);
  const [donneesPrecontrat, setDonneesPrecontrat] = useState<any>(null);

  // ── Avenant ──
  const [showAvenantModal, setShowAvenantModal] = useState(false);
  const [contratPourAvenant, setContratPourAvenant] = useState<Contrat | null>(null);
  const [expandedAvenants, setExpandedAvenants] = useState<string | null>(null);

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
    fetchContrats();
    fetchCandidaturesAcceptees();
  }, []);

  const fetchContrats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contrats');
      setContrats(response.data.data.contrats || []);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidaturesAcceptees = async () => {
    try {
      const response = await api.get('/candidatures/acceptees/sans-contrat');
      let candidats: CandidatureAcceptee[] = [];
      if (response.data.data?.candidatures) {
        candidats = response.data.data.candidatures;
      } else if (response.data.candidatures) {
        candidats = response.data.candidatures;
      }
      setCandidaturesAcceptees(candidats);
    } catch (err) {
      console.error('Erreur:', err);
      setCandidaturesAcceptees([]);
    }
  };

  const chargerDonneesPrecontrat = async (candidatureId: string) => {
    setPreloading(true);
    try {
      const response = await api.get(`/contrats/precontrat/${candidatureId}`);
      const data = response.data.data.donnees;
      setDonneesPrecontrat(data);

      setFormData(prev => ({
        ...prev,
        salaire: data.demande?.budgetMax ? `${data.demande.budgetMax} DT` : '3000 DT',
        typeContrat: data.offre?.typeContrat || 'CDI',
        employePoste: data.offre?.intitule || '',
        employeDirection: data.demande?.direction || '',
        dateDebut: new Date().toISOString().split('T')[0]
      }));
      setError('');
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des données');
    } finally {
      setPreloading(false);
    }
  };

  const handleCandidatChange = (candidatureId: string) => {
    setSelectedCandidatureId(candidatureId);
    if (candidatureId) {
      chargerDonneesPrecontrat(candidatureId);
    } else {
      setDonneesPrecontrat(null);
    }
  };

  const genererContrat = async () => {
    if (!selectedCandidatureId) return;
    try {
      await api.post('/contrats', {
        candidatureId: selectedCandidatureId,
        typeContrat: formData.typeContrat,
        dateDebut: formData.dateDebut,
        dateFin: formData.dateFin,
        salaire: formData.salaire,
        prime: formData.prime,
        avantages: formData.avantages,
        clauseParticuliere: formData.clauseParticuliere,
        employeurNom: formData.employeurNom,
        employeurRepresentant: formData.employeurRepresentant,
        employeurAdresse: formData.employeurAdresse,
        employePoste: formData.employePoste,
        employeDirection: formData.employeDirection,
        employeSuperieur: formData.employeSuperieur,
        employeLieuTravail: formData.employeLieuTravail,
        periodeEssaiDuree: formData.periodeEssaiDuree,
        periodeEssaiRenouvelable: formData.periodeEssaiRenouvelable,
        horairesHebdo: formData.horairesHebdo,
        horairesPrecision: formData.horairesPrecision,
        congesPayes: formData.congesPayes,
        preavis: formData.preavis,
        observations: formData.observations,
        documentsFournis: formData.documentsFournis
      });
      setSuccess('Contrat généré avec succès');
      fetchContrats();
      fetchCandidaturesAcceptees();
      setShowCreateModal(false);
      setSelectedCandidatureId('');
      setDonneesPrecontrat(null);
      setFormData({
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
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la génération');
      setTimeout(() => setError(''), 3000);
    }
  };

  const envoyerContrat = async (contratId: string) => {
    try {
      await api.post(`/contrats/${contratId}/envoyer`);
      setSuccess('Contrat envoyé à l\'employé');
      fetchContrats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi');
      setTimeout(() => setError(''), 3000);
    }
  };

  const marquerSigne = async (contratId: string) => {
    if (confirm('Confirmez-vous que l\'employé a signé physiquement le contrat ?')) {
      try {
        await api.post(`/contrats/${contratId}/signer`);
        setSuccess('Contrat marqué comme signé');
        fetchContrats();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erreur lors de la signature');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const telechargerContrat = (contratId: string) => {
    const baseURL = api.defaults.baseURL || '';
    window.open(`${baseURL}/contrats/${contratId}/pdf`, '_blank');
  };

  const getStatutVariant = (statut: string): BadgeVariant => {
    const variants: Record<string, BadgeVariant> = {
      'BROUILLON': 'amber',
      'ENVOYE': 'gold',
      'ACTIF': 'green',
      'RESILIE': 'amber',
      'TERMINE': 'red'
    };
    return variants[statut] || 'amber';
  };

  const getStatutLabel = (statut: string): string => {
    const labels: Record<string, string> = {
      'BROUILLON': 'Brouillon',
      'ENVOYE': 'Envoyé',
      'ACTIF': 'Actif (signé)',
      'RESILIE': 'Résilié',
      'TERMINE': 'Terminé'
    };
    return labels[statut] || statut;
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement des contrats...</div>;
  }

  if (normalizeRole(user?.role) !== 'RESP_PAIE' && normalizeRole(user?.role) !== 'SUPER_ADMIN') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert variant="red">Accès non autorisé</Alert>
      </div>
    );
  }

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Contractualisation</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {contrats.length} contrat(s) - Génération → Envoi → Signature physique
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus size={13} /> Générer contrat
        </Button>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="red">{error}</Alert>
        </div>
      )}
      {success && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="green">{success}</Alert>
        </div>
      )}

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Candidat</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Poste</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Type</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Salaire</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Statut</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contrats.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Aucun contrat
                    </td>
                  </tr>
                ) : (
                  contrats.map((c) => (
                    <>
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={`${c.candidature?.prenom} ${c.candidature?.nom}`} size="sm" />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.candidature?.prenom} {c.candidature?.nom}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.candidature?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{c.candidature?.offre?.intitule || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant="gold">{c.typeContrat}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{c.salaire}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={getStatutVariant(c.statut)}>
                            {getStatutLabel(c.statut)}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Button variant="ghost" size="xs" onClick={() => telechargerContrat(c.id)} title="Voir le contrat">
                              <Eye size={12} />
                            </Button>
                            {c.statut === 'BROUILLON' && (
                              <Button variant="primary" size="xs" onClick={() => envoyerContrat(c.id)}>
                                <Send size={11} /> Envoyer
                              </Button>
                            )}
                            {c.statut === 'ENVOYE' && (
                              <Button variant="success" size="xs" onClick={() => marquerSigne(c.id)}>
                                <CheckCircle size={11} /> Signer (physique)
                              </Button>
                            )}
                            {c.statut === 'ACTIF' && (
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => { setContratPourAvenant(c); setShowAvenantModal(true); }}
                              >
                                <FileText size={11} /> Avenant
                              </Button>
                            )}
                            {c.avenants && c.avenants.length > 0 && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setExpandedAvenants(expandedAvenants === c.id ? null : c.id)}
                              >
                                {c.avenants.length} avenant{c.avenants.length > 1 ? 's' : ''}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedAvenants === c.id && c.avenants && c.avenants.length > 0 && (
                        <tr key={`${c.id}-avenants`}>
                          <td colSpan={6} style={{ padding: '8px 16px', background: '#fafafa' }}>
                            {c.avenants.map(a => (
                              <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 12 }}>
                                <strong>{a.typeAvenant}</strong> — {new Date(a.date).toLocaleDateString('fr-FR')}
                                <div style={{ color: '#666', marginTop: 2 }}>{a.description}</div>
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Modal de création de contrat */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedCandidatureId('');
          setDonneesPrecontrat(null);
        }}
        title="Générer un contrat - Formulaire complet"
        maxWidth={900}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Annuler</Button>
            <Button variant="primary" onClick={genererContrat} disabled={!selectedCandidatureId || preloading}>
              {preloading ? 'Chargement...' : 'Générer le contrat'}
            </Button>
          </div>
        }
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '16px' }}>
          {/* Étape 1: Sélection du candidat */}
          <div style={{ marginBottom: 24 }}>
            <FormGroup>
              <FormLabel>Candidat accepté *</FormLabel>
              <select
                value={selectedCandidatureId}
                onChange={(e) => handleCandidatChange(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
              >
                <option value="">-- Choisir un candidat --</option>
                {candidaturesAcceptees.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom} - {c.offre?.intitule || 'Poste non spécifié'}
                  </option>
                ))}
              </select>
            </FormGroup>
          </div>

          {preloading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              Chargement des données du candidat...
            </div>
          )}

          {donneesPrecontrat && !preloading && (
            <>
              {/* Informations candidat */}
              <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                <h3 style={{ marginBottom: 12 }}>Informations candidat</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><strong>Nom:</strong> {donneesPrecontrat.candidat?.prenom} {donneesPrecontrat.candidat?.nom}</div>
                  <div><strong>Email:</strong> {donneesPrecontrat.candidat?.email}</div>
                  <div><strong>Téléphone:</strong> {donneesPrecontrat.candidat?.telephone || '-'}</div>
                  <div><strong>Adresse:</strong> {donneesPrecontrat.candidat?.adresse || '-'}</div>
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
                <div style={{ gridColumn: 'span 2' }}>
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
            </>
          )}

          {candidaturesAcceptees.length === 0 && (
            <Alert variant="gold">Aucun candidat accepté sans contrat pour le moment</Alert>
          )}
        </div>
      </Modal>

      {/* Modal de création d'avenant */}
      {contratPourAvenant && (
        <AvenantModal
          open={showAvenantModal}
          onClose={() => { setShowAvenantModal(false); setContratPourAvenant(null); }}
          contratId={contratPourAvenant.id}
          contratRef={contratPourAvenant.reference}
          salaireActuel={contratPourAvenant.salaire}
          onSuccess={() => {
            fetchContrats();
            setSuccess('Avenant créé, employé notifié par email');
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}
    </div>
  );
}