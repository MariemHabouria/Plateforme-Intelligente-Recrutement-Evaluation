// frontend/src/components/pages/entretiens/EntretienDetailPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, User, Briefcase, Mail, Phone, FileText, Edit, Save, MessageSquare, Eye, FileCheck } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { ScoreBar } from '../../ui/ScoreBar';
import { Modal } from '../../ui/Modal';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { CandidatPassifDetailModal } from '../offres/CandidatPassifDetailModal';

interface Props {
  id: string;
}

interface EntretienDetail {
  id: string;
  type: string;
  date: string;
  heure: string;
  lieu: string;
  statut: string;
  feedback?: string;
  evaluation?: number;
  candidature: {
    id: string;
    reference: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    cvUrl: string;
    scoreGlobal?: number;
    scoreExp?: number;
    competencesDetectees: string[];
    statut: string;
    ficheRenseignementRecue?: boolean;
    ficheRenseignementData?: any;
    offre: {
      id: string;
      reference: string;
      intitule: string;
      description?: string;
      profilRecherche?: string;
      competences: string[];
      typeContrat: string;
    };
  };
  interviewer: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: string;
  };
  disponibilite?: {
    id: string;
    date: string;
    heureDebut: string;
    heureFin: string;
    user?: {
      nom: string;
      prenom: string;
      role: string;
    };
  };
}

export function EntretienDetailPage({ id }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entretien, setEntretien] = useState<EntretienDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ feedback: '', evaluation: 0, statut: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showProfilModal, setShowProfilModal] = useState(false);
  const [showFicheModal, setShowFicheModal] = useState(false);
  const [ficheData, setFicheData] = useState<any>(null);
  
  const [peutDonnerAvis, setPeutDonnerAvis] = useState(false);
  const [dateAvisPossible, setDateAvisPossible] = useState('');

  useEffect(() => {
    if (id) fetchEntretien();
  }, [id]);

  const fetchEntretien = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/entretiens/${id}`);
      const data = response.data.data.entretien;
      setEntretien(data);
      setPeutDonnerAvis(response.data.data.peutDonnerAvis);
      setDateAvisPossible(response.data.data.dateAvisPossible);
      
      // Charger la fiche de renseignement si disponible
      if (data.candidature.ficheRenseignementData) {
        setFicheData(data.candidature.ficheRenseignementData);
      }
      
      setEditForm({
        feedback: data.feedback || '',
        evaluation: data.evaluation || 0,
        statut: data.statut || 'PLANIFIE'
      });
    } catch (err: any) {
      console.error('Erreur chargement entretien:', err);
      setError(err.response?.data?.message || 'Entretien non trouve');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/entretiens/${id}/feedback`, {
        feedback: editForm.feedback,
        evaluation: editForm.evaluation,
        statut: editForm.statut
      });
      setSuccess('Entretien mis a jour avec succes');
      setIsEditing(false);
      fetchEntretien();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Erreur mise a jour:', err);
      setError(err.response?.data?.message || 'Erreur lors de la mise a jour');
    } finally {
      setSubmitting(false);
    }
  };

  const openFicheModal = () => {
    setShowFicheModal(true);
  };

  const getStatutVariant = (statut: string): 'gold' | 'green' | 'red' | 'amber' | 'olive' => {
    const variants: Record<string, any> = {
      'PLANIFIE': 'amber', 'REALISE': 'green', 'ANNULE': 'red', 'REPORTE': 'gold'
    };
    return variants[statut] || 'amber';
  };

  const getStatutLabel = (statut: string): string => {
    const labels: Record<string, string> = {
      'PLANIFIE': 'Planifie', 'REALISE': 'Realise', 'ANNULE': 'Annule', 'REPORTE': 'Reporte'
    };
    return labels[statut] || statut;
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'RH': 'Entretien RH', 'TECHNIQUE': 'Entretien technique', 'DIRECTION': 'Entretien direction'
    };
    return labels[type] || type;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const canEdit = () => {
    if (!user || !entretien) return false;
    if (user.id !== entretien.interviewer.id) return false;
    if (entretien.feedback) return false;
    return peutDonnerAvis;
  };

  const getAvisMessage = () => {
    if (entretien?.feedback) return null;
    if (!peutDonnerAvis) {
      return (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="gold">
            <Calendar size={14} style={{ marginRight: 8, display: 'inline', verticalAlign: 'middle' }} />
            Vous pourrez donner votre avis a partir du {dateAvisPossible} (date de l'entretien)
          </Alert>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement de l'entretien...</div>;
  }

  if (error || !entretien) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert variant="red">{error || 'Entretien non trouve'}</Alert>
        <Button onClick={() => navigate('/entretiens')} style={{ marginTop: 16 }}>
          Retour aux entretiens
        </Button>
      </div>
    );
  }

  const hasFicheRenseignement = entretien.candidature.ficheRenseignementRecue && ficheData;

  return (
    <div className="page-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button variant="ghost" size="xs" onClick={() => navigate('/entretiens')} style={{ padding: '8px' }}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
              {getTypeLabel(entretien.type)}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Badge variant={getStatutVariant(entretien.statut)}>
                {getStatutLabel(entretien.statut)}
              </Badge>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {formatDate(entretien.date)} a {entretien.heure}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {hasFicheRenseignement && (
            <Button variant="secondary" size="sm" onClick={openFicheModal}>
              <FileCheck size={14} style={{ marginRight: 6 }} />
              Voir fiche candidat
            </Button>
          )}
          {canEdit() && !isEditing && (
            <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
              <MessageSquare size={14} style={{ marginRight: 6 }} />
              Donner mon avis
            </Button>
          )}
        </div>
      </div>

      {success && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="green">{success}</Alert>
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="red">{error}</Alert>
        </div>
      )}
      
      {getAvisMessage()}

      {/* Formulaire d'edition */}
      {isEditing && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>Donner mon avis</CardTitle>
            <CardSubtitle>Votre evaluation et commentaires sur ce candidat</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Evaluation (0-10)</label>
                <select
                  value={editForm.evaluation}
                  onChange={(e) => setEditForm({ ...editForm, evaluation: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  <option value={0}>Non evalue</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(v => (
                    <option key={v} value={v}>{v}/10</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Commentaire <span style={{ color: 'var(--red)' }}>*</span></label>
                <textarea
                  value={editForm.feedback}
                  onChange={(e) => setEditForm({ ...editForm, feedback: e.target.value })}
                  rows={5}
                  placeholder="Votre avis sur le candidat (points forts, points a ameliorer, etc.)"
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Statut</label>
                <select
                  value={editForm.statut}
                  onChange={(e) => setEditForm({ ...editForm, statut: e.target.value })}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  <option value="PLANIFIE">Planifie</option>
                  <option value="REALISE">Realise</option>
                  <option value="ANNULE">Annule</option>
                  <option value="REPORTE">Reporte</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Annuler</Button>
                <Button variant="primary" onClick={handleUpdate} disabled={submitting}>
                  {submitting ? 'Enregistrement...' : <><Save size={14} /> Enregistrer mon avis</>}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Grille informations principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Calendar size={18} style={{ color: 'var(--gold)' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Details de l'entretien</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13 }}>{formatDate(entretien.date)}</span>
                <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>•</span>
                <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13 }}>{entretien.heure}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13 }}>{entretien.lieu}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13 }}>{getTypeLabel(entretien.type)}</span>
              </div>
              {entretien.disponibilite && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, padding: 8, background: 'var(--surface)', borderRadius: 6 }}>
                  <strong>Creneau :</strong> {formatDate(entretien.disponibilite.date)} {entretien.disponibilite.heureDebut}-{entretien.disponibilite.heureFin}
                  {entretien.disponibilite.user && (
                    <span> ({entretien.disponibilite.user.prenom} {entretien.disponibilite.user.nom})</span>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <User size={18} style={{ color: 'var(--gold)' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Interviewer</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Avatar name={`${entretien.interviewer.prenom} ${entretien.interviewer.nom}`} size="md" />
              <div>
                <div style={{ fontWeight: 500 }}>{entretien.interviewer.prenom} {entretien.interviewer.nom}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entretien.interviewer.role}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Mail size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 12 }}>{entretien.interviewer.email}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Feedback et evaluation */}
      {(entretien.feedback || (entretien.evaluation && entretien.evaluation > 0)) && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>Feedback post-entretien</CardTitle>
          </CardHeader>
          <CardBody>
            {entretien.evaluation && entretien.evaluation > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Evaluation</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--gold)' }}>{entretien.evaluation}</div>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ 10</span>
                  <ScoreBar label="" value={entretien.evaluation * 10} style={{ width: 150 }} />
                </div>
              </div>
            )}
            {entretien.feedback && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Commentaire</div>
                <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, fontSize: 13 }}>
                  {entretien.feedback}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Informations candidat */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <CardTitle>Candidat</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Avatar name={`${entretien.candidature.prenom} ${entretien.candidature.nom}`} size="lg" />
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{entretien.candidature.prenom} {entretien.candidature.nom}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Candidature : {entretien.candidature.reference || entretien.candidature.id}
              </div>
              {entretien.candidature.ficheRenseignementRecue && (
                <Badge variant="green" style={{ marginTop: 6 }}>Fiche renseignements remplie</Badge>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 13 }}>{entretien.candidature.email}</span>
            </div>
            {entretien.candidature.telephone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13 }}>{entretien.candidature.telephone}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {entretien.candidature.cvUrl && (
              <Button variant="secondary" size="sm" onClick={() => window.open(entretien.candidature.cvUrl, '_blank')}>
                <FileText size={14} /> Telecharger CV
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => setShowProfilModal(true)}>
              Voir profil complet
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Informations offre */}
      <Card>
        <CardHeader>
          <CardTitle>Offre postulee</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 500, fontSize: 16 }}>{entretien.candidature.offre.intitule}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ref : {entretien.candidature.offre.reference}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Contrat : {entretien.candidature.offre.typeContrat}</div>
          </div>
          {entretien.candidature.offre.competences && entretien.candidature.offre.competences.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Competences requises</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {entretien.candidature.offre.competences.map(c => (
                  <span key={c} style={{ background: 'rgba(172,107,46,0.1)', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal profil candidat */}
      {showProfilModal && (
        <CandidatPassifDetailModal
          open={showProfilModal}
          onClose={() => setShowProfilModal(false)}
          candidatureId={entretien.candidature.id}
          candidatNom={`${entretien.candidature.prenom} ${entretien.candidature.nom}`}
        />
      )}

      {/* Modal fiche de renseignement */}
      <Modal
        open={showFicheModal}
        onClose={() => setShowFicheModal(false)}
        title={`Fiche de renseignement - ${entretien.candidature.prenom} ${entretien.candidature.nom}`}
        maxWidth={800}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowFicheModal(false)}>Fermer</Button>
          </div>
        }
      >
        {ficheData ? (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
            {/* Informations personnelles */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                Informations personnelles
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div><strong>Date naissance:</strong> {ficheData.dateNaissance || '-'}</div>
                <div><strong>Lieu naissance:</strong> {ficheData.lieuNaissance || '-'}</div>
                <div><strong>Nationalite:</strong> {ficheData.nationalite || '-'}</div>
                <div><strong>Situation familiale:</strong> {ficheData.situationFamiliale || '-'}</div>
                <div><strong>Civilite:</strong> {ficheData.civilite || '-'}</div>
                <div><strong>Adresse:</strong> {ficheData.adresse || '-'}</div>
                <div><strong>Ville:</strong> {ficheData.ville || '-'}</div>
                <div><strong>Telephone:</strong> {ficheData.telephone || ficheData.mobile || '-'}</div>
                <div><strong>Email:</strong> {ficheData.email || '-'}</div>
              </div>
            </div>

            {/* Situation professionnelle */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                Situation professionnelle
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div><strong>Situation actuelle:</strong> {ficheData.situationActuelle || '-'}</div>
                <div><strong>Employeur actuel:</strong> {ficheData.employeurActuel || '-'}</div>
                <div><strong>Poste actuel:</strong> {ficheData.posteActuel || '-'}</div>
                <div><strong>Anciennete:</strong> {ficheData.anciennete || '-'}</div>
                <div><strong>Disponibilite:</strong> {ficheData.disponibilite || '-'}</div>
                <div><strong>Salaire souhaite:</strong> {ficheData.salaireSouhaite || '-'}</div>
              </div>
            </div>

            {/* Formation & Competences */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                Formation & Competences
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div><strong>Niveau etudes:</strong> {ficheData.niveauEtudes || '-'}</div>
                <div><strong>Diplomes:</strong> {ficheData.diplomes || '-'}</div>
                <div><strong>Formations complementaires:</strong> {ficheData.formationsComplementaires || '-'}</div>
                <div><strong>Langues:</strong> {
                  ficheData.langues && typeof ficheData.langues === 'object'
                    ? Object.entries(ficheData.langues)
                        .filter(([key, value]) => value && key !== 'autres')
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ')
                    : ficheData.langues || '-'
                }</div>
                <div><strong>Permis:</strong> {ficheData.permis || '-'}</div>
                <div><strong>Vehicule:</strong> {ficheData.vehicule || '-'}</div>
              </div>
            </div>

            {/* Declaration */}
            <div style={{ marginTop: 16, padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
              <p style={{ fontSize: 12, fontStyle: 'italic', margin: 0 }}>
                Le candidat certifie la sincerite des renseignements fournis.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p>Aucune fiche de renseignement disponible pour ce candidat</p>
          </div>
        )}
      </Modal>
    </div>
  );
}