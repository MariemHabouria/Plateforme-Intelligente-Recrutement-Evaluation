// frontend/src/components/pages/entretiens/EntretiensPage.tsx

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Eye, Search, X as XIcon } from 'lucide-react';
import { Card, CardBody } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

interface Entretien {
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
    nom: string;
    prenom: string;
    email: string;
    offre: {
      id: string;
      intitule: string;
      reference: string;
    };
  };
  interviewer: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
}

interface Filtres {
  type: string;
  statut: string;
  dateDebut: string;
  dateFin: string;
  recherche: string;
  offreId: string;
}

const FILTRES_VIDES: Filtres = {
  type: '', statut: '', dateDebut: '', dateFin: '', recherche: '', offreId: ''
};

export function EntretiensPage() {
  const { user } = useAuth();
  const [entretiens, setEntretiens] = useState<Entretien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_VIDES);
  const [rechercheInput, setRechercheInput] = useState('');
  const navigate = useNavigate();

  // Debounce sur la recherche texte pour eviter un appel API a chaque frappe
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltres(prev => ({ ...prev, recherche: rechercheInput }));
    }, 400);
    return () => clearTimeout(timer);
  }, [rechercheInput]);

  useEffect(() => {
    fetchEntretiens();
  }, [filtres]);

  const fetchEntretiens = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      Object.entries(filtres).forEach(([k, v]) => { if (v) params[k] = v; });

      const response = await api.get('/entretiens', { params });
      setEntretiens(response.data.data.entretiens || []);
      setError('');
    } catch (err) {
      console.error('Erreur chargement entretiens:', err);
      setError('Erreur lors du chargement des entretiens');
    } finally {
      setLoading(false);
    }
  };

  const resetFiltres = () => {
    setFiltres(FILTRES_VIDES);
    setRechercheInput('');
  };

  const nbFiltresActifs = Object.values(filtres).filter(v => v).length;

  const getStatutVariant = (statut: string): 'gold' | 'green' | 'red' | 'amber' | 'olive' => {
    const variants: Record<string, any> = {
      PLANIFIE: 'amber', REALISE: 'green', ANNULE: 'red', REPORTE: 'gold'
    };
    return variants[statut] || 'amber';
  };

  const getStatutLabel = (statut: string): string => {
    const labels: Record<string, string> = {
      PLANIFIE: 'Planifie', REALISE: 'Realise', ANNULE: 'Annule', REPORTE: 'Reporte'
    };
    return labels[statut] || statut;
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      RH: 'Entretien RH', TECHNIQUE: 'Entretien technique', DIRECTION: 'Entretien direction'
    };
    return labels[type] || type;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const inputStyle = {
    padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13
  };

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          {user?.role === 'DIRECTEUR' ? 'Entretiens direction' : 'Entretiens'}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {entretiens.length} entretien(s) {nbFiltresActifs > 0 ? 'correspondant(s)' : 'planifie(s)'}
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="red">{error}</Alert>
        </div>
      )}

      {/* Barre de filtres */}
      <Card style={{ marginBottom: 16 }}>
        <CardBody>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

            <div style={{ position: 'relative', minWidth: 200, flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
              <input
                placeholder="Rechercher un candidat..."
                value={rechercheInput}
                onChange={e => setRechercheInput(e.target.value)}
                style={{ ...inputStyle, width: '100%', paddingLeft: 32 }}
              />
            </div>

            <select
              value={filtres.type}
              onChange={e => setFiltres({ ...filtres, type: e.target.value })}
              style={inputStyle}
            >
              <option value="">Tous types</option>
              <option value="RH">RH</option>
              <option value="TECHNIQUE">Technique</option>
              <option value="DIRECTION">Direction</option>
            </select>

            <select
              value={filtres.statut}
              onChange={e => setFiltres({ ...filtres, statut: e.target.value })}
              style={inputStyle}
            >
              <option value="">Tous statuts</option>
              <option value="PLANIFIE">Planifie</option>
              <option value="REALISE">Realise</option>
              <option value="ANNULE">Annule</option>
              <option value="REPORTE">Reporte</option>
            </select>

            <input
              type="date"
              value={filtres.dateDebut}
              onChange={e => setFiltres({ ...filtres, dateDebut: e.target.value })}
              style={inputStyle}
              title="Date de debut"
            />
            <input
              type="date"
              value={filtres.dateFin}
              onChange={e => setFiltres({ ...filtres, dateFin: e.target.value })}
              style={inputStyle}
              title="Date de fin"
            />

            {nbFiltresActifs > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFiltres}>
                <XIcon size={13} style={{ marginRight: 4 }} /> Reinitialiser ({nbFiltresActifs})
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '12px 16px', textAlign: 'left' }}>Candidat</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '12px 16px', textAlign: 'left' }}>Offre</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '12px 16px', textAlign: 'left' }}>Type</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '12px 16px', textAlign: 'left' }}>Date / Heure</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '12px 16px', textAlign: 'left' }}>Lieu</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '12px 16px', textAlign: 'left' }}>Statut</th>
                  <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '12px 16px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chargement des entretiens...
                    </td>
                  </tr>
                ) : entretiens.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      {nbFiltresActifs > 0 ? 'Aucun entretien ne correspond aux filtres' : 'Aucun entretien planifie'}
                    </td>
                  </tr>
                ) : (
                  entretiens.map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={`${e.candidature.prenom} ${e.candidature.nom}`} size="sm" />
                          <div>
                            <div style={{ fontWeight: 500 }}>{e.candidature.prenom} {e.candidature.nom}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.candidature.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        <div style={{ fontWeight: 500 }}>{e.candidature.offre.intitule}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{e.candidature.offre.reference}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        <Badge variant="gold">{getTypeLabel(e.type)}</Badge>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                          {formatDate(e.date)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                          {e.heure}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                          {e.lieu}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={getStatutVariant(e.statut)}>{getStatutLabel(e.statut)}</Badge>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Button variant="ghost" size="xs" onClick={() => navigate(`/entretiens/${e.id}`)} title="Voir details">
                          <Eye size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}