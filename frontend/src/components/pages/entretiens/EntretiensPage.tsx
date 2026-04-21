// frontend/src/components/pages/entretiens/EntretiensPage.tsx

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Briefcase, Check, X, Eye } from 'lucide-react';
import { Card, CardBody } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Avatar } from '../../ui/Avatar';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';  // ✅ AJOUTER

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

export function EntretiensPage() {
  const { user } = useAuth();  // ✅ Récupérer l'utilisateur
  const [entretiens, setEntretiens] = useState<Entretien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchEntretiens();
  }, []);

  const fetchEntretiens = async () => {
    try {
      setLoading(true);
      // ✅ Ajouter un paramètre pour filtrer par rôle
      const role = user?.role;
      const response = await api.get('/entretiens', { params: { role } });
      setEntretiens(response.data.data.entretiens || []);
    } catch (err) {
      console.error('Erreur chargement entretiens:', err);
      setError('Erreur lors du chargement des entretiens');
    } finally {
      setLoading(false);
    }
  };

  const getStatutVariant = (statut: string): 'gold' | 'green' | 'red' | 'amber' | 'olive' => {
    const variants: Record<string, any> = {
      'PLANIFIE': 'amber',
      'REALISE': 'green',
      'ANNULE': 'red',
      'REPORTE': 'gold'
    };
    return variants[statut] || 'amber';
  };

  const getStatutLabel = (statut: string): string => {
    const labels: Record<string, string> = {
      'PLANIFIE': 'Planifie',
      'REALISE': 'Realise',
      'ANNULE': 'Annule',
      'REPORTE': 'Reporte'
    };
    return labels[statut] || statut;
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'RH': 'Entretien RH',
      'TECHNIQUE': 'Entretien technique',
      'DIRECTION': 'Entretien direction'
    };
    return labels[type] || type;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Chargement des entretiens...
      </div>
    );
  }

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          {user?.role === 'directeur' ? 'Entretiens direction' : 'Entretiens'}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {entretiens.length} entretien(s) planifie(s)
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="red">{error}</Alert>
        </div>
      )}

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
                {entretiens.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Aucun entretien planifie
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
                        <Badge variant={getStatutVariant(e.statut)}>
                          {getStatutLabel(e.statut)}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          onClick={() => navigate(`/entretiens/${e.id}`)} 
                          title="Voir details"
                        >
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