// frontend/src/components/pages/entretiens/PlanifierEntretienModal.tsx

import { useState, useEffect } from 'react';
import { Calendar, Clock, Mail, Phone, Send, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { FormGroup, FormLabel } from '../../ui/FormField';
import { Alert } from '../../ui/Alert';
import api from '../../../services/api';

type TypeEntretien = 'RH' | 'TECHNIQUE' | 'DIRECTION';

interface PlanifierEntretienModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType: TypeEntretien;
  candidature: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    offre: {
      id: string;
      intitule: string;
      demande?: {
        id: string;
        niveau: string;
      };
    };
  };
}

interface MonCreneau {
  id: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  reservee: boolean;
}

const TYPE_CONFIG: Record<TypeEntretien, { label: string; description: string; roleLabel: string; gereParDrh: boolean }> = {
  RH: {
    label: 'Entretien RH',
    description: 'Le candidat choisira lui-meme son creneau parmi vos disponibilites',
    roleLabel: 'RH',
    gereParDrh: true // le DRH peut ajouter ses propres creneaux ici
  },
  TECHNIQUE: {
    label: 'Entretien technique',
    description: 'Le candidat choisira lui-meme son creneau parmi les disponibilites du manager',
    roleLabel: 'Manager',
    gereParDrh: false
  },
  DIRECTION: {
    label: 'Entretien direction',
    description: 'Le candidat choisira lui-meme son creneau parmi les disponibilites du directeur',
    roleLabel: 'Directeur',
    gereParDrh: false
  }
};

export function PlanifierEntretienModal({
  open,
  onClose,
  onSuccess,
  candidature,
  defaultType
}: PlanifierEntretienModalProps) {
  const [loading, setLoading] = useState(false);
  const [checkingCreneaux, setCheckingCreneaux] = useState(false);
  const [nbCreneauxDisponibles, setNbCreneauxDisponibles] = useState<number | null>(null);
  const [mesCreneaux, setMesCreneaux] = useState<MonCreneau[]>([]);
  const [lieu, setLieu] = useState('Siege - Tunis');
  const [error, setError] = useState('');
  const [lienEnvoye, setLienEnvoye] = useState(false);

  // Formulaire d'ajout de creneau (uniquement visible pour RH)
  const [showAjoutCreneau, setShowAjoutCreneau] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newHeureDebut, setNewHeureDebut] = useState('');
  const [newHeureFin, setNewHeureFin] = useState('');
  const [submittingCreneau, setSubmittingCreneau] = useState(false);

  const demandeId = candidature?.offre?.demande?.id || '';
  const config = TYPE_CONFIG[defaultType];

  useEffect(() => {
    if (open) {
      setError('');
      setLienEnvoye(false);
      setNbCreneauxDisponibles(null);
      setMesCreneaux([]);
      setShowAjoutCreneau(false);
      setNewDate(''); setNewHeureDebut(''); setNewHeureFin('');

      if (demandeId) {
        if (config.gereParDrh) {
          fetchMesCreneaux();
        } else {
          checkDisponibilites();
        }
      }
    }
  }, [open, demandeId, defaultType]);

  const checkDisponibilites = async () => {
    if (!demandeId) {
      setError('Impossible de verifier les creneaux : demande introuvable');
      return;
    }
    try {
      setCheckingCreneaux(true);
      setError('');
      const response = await api.get(`/entretiens/disponibilites/${demandeId}`, {
        params: { type: defaultType }
      });
      const dispos = response.data.data.disponibilites || [];
      setNbCreneauxDisponibles(dispos.length);
    } catch (err) {
      console.error('Erreur verification disponibilites:', err);
      setError('Erreur lors de la verification des creneaux');
    } finally {
      setCheckingCreneaux(false);
    }
  };

  const fetchMesCreneaux = async () => {
    try {
      setCheckingCreneaux(true);
      setError('');
      const response = await api.get('/entretiens/mes-disponibilites', {
        params: { demandeId }
      });
      const dispos: MonCreneau[] = response.data.data.disponibilites || [];
      setMesCreneaux(dispos);
      setNbCreneauxDisponibles(dispos.filter(d => !d.reservee).length);
    } catch (err) {
      console.error('Erreur chargement de vos disponibilites:', err);
      setError('Erreur lors du chargement de vos disponibilites');
    } finally {
      setCheckingCreneaux(false);
    }
  };

  const handleAjouterCreneau = async () => {
    setError('');
    if (!newDate || !newHeureDebut || !newHeureFin) {
      setError('Date, heure de debut et heure de fin sont requises');
      return;
    }
    if (newHeureDebut >= newHeureFin) {
      setError("L'heure de debut doit etre avant l'heure de fin");
      return;
    }

    setSubmittingCreneau(true);
    try {
      await api.post('/entretiens/disponibilites', {
        demandeId,
        disponibilites: [{ date: newDate, heureDebut: newHeureDebut, heureFin: newHeureFin }]
      });
      setNewDate(''); setNewHeureDebut(''); setNewHeureFin('');
      setShowAjoutCreneau(false);
      fetchMesCreneaux();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'ajout du creneau");
    } finally {
      setSubmittingCreneau(false);
    }
  };

  const handleSupprimerCreneau = async (id: string) => {
    try {
      await api.delete(`/entretiens/disponibilites/${id}`);
      const nouveaux = mesCreneaux.filter(c => c.id !== id);
      setMesCreneaux(nouveaux);
      setNbCreneauxDisponibles(nouveaux.filter(d => !d.reservee).length);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!lieu.trim()) {
      setError('Veuillez saisir un lieu');
      return;
    }
    if (nbCreneauxDisponibles === 0) {
      setError(
        config.gereParDrh
          ? 'Ajoutez au moins un creneau avant d\'envoyer le lien au candidat'
          : `Aucun creneau disponible chez le ${config.roleLabel.toLowerCase()}. Il doit d'abord saisir ses disponibilites.`
      );
      return;
    }

    setLoading(true);
    try {
      await api.post('/entretiens', {
        candidatureId: candidature.id,
        type: defaultType,
        lieu
      });

      setLienEnvoye(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la planification');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  const creneauxDisponibles = mesCreneaux.filter(c => !c.reservee);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Planifier ${config.label}`}
      maxWidth={600}
      footer={
        lienEnvoye ? null : (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading || checkingCreneaux || nbCreneauxDisponibles === 0}
            >
              {loading ? 'Envoi...' : <><Send size={14} style={{ marginRight: 6 }} /> Envoyer le lien au candidat</>}
            </Button>
          </div>
        )
      }
    >
      <div style={{ padding: '8px 0' }}>

        {/* Informations candidat */}
        <div style={{
          background: 'var(--surface)',
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--gold)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontWeight: 600
            }}>
              {candidature.prenom?.[0]}{candidature.nom?.[0]}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{candidature.prenom} {candidature.nom}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{candidature.offre.intitule}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Mail size={12} /> {candidature.email}
            </div>
            {candidature.telephone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={12} /> {candidature.telephone}
              </div>
            )}
          </div>
        </div>

        {lienEnvoye ? (
          <Alert variant="green">
            Lien de planification envoye a {candidature.prenom} {candidature.nom}. Le candidat va recevoir un email pour choisir son creneau.
          </Alert>
        ) : (
          <>
            {/* Type d'entretien (lecture seule) */}
            <div style={{
              padding: '8px 12px',
              background: 'var(--surface)',
              borderRadius: 6,
              marginBottom: 16,
              border: '1px solid var(--border-light)'
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Type d'entretien</span>
              <div style={{ fontWeight: 500 }}>{config.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{config.description}</div>
            </div>

            {/* Lieu */}
            <FormGroup>
              <FormLabel required>Lieu</FormLabel>
              <input
                value={lieu}
                onChange={e => setLieu(e.target.value)}
                placeholder="ex: Siege - Tunis, Salle de reunion A..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
            </FormGroup>

            {/* ── CAS RH : le DRH gere ses propres creneaux ici ── */}
            {config.gereParDrh ? (
              <FormGroup>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <FormLabel>Vos creneaux pour cette offre</FormLabel>
                  {!showAjoutCreneau && (
                    <Button variant="ghost" size="xs" onClick={() => setShowAjoutCreneau(true)}>
                      <Plus size={12} style={{ marginRight: 4 }} /> Ajouter un creneau
                    </Button>
                  )}
                </div>

                {checkingCreneaux ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                    Chargement de vos disponibilites...
                  </div>
                ) : (
                  <>
                    {creneauxDisponibles.length === 0 && !showAjoutCreneau && (
                      <Alert variant="gold">
                        <AlertCircle size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
                        Vous n'avez aucun creneau disponible pour cette offre. Ajoutez-en un ci-dessous.
                      </Alert>
                    )}

                    {creneauxDisponibles.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: showAjoutCreneau ? 12 : 0 }}>
                        {creneauxDisponibles.map(c => (
                          <div key={c.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: 10, border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 13
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                              {formatDate(c.date)}
                              <span style={{ margin: '0 2px' }}>•</span>
                              <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                              {c.heureDebut} - {c.heureFin}
                            </div>
                            <Button variant="ghost" size="xs" onClick={() => handleSupprimerCreneau(c.id)}>
                              <Trash2 size={13} style={{ color: 'var(--red)' }} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {showAjoutCreneau && (
                      <div style={{
                        background: 'var(--surface)', padding: 12, borderRadius: 8,
                        border: '1px solid var(--border-light)'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                          <input
                            type="date"
                            value={newDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={e => setNewDate(e.target.value)}
                            style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                          />
                          <input
                            type="time"
                            value={newHeureDebut}
                            onChange={e => setNewHeureDebut(e.target.value)}
                            style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                          />
                          <input
                            type="time"
                            value={newHeureFin}
                            onChange={e => setNewHeureFin(e.target.value)}
                            style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <Button variant="ghost" size="xs" onClick={() => setShowAjoutCreneau(false)}>Annuler</Button>
                          <Button variant="primary" size="xs" onClick={handleAjouterCreneau} disabled={submittingCreneau}>
                            {submittingCreneau ? 'Ajout...' : 'Ajouter'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </FormGroup>
            ) : (
              /* ── CAS TECHNIQUE / DIRECTION : verification seule, pas de gestion ici ── */
              <FormGroup>
                <FormLabel>Creneaux du {config.roleLabel.toLowerCase()}</FormLabel>
                {checkingCreneaux ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                    Verification des creneaux disponibles...
                  </div>
                ) : nbCreneauxDisponibles === 0 ? (
                  <Alert variant="gold">
                    <AlertCircle size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
                    Aucun creneau disponible. Le {config.roleLabel.toLowerCase()} doit d'abord saisir ses disponibilites.
                  </Alert>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'var(--surface)', borderRadius: 8, fontSize: 13 }}>
                    <Calendar size={14} style={{ color: 'var(--gold)' }} />
                    {nbCreneauxDisponibles} creneau(x) disponible(s) — le candidat choisira lui-meme le sien
                  </div>
                )}
              </FormGroup>
            )}

            {error && (
              <div style={{ marginTop: 16 }}>
                <Alert variant="red">{error}</Alert>
              </div>
            )}

            <div style={{
              marginTop: 16, padding: 12,
              background: 'var(--gold-pale)', borderRadius: 8,
              fontSize: 12, color: 'var(--text-muted)'
            }}>
              Un email sera envoye au candidat avec un lien lui permettant de choisir lui-meme son creneau parmi les disponibilites ci-dessus. L'entretien ne sera cree qu'une fois le candidat engage.
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}