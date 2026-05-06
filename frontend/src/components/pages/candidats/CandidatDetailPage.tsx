// frontend/src/components/pages/candidats/CandidatDetailPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Mail, Phone, Calendar, Briefcase, Check, X, FileText, Send, Eye } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import { ScoreBar } from '../../ui/ScoreBar';
import { Modal } from '../../ui/Modal';
import api from '../../../services/api';
import { PlanifierEntretienModal } from '../entretiens/PlanifierEntretienModal';

type TypeEntretien = 'RH' | 'TECHNIQUE' | 'DIRECTION';

const NIVEAUX_AVEC_DIRECTION = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];

interface Props {
  id: string;
}

interface CandidatureDetail {
  id: string;
  reference: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  cvUrl: string;
  cvTexte?: string;
  scoreGlobal: number;
  scoreExp: number;
  competencesDetectees: string[];
  competencesManquantes: string[];
  statut: string;
  dateSoumission: string;
  offre: {
    id: string;
    reference: string;
    intitule: string;
    description: string;
    profilRecherche: string;
    competences: string[];
    typeContrat: string;
    demande?: {
      id: string;
      niveau: string;
    };
  };
  entretiens?: {
    id: string;
    type: string;
    date: string;
    heure: string;
    lieu: string;
    statut: string;
    feedback?: string;
    evaluation?: number;
  }[];
  contrat?: {
    id: string;
    reference: string;
    statut: string;
  };
  ficheRenseignementEnvoyee?: boolean;
  ficheRenseignementRecue?: boolean;
  ficheRenseignementRecueAt?: string;
  ficheRenseignementData?: any;
}

export function CandidatDetailPage({ id }: Props) {
  const navigate = useNavigate();
  const [candidature, setCandidature] = useState<CandidatureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showPlanifierModal, setShowPlanifierModal] = useState(false);
  const [planifierType, setPlanifierType] = useState<TypeEntretien>('RH');
  const [showFicheModal, setShowFicheModal] = useState(false);
  const [ficheData, setFicheData] = useState<any>(null);

  useEffect(() => {
    if (id) fetchCandidature();
  }, [id]);

  const fetchCandidature = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/candidatures/${id}`);
      const data = response.data.data.candidature;
      setCandidature(data);
      if (data.ficheRenseignementData) {
        setFicheData(data.ficheRenseignementData);
      }
    } catch (err: any) {
      console.error('Erreur:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Candidature non trouvee');
    } finally {
      setLoading(false);
    }
  };

  const updateStatut = async (newStatut: string) => {
    if (!candidature) return;
    setUpdating(true);
    try {
      await api.patch(`/candidatures/${candidature.id}/statut`, { statut: newStatut });
      await fetchCandidature();
    } catch (err) {
      console.error('Erreur mise a jour statut:', err);
    } finally {
      setUpdating(false);
    }
  };

  const envoyerFicheRenseignement = async () => {
    if (!candidature) return;
    setUpdating(true);
    try {
      await api.post(`/candidatures/${candidature.id}/envoyer-fiche`);
      alert('Fiche de renseignement envoyee avec succes au candidat');
      await fetchCandidature();
    } catch (err: any) {
      console.error('Erreur envoi fiche:', err);
      alert(err.response?.data?.message || 'Erreur lors de l\'envoi de la fiche');
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadCV = () => {
    if (!candidature?.cvUrl) {
      alert('Aucun CV disponible');
      return;
    }
    
    // Construire l'URL complète si elle est relative
    let cvUrl = candidature.cvUrl;
    if (cvUrl.startsWith('/uploads/')) {
      cvUrl = `http://localhost:5000${cvUrl}`;
    }
    
    window.open(cvUrl, '_blank');
  };

  const openPlanifierModal = (type: TypeEntretien) => {
    if (candidature?.statut !== 'FICHE_RECUE' && candidature?.statut !== 'PRESELECTIONNEE') {
      alert('Veuillez attendre la reception de la fiche de renseignement avant de planifier l\'entretien');
      return;
    }
    setPlanifierType(type);
    setShowPlanifierModal(true);
  };

  const openFicheModal = () => {
    setShowFicheModal(true);
  };

  const getStatutVariant = (statut: string): 'gold' | 'green' | 'red' | 'amber' | 'olive' => {
    const variants: Record<string, any> = {
      NOUVELLE: 'amber',
      PRESELECTIONNEE: 'olive',
      FICHE_ENVOYEE: 'amber',
      FICHE_RECUE: 'green',
      ENTRETIEN: 'gold',
      ACCEPTEE: 'green',
      REFUSEE: 'red',
    };
    return variants[statut] || 'amber';
  };

  const getStatutLabel = (statut: string): string => {
    const labels: Record<string, string> = {
      NOUVELLE: 'Nouvelle',
      PRESELECTIONNEE: 'Pre-selectionnee',
      FICHE_ENVOYEE: 'Fiche envoyee',
      FICHE_RECUE: 'Fiche recue',
      ENTRETIEN: 'Entretien',
      ACCEPTEE: 'Acceptee',
      REFUSEE: 'Refusee',
    };
    return labels[statut] || statut;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const hasEntretien = (type: string): boolean => {
    return candidature?.entretiens?.some(e => e.type === type) || false;
  };

  const niveauPoste = candidature?.offre?.demande?.niveau || '';

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement de la candidature...</div>;
  }

  if (error || !candidature) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert variant="red">{error || 'Candidature non trouvee'}</Alert>
        <Button onClick={() => navigate('/candidats')} style={{ marginTop: 16 }}>
          Retour aux candidatures
        </Button>
      </div>
    );
  }

  const isFicheRecue = candidature.statut === 'FICHE_RECUE';
  const isFicheEnvoyee = candidature.statut === 'FICHE_ENVOYEE';
  const isPreselectionnee = candidature.statut === 'PRESELECTIONNEE';

  return (
    <div className="page-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button variant="ghost" size="xs" onClick={() => navigate('/candidats')} style={{ padding: '8px' }}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
              Candidature {candidature.reference}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Badge variant={getStatutVariant(candidature.statut)}>
                {getStatutLabel(candidature.statut)}
              </Badge>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Soumise le {formatDate(candidature.dateSoumission)}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={handleDownloadCV}>
            <Download size={14} /> Telecharger CV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => (window.location.href = `mailto:${candidature.email}`)}
          >
            <Mail size={14} /> Contacter
          </Button>
        </div>
      </div>

      {/* Actions rapides */}
      {candidature.statut === 'NOUVELLE' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <Button variant="success" onClick={() => updateStatut('PRESELECTIONNEE')} disabled={updating}>
            <Check size={14} /> Pre-selectionner
          </Button>
          <Button variant="danger" onClick={() => updateStatut('REFUSEE')} disabled={updating}>
            <X size={14} /> Refuser
          </Button>
        </div>
      )}

      {isPreselectionnee && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <Button variant="primary" onClick={() => envoyerFicheRenseignement()} disabled={updating}>
            <Send size={14} /> Envoyer fiche de renseignement
          </Button>
          <Button variant="danger" onClick={() => updateStatut('REFUSEE')} disabled={updating}>
            <X size={14} /> Refuser
          </Button>
        </div>
      )}

      {isFicheEnvoyee && !candidature.ficheRenseignementRecue && (
        <div style={{ marginBottom: 24 }}>
          <Alert variant="gold">
            Fiche de renseignement envoyee. En attente de reponse du candidat.
          </Alert>
        </div>
      )}

      {isFicheRecue && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <Alert variant="green">
                Fiche de renseignement recue le {candidature.ficheRenseignementRecueAt 
                  ? new Date(candidature.ficheRenseignementRecueAt).toLocaleDateString('fr-FR') 
                  : '-'}
              </Alert>
            </div>
            <Button variant="secondary" size="sm" onClick={openFicheModal}>
              <Eye size={14} /> Voir la fiche
            </Button>
          </div>
        </div>
      )}

      {(isFicheRecue || isPreselectionnee) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {!hasEntretien('RH') && (
            <Button variant="primary" onClick={() => openPlanifierModal('RH')}>
              <Calendar size={14} /> Planifier entretien RH
            </Button>
          )}
          {hasEntretien('RH') && !hasEntretien('TECHNIQUE') && (
            <Button variant="primary" onClick={() => openPlanifierModal('TECHNIQUE')}>
              <Calendar size={14} /> Planifier entretien technique
            </Button>
          )}
          {NIVEAUX_AVEC_DIRECTION.includes(niveauPoste) &&
            hasEntretien('TECHNIQUE') && !hasEntretien('DIRECTION') && (
              <Button variant="primary" onClick={() => openPlanifierModal('DIRECTION')}>
                <Calendar size={14} /> Planifier entretien direction
              </Button>
            )}
          {hasEntretien('RH') && hasEntretien('TECHNIQUE') &&
            (!NIVEAUX_AVEC_DIRECTION.includes(niveauPoste) || hasEntretien('DIRECTION')) && (
              <Button variant="success" onClick={() => updateStatut('ACCEPTEE')}>
                <Check size={14} /> Accepter la candidature
              </Button>
            )}
          <Button variant="danger" onClick={() => updateStatut('REFUSEE')}>
            <X size={14} /> Refuser
          </Button>
        </div>
      )}

      {/* Grille infos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Avatar name={`${candidature.prenom} ${candidature.nom}`} size="md" />
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{candidature.prenom} {candidature.nom}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Candidat</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13 }}>{candidature.email}</span>
              </div>
              {candidature.telephone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 13 }}>{candidature.telephone}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13 }}>CV: {candidature.cvUrl?.split('/').pop()}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Briefcase size={18} style={{ color: 'var(--gold)' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Offre postulee</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Intitule</div>
                <div style={{ fontWeight: 500 }}>{candidature.offre.intitule}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reference</div>
                <div>{candidature.offre.reference}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Type de contrat</div>
                <Badge variant="gold">{candidature.offre.typeContrat}</Badge>
              </div>
              {niveauPoste && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Niveau du poste</div>
                  <Badge variant="olive">{niveauPoste.replace('_', ' ')}</Badge>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Scores IA */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <CardTitle>Analyse IA - Matching candidature</CardTitle>
          <CardSubtitle>Score calcule automatiquement a partir du CV</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Score global</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--gold)' }}>{candidature.scoreGlobal}%</div>
              <ScoreBar label="" value={candidature.scoreGlobal} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Score experience</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--olive)' }}>{candidature.scoreExp}%</div>
              <ScoreBar label="" value={candidature.scoreExp} />
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Competences detectees</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {candidature.competencesDetectees.map((c) => (
                <span key={c} style={{ background: 'var(--olive-bg)', color: 'var(--olive)', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Competences manquantes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {candidature.competencesManquantes.map((c) => (
                <span key={c} style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Description offre */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <CardTitle>Description de l'offre</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5 }}>
            {candidature.offre.description || 'Aucune description disponible'}
          </div>
          {candidature.offre.profilRecherche && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Profil recherche</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{candidature.offre.profilRecherche}</div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Entretiens existants */}
      {candidature.entretiens && candidature.entretiens.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>Entretiens planifies</CardTitle>
          </CardHeader>
          <CardBody>
            {candidature.entretiens.map((e) => (
              <div key={e.id} style={{ padding: 12, borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>
                    <div style={{ marginRight: 8, display: 'inline-block' }}>
                      <Badge variant="gold">{e.type}</Badge>
                    </div>
                    {new Date(e.date).toLocaleDateString('fr-FR')} a {e.heure}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Lieu: {e.lieu}
                  </div>
                  {e.feedback && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Feedback: {e.feedback}
                    </div>
                  )}
                </div>
                <Badge variant={e.statut === 'REALISE' ? 'green' : 'amber'}>{e.statut}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Contrat */}
      {candidature.contrat && (
        <Card>
          <CardHeader>
            <CardTitle>Contrat</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{candidature.contrat.reference}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Statut: {candidature.contrat.statut}</div>
              </div>
              <Button variant="secondary" size="sm">Voir le contrat</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal de planification */}
      {showPlanifierModal && (
        <PlanifierEntretienModal
          open={showPlanifierModal}
          onClose={() => setShowPlanifierModal(false)}
          onSuccess={() => {
            setShowPlanifierModal(false);
            fetchCandidature();
          }}
          defaultType={planifierType}
          candidature={{
            id: candidature.id,
            nom: candidature.nom,
            prenom: candidature.prenom,
            email: candidature.email,
            telephone: candidature.telephone,
            offre: {
              id: candidature.offre.id,
              intitule: candidature.offre.intitule,
              demande: candidature.offre.demande || { id: '', niveau: '' }
            }
          }}
        />
      )}

      {/* Modal pour afficher la fiche de renseignement */}
      <Modal
        open={showFicheModal}
        onClose={() => {
          setShowFicheModal(false);
          setFicheData(null);
        }}
        title={`Fiche de renseignement - ${candidature.prenom} ${candidature.nom}`}
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
                <div><strong>Nom conjoint:</strong> {ficheData.nomConjoint || '-'}</div>
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
                <div><strong>Preavis:</strong> {ficheData.preavis || '-'}</div>
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
                <div><strong>Informatique:</strong> {ficheData.informatique || '-'}</div>
                <div><strong>Permis:</strong> {ficheData.permis || '-'}</div>
                <div><strong>Vehicule:</strong> {ficheData.vehicule || '-'}</div>
              </div>
            </div>

            {/* Experiences professionnelles */}
            {ficheData.experiences && ficheData.experiences.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  Experiences professionnelles
                </h3>
                {ficheData.experiences.map((exp: any, idx: number) => (
                  exp.fonction && (
                    <div key={idx} style={{ marginBottom: 12, padding: 8, background: 'var(--surface)', borderRadius: 6 }}>
                      <div><strong>Fonction:</strong> {exp.fonction}</div>
                      <div><strong>Etablissement:</strong> {exp.etablissement}</div>
                      <div><strong>Duree:</strong> {exp.duree}</div>
                      <div><strong>Salaire:</strong> {exp.salaire}</div>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Fonction souhaitee */}
            {ficheData.fonctionSouhaitee && (
              <div style={{ marginBottom: 16 }}>
                <strong>Fonction souhaitee:</strong> {ficheData.fonctionSouhaitee}
              </div>
            )}

            {/* Meilleure fonction/projet */}
            {ficheData.meilleureFonctionProjet && (
              <div style={{ marginBottom: 16 }}>
                <strong>Meilleure realisation:</strong> {ficheData.meilleureFonctionProjet}
              </div>
            )}

            {/* Pieces fournies */}
            {ficheData.piecesFournies && (
              <div style={{ marginBottom: 16 }}>
                <strong>Pieces fournies:</strong> {ficheData.piecesFournies}
              </div>
            )}

            {/* Declaration */}
            <div style={{ marginTop: 16, padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
              <p style={{ fontSize: 12, fontStyle: 'italic', margin: 0 }}>
                Le candidat certifie la sincerite des renseignements fournis.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p>Aucune donnee de fiche disponible</p>
          </div>
        )}
      </Modal>
    </div>
  );
}