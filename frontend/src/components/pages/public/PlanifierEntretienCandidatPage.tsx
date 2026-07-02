// frontend/src/components/pages/public/PlanifierEntretienCandidatPage.tsx
//
// Route PUBLIQUE (hors AuthContext, pas de JWT) : /planifier-entretien/:token
// A monter dans le router en dehors des routes protegees.

import { useState, useEffect, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface Creneau {
  id: string;
  date: string;
  heureDebut: string;
  heureFin: string;
}

interface PageData {
  candidat: { nom: string; prenom: string };
  poste: string;
  type: 'TECHNIQUE' | 'DIRECTION';
  lieu: string;
  creneaux: Creneau[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function PlanifierEntretienCandidatPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ date: string; heure: string; lieu: string } | null>(null);

  useEffect(() => {
    fetchCreneaux();
  }, [token]);

  const fetchCreneaux = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_BASE}/public/entretiens/creneaux`, { params: { token } });
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ce lien est invalide ou a expire.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (error) setError('');
  };

  const handleConfirmer = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/public/entretiens/reserver`, {
        token,
        disponibiliteId: selectedId
      });
      setConfirmed(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la confirmation. Ce creneau vient peut-etre d\'etre pris — actualisez la page.');
      fetchCreneaux();
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const typeLabel = data?.type === 'TECHNIQUE' ? 'Entretien technique' : 'Entretien Direction';

  const wrapperStyle: CSSProperties = {
    minHeight: '100vh',
    background: '#f5f2ec',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: 'Arial, sans-serif'
  };

  const cardStyle: CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    maxWidth: 560,
    width: '100%',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
  };

  const headerStyle: CSSProperties = {
    background: '#2c2416',
    color: '#c9a84c',
    padding: '28px 24px',
    textAlign: 'center'
  };

  if (loading) {
    return <div style={wrapperStyle}><p>Chargement...</p></div>;
  }

  if (confirmed) {
    return (
      <div style={wrapperStyle}>
        <div style={cardStyle}>
          <div style={{ ...headerStyle, background: '#2e7d32', color: '#fff' }}>
            <CheckCircle size={40} style={{ marginBottom: 8 }} />
            <h1 style={{ margin: 0, fontSize: 20 }}>Creneau confirme !</h1>
          </div>
          <div style={{ padding: 24 }}>
            <p>Votre entretien est confirme :</p>
            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 16, margin: '16px 0' }}>
              <p><Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />{formatDate(confirmed.date)}</p>
              <p><Clock size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />{confirmed.heure}</p>
              <p><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />{confirmed.lieu}</p>
            </div>
            <p style={{ fontSize: 13, color: '#888' }}>Un email de confirmation vient de vous etre envoye. Merci de vous presenter 10 minutes avant l'heure prevue avec une piece d'identite.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={wrapperStyle}>
        <div style={cardStyle}>
          <div style={{ padding: 40, textAlign: 'center' }}>
            <AlertCircle size={40} color="#c62828" style={{ marginBottom: 12 }} />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: 20 }}>{typeLabel}</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: 13 }}>{data?.poste}</p>
        </div>
        <div style={{ padding: 24 }}>
          <p>Bonjour <strong>{data?.candidat.prenom} {data?.candidat.nom}</strong>, choisissez le creneau qui vous convient :</p>

          <div style={{ background: '#fff3cd', borderLeft: '4px solid #ffc107', padding: 12, borderRadius: '0 6px 6px 0', margin: '16px 0', fontSize: 13 }}>
            <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Entretien en presentiel — {data?.lieu}
          </div>

          {data?.creneaux.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
              Aucun creneau disponible pour le moment. Merci de nous contacter directement.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0' }}>
              {data?.creneaux.map(c => (
                <label
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 14,
                    border: selectedId === c.id ? '2px solid #c9a84c' : '1px solid #e0ddd6',
                    borderRadius: 8, cursor: 'pointer',
                    background: selectedId === c.id ? 'rgba(201,168,76,0.08)' : 'transparent'
                  }}
                >
                  <input type="radio" checked={selectedId === c.id} onChange={() => handleSelect(c.id)} />
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      {formatDate(c.date)}
                    </div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                      <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      {c.heureDebut} — {c.heureFin}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {error && <p style={{ color: '#c62828', fontSize: 13 }}>{error}</p>}

          {data && data.creneaux.length > 0 && (
            <button
              onClick={handleConfirmer}
              disabled={!selectedId || submitting}
              style={{
                width: '100%', padding: 14, marginTop: 8,
                background: selectedId ? '#c9a84c' : '#ddd',
                color: '#2c2416', border: 'none', borderRadius: 8,
                fontWeight: 600, cursor: selectedId ? 'pointer' : 'not-allowed'
              }}
            >
              {submitting ? 'Confirmation...' : 'Confirmer ce creneau'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}