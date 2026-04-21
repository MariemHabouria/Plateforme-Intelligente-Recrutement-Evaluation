// frontend/src/components/pages/entretiens/PlanifierEntretienModal.tsx

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Mail, Phone } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { FormGroup, FormLabel } from '../../ui/FormField';
import { Alert } from '../../ui/Alert';
import api from '../../../services/api';

// ============================================
// TYPES
// ============================================

type TypeEntretien = 'RH' | 'TECHNIQUE' | 'DIRECTION';

interface DisponibiliteInterviewer {
  id: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  user: {
    id: string;
    nom: string;
    prenom: string;
    role: string;
  };
}

interface PlanifierEntretienModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType: 'RH' | 'TECHNIQUE' | 'DIRECTION';
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

// ============================================
// CONFIGURATION DES TYPES D'ENTRETIEN
// ============================================

const TYPE_CONFIG: Record<TypeEntretien, { label: string; description: string; needsCreneau: boolean }> = {
  RH: {
    label: 'Entretien RH',
    description: 'Date et heure libres, interviewer : DRH',
    needsCreneau: false
  },
  TECHNIQUE: {
    label: 'Entretien technique',
    description: 'Créneau du manager requis',
    needsCreneau: true
  },
  DIRECTION: {
    label: 'Entretien direction',
    description: 'Créneau du directeur requis',
    needsCreneau: true
  }
};

// ============================================
// COMPOSANT
// ============================================

export function PlanifierEntretienModal({
  open, 
  onClose, 
  onSuccess, 
  candidature,
  defaultType
}: PlanifierEntretienModalProps) {
  const [loading, setLoading] = useState(false);
  const [disponibilites, setDisponibilites] = useState<DisponibiliteInterviewer[]>([]);
  const [loadingDispos, setLoadingDispos] = useState(false);
  const [selectedDisponibiliteId, setSelectedDisponibiliteId] = useState('');
  const [dateLibre, setDateLibre] = useState('');
  const [heureLibre, setHeureLibre] = useState('');
  const [lieu, setLieu] = useState('Siège - Tunis');
  const [error, setError] = useState('');

  const demandeId = candidature?.offre?.demande?.id || '';
  const config = TYPE_CONFIG[defaultType];
  const needsCreneau = config.needsCreneau;

  // Réinitialiser à l'ouverture
  useEffect(() => {
    if (open) {
      setSelectedDisponibiliteId('');
      setDateLibre('');
      setHeureLibre('');
      setError('');
      setDisponibilites([]);
      
      if (needsCreneau && demandeId) {
        fetchDisponibilites();
      }
    }
  }, [open, demandeId, needsCreneau]);

  const fetchDisponibilites = async () => {
    if (!demandeId) {
      setError('Impossible de charger les créneaux : demande introuvable');
      return;
    }
    try {
      setLoadingDispos(true);
      setError('');
      const response = await api.get(`/entretiens/disponibilites/${demandeId}`, {
        params: { type: defaultType }
      });
      setDisponibilites(response.data.data.disponibilites || []);
    } catch (err) {
      console.error('Erreur chargement disponibilités:', err);
      setError('Erreur lors du chargement des créneaux');
    } finally {
      setLoadingDispos(false);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (needsCreneau) {
      if (!selectedDisponibiliteId) {
        setError('Veuillez sélectionner un créneau');
        return;
      }
    } else {
      if (!dateLibre || !heureLibre) {
        setError('Veuillez saisir une date et une heure');
        return;
      }
    }

    if (!lieu.trim()) {
      setError('Veuillez saisir un lieu');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        candidatureId: candidature.id,
        type: defaultType,
        lieu
      };

      if (needsCreneau) {
        payload.disponibiliteId = selectedDisponibiliteId;
      } else {
        payload.date = dateLibre;
        payload.heure = heureLibre;
      }

      await api.post('/entretiens', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la planification');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Planifier ${config.label}`}
      maxWidth={600}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || (needsCreneau && !selectedDisponibiliteId) || (!needsCreneau && (!dateLibre || !heureLibre))}
          >
            {loading ? 'Planification...' : 'Planifier l\'entretien'}
          </Button>
        </div>
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

        {/* Type d'entretien (affiché en lecture seule) */}
        <div style={{
          padding: '8px 12px',
          background: 'var(--surface)',
          borderRadius: 6,
          marginBottom: 16,
          border: '1px solid var(--border-light)'
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Type d'entretien</span>
          <div style={{ fontWeight: 500 }}>{config.label}</div>
        </div>

        {/* Lieu */}
        <FormGroup>
          <FormLabel required>Lieu</FormLabel>
          <input
            value={lieu}
            onChange={e => setLieu(e.target.value)}
            placeholder="ex: Siège - Tunis, Salle de réunion A..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
        </FormGroup>

        {/* CAS RH : date et heure libres */}
        {!needsCreneau && (
          <>
            <FormGroup>
              <FormLabel required>Date de l'entretien</FormLabel>
              <input
                type="date"
                value={dateLibre}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDateLibre(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Heure</FormLabel>
              <input
                type="time"
                value={heureLibre}
                onChange={e => setHeureLibre(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
              />
            </FormGroup>
          </>
        )}

        {/* CAS TECHNIQUE / DIRECTION : créneaux disponibles */}
        {needsCreneau && (
          <FormGroup>
            <FormLabel required>
              Créneaux disponibles — {defaultType === 'TECHNIQUE' ? 'Manager' : 'Directeur'}
            </FormLabel>
            {loadingDispos ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                Chargement des créneaux...
              </div>
            ) : disponibilites.length === 0 ? (
              <Alert variant="gold">
                Aucun créneau disponible. L'interviewer n'a pas encore saisi ses disponibilités.
              </Alert>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {disponibilites.map((dispo) => (
                  <label
                    key={dispo.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      border: selectedDisponibiliteId === dispo.id
                        ? '2px solid var(--gold)'
                        : '1px solid var(--border-light)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: selectedDisponibiliteId === dispo.id
                        ? 'rgba(172, 107, 46, 0.05)'
                        : 'transparent',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setSelectedDisponibiliteId(dispo.id)}
                  >
                    <input
                      type="radio"
                      name="disponibilite"
                      value={dispo.id}
                      checked={selectedDisponibiliteId === dispo.id}
                      onChange={() => setSelectedDisponibiliteId(dispo.id)}
                      style={{ margin: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        <Calendar size={14} style={{ display: 'inline', marginRight: 6 }} />
                        {formatDate(dispo.date)}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: 6 }} />
                        {dispo.heureDebut} — {dispo.heureFin}
                        <span style={{ marginLeft: 12, fontSize: 11 }}>
                          ({dispo.user.prenom} {dispo.user.nom})
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
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
          Une notification sera envoyée à l'interviewer et le créneau sera marqué comme réservé.
        </div>
      </div>
    </Modal>
  );
}