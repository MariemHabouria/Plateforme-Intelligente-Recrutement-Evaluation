import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, Eye, CheckCircle, Clock, XCircle, RefreshCcw } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { useAuth } from '../../../contexts/AuthContext';
import { entretienService, EntretienAvecInfo, OffreFiltre, GetEntretiensParams } from '../../../services/entretien.service';
import { normalizeRole } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  RH: 'Entretien RH',
  TECHNIQUE: 'Entretien technique',
  DIRECTION: 'Entretien direction'
};

const STATUT_LABELS: Record<string, string> = {
  PLANIFIE: 'Planifié',
  REALISE: 'Réalisé',
  ANNULE: 'Annulé',
  REPORTE: 'Reporté'
};

function badgeVariantStatut(statut: string) {
  if (statut === 'REALISE') return 'green';
  if (statut === 'ANNULE') return 'red';
  if (statut === 'REPORTE') return 'amber';
  return 'gold'; // PLANIFIE
}

export function EntretiensPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = normalizeRole(user?.role as string);
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isDRH = role === 'DRH';

  const [entretiens, setEntretiens] = useState<EntretienAvecInfo[]>([]);
  const [offres, setOffres] = useState<OffreFiltre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtres
  const [type, setType] = useState('');
  const [statut, setStatut] = useState('');
  const [recherche, setRecherche] = useState('');
  const [offreId, setOffreId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [vueGlobale, setVueGlobale] = useState(true); // pertinent pour le DRH uniquement

  useEffect(() => {
    fetchOffres();
  }, []);

  useEffect(() => {
    fetchEntretiens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, statut, offreId, dateDebut, dateFin, vueGlobale]);

  const fetchOffres = async () => {
    try {
      const data = await entretienService.getOffresPourFiltre();
      setOffres(data);
    } catch (err) {
      console.error('Erreur chargement offres:', err);
    }
  };

  const fetchEntretiens = async () => {
    try {
      setLoading(true);
      setError('');
      const params: GetEntretiensParams = {};
      if (type) params.type = type as any;
      if (statut) params.statut = statut as any;
      if (offreId) params.offreId = offreId;
      if (dateDebut) params.dateDebut = dateDebut;
      if (dateFin) params.dateFin = dateFin;
      if (isDRH) params.vueGlobale = vueGlobale;

      const data = await entretienService.getEntretiens(params);
      setEntretiens(data);
    } catch (err) {
      console.error('Erreur chargement entretiens:', err);
      setError('Erreur lors du chargement des entretiens');
    } finally {
      setLoading(false);
    }
  };

  // Recherche côté client (nom/prénom candidat) — le backend le supporte aussi via `recherche`,
  // mais on filtre en local pour un retour instantané pendant la saisie.
  const entretiensFiltres = useMemo(() => {
    if (!recherche.trim()) return entretiens;
    const q = recherche.trim().toLowerCase();
    return entretiens.filter(e => {
      const nom = (e.candidature as any)?.nom?.toLowerCase() || '';
      const prenom = (e.candidature as any)?.prenom?.toLowerCase() || '';
      return nom.includes(q) || prenom.includes(q);
    });
  }, [entretiens, recherche]);

  // Statistiques rapides (calculées côté client à partir de la liste chargée)
  const stats = useMemo(() => {
    const total = entretiensFiltres.length;
    const planifies = entretiensFiltres.filter(e => e.statut === 'PLANIFIE').length;
    const realises = entretiensFiltres.filter(e => e.statut === 'REALISE').length;
    const aVenir = entretiensFiltres.filter(e => new Date(e.date) > new Date()).length;
    return { total, planifies, realises, aVenir };
  }, [entretiensFiltres]);

  const resetFiltres = () => {
    setType('');
    setStatut('');
    setRecherche('');
    setOffreId('');
    setDateDebut('');
    setDateFin('');
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid var(--border-light)',
    fontSize: 13,
    background: 'var(--bg-card, #fff)',
    color: 'inherit'
  };

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            {isSuperAdmin ? 'Entretiens — Vue globale' : 'Entretiens'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {isSuperAdmin
              ? "Supervision de tous les entretiens, toutes directions et tous types confondus"
              : "Suivi de vos entretiens"}
          </p>
        </div>
        {isDRH && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={vueGlobale} onChange={e => setVueGlobale(e.target.checked)} />
            Vue globale (tous types)
          </label>
        )}
      </div>

      {/* KPI rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total}</div>
              </div>
              <Calendar size={26} style={{ opacity: 0.5 }} />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Planifiés</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.planifies}</div>
              </div>
              <Clock size={26} style={{ opacity: 0.5 }} />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Réalisés</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>{stats.realises}</div>
              </div>
              <CheckCircle size={26} style={{ opacity: 0.5 }} />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>À venir</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.aVenir}</div>
              </div>
              <RefreshCcw size={26} style={{ opacity: 0.5 }} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filtres */}
      <Card style={{ marginBottom: 24 }}>
        <CardBody>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input
                type="text"
                placeholder="Rechercher un candidat..."
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                style={{ ...inputStyle, width: '100%', paddingLeft: 30 }}
              />
            </div>

            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              <option value="">Tous les types</option>
              <option value="RH">Entretien RH</option>
              <option value="TECHNIQUE">Entretien technique</option>
              <option value="DIRECTION">Entretien direction</option>
            </select>

            <select value={statut} onChange={e => setStatut(e.target.value)} style={inputStyle}>
              <option value="">Tous les statuts</option>
              <option value="PLANIFIE">Planifié</option>
              <option value="REALISE">Réalisé</option>
              <option value="ANNULE">Annulé</option>
              <option value="REPORTE">Reporté</option>
            </select>

            {(isSuperAdmin || isDRH) && (
              <select value={offreId} onChange={e => setOffreId(e.target.value)} style={inputStyle}>
                <option value="">Toutes les offres</option>
                {offres.map(o => (
                  <option key={o.id} value={o.id}>{o.reference} — {o.intitule}</option>
                ))}
              </select>
            )}

            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={inputStyle} />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>à</span>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={inputStyle} />

            <button
              onClick={resetFiltres}
              style={{ ...inputStyle, cursor: 'pointer', background: 'transparent', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Filter size={14} /> Réinitialiser
            </button>
          </div>
        </CardBody>
      </Card>

      {error && <Alert variant="red">{error}</Alert>}

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des entretiens</CardTitle>
          <CardSubtitle>{entretiensFiltres.length} résultat(s)</CardSubtitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</div>
          ) : entretiensFiltres.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun entretien trouvé</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Date</th>
                    <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Type</th>
                    <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Candidat</th>
                    <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Poste</th>
                    <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Interviewer</th>
                    <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Statut</th>
                    <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 500 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {entretiensFiltres.map(e => {
                    const candidature: any = e.candidature;
                    const interviewer: any = e.interviewer;
                    return (
                      <tr
                        key={e.id}
                        style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                        onClick={() => navigate(`/entretiens/${e.id}`)}
                      >
                        <td style={{ padding: '10px 8px' }}>
                          {new Date(e.date).toLocaleDateString('fr-FR')} {e.heure}
                        </td>
                        <td style={{ padding: '10px 8px' }}>{TYPE_LABELS[e.type] || e.type}</td>
                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>
                          {candidature ? `${candidature.prenom} ${candidature.nom}` : '—'}
                        </td>
                        <td style={{ padding: '10px 8px' }}>{candidature?.offre?.intitule || '—'}</td>
                        <td style={{ padding: '10px 8px' }}>
                          {interviewer ? `${interviewer.prenom} ${interviewer.nom}` : '—'}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <Badge variant={badgeVariantStatut(e.statut)}>{STATUT_LABELS[e.statut] || e.statut}</Badge>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <Eye size={16} style={{ opacity: 0.6 }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}