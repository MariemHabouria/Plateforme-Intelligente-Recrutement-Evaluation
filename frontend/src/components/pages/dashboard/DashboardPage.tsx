// frontend/src/components/pages/dashboard/DashboardPage.tsx

import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Users, FileText, Briefcase, Calendar, 
  CheckCircle, XCircle, Clock, Eye, Star, DollarSign, Award,
  Activity, FileCheck, GitBranch, Shield, UserCheck, BarChart
} from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { dashboardService, DashboardStats } from '../../../services/dashboard.service';
import { useAuth } from '../../../contexts/AuthContext';
import {
  LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const formatDelai = (jours: number) => {
    if (jours === 0) return 'N/A';
    return `${jours} jour${jours > 1 ? 's' : ''}`;
  };

  const formatPourcentage = (value: number) => `${value}%`;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div>Chargement du tableau de bord...</div>
      </div>
    );
  }

  if (error) {
    return <Alert variant="red">{error}</Alert>;
  }

  if (!stats) {
    return <Alert variant="gold">Aucune donnee disponible</Alert>;
  }

  const pieDataNiveaux = Object.entries(stats.demandes.parNiveau || {}).map(([name, value]) => ({ name, value }));
  const pieColors = ['#4a90d9', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];
  const role = user?.role;

  // ============================================
  // SUPER ADMIN
  // ============================================
  if (role === 'superadmin') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - Administration</h1>
          <p style={{ color: 'var(--text-muted)' }}>Vue d'ensemble globale de la plateforme</p>
        </div>

        {/* KPIS Globaux */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Utilisateurs actifs</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>0</div>
                  <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>+3 ce mois</div>
                </div>
                <Users size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Demandes totales</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.demandes.total}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{stats.demandes.validees} validees</div>
                </div>
                <FileText size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Taux global</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.kpis.tauxValidationDemandes}%</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Validation demandes</div>
                </div>
                <CheckCircle size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Delai moyen</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{formatDelai(stats.kpis.delaiMoyenRecrutement)}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Recrutement complet</div>
                </div>
                <Clock size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Graphique tendance */}
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>Activite globale</CardTitle>
            <CardSubtitle>Evolution des demandes et offres sur 6 mois</CardSubtitle>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.tendances.mois.map((mois, i) => ({
                mois,
                demandes: stats.tendances.demandes[i],
                offres: stats.tendances.offres[i]
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="demandes" stroke="#4a90d9" name="Demandes" />
                <Line type="monotone" dataKey="offres" stroke="#f39c12" name="Offres" />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Actions rapides admin */}
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, textAlign: 'center' }}>
                <Users size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
                <div style={{ fontWeight: 500 }}>Gestion utilisateurs</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ajouter / modifier</div>
              </div>
              <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, textAlign: 'center' }}>
                <GitBranch size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
                <div style={{ fontWeight: 500 }}>Circuits validation</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Parametrage</div>
              </div>
              <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, textAlign: 'center' }}>
                <Shield size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
                <div style={{ fontWeight: 500 }}>Logs audit</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Consulter historique</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ============================================
  // MANAGER
  // ============================================
  if (role === 'manager') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - Manager</h1>
          <p style={{ color: 'var(--text-muted)' }}>Suivi de vos demandes et entretiens</p>
        </div>

        {/* KPIS Manager */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mes demandes</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.demandes.total}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{stats.demandes.enCours} en cours</div>
                </div>
                <FileText size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mes entretiens</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.entretiens.total}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{stats.entretiens.planifies} a venir</div>
                </div>
                <Calendar size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Taux validation</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.demandes.tauxValidation}%</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Mes demandes</div>
                </div>
                <CheckCircle size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Evaluation PE</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>0</div>
                  <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>En attente</div>
                </div>
                <UserCheck size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Activite recente */}
        <Card>
          <CardHeader>
            <CardTitle>Mes demandes recentes</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.activiteRecente.demandes.length > 0 ? (
              stats.activiteRecente.demandes.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 100 }}>{new Date(d.date).toLocaleDateString('fr-FR')}</span>
                  <span style={{ fontWeight: 500, flex: 1 }}>{d.intitulePoste}</span>
                  <Badge variant={d.statut === 'VALIDEE' ? 'green' : d.statut === 'REJETEE' ? 'red' : 'amber'}>
                    {d.statut}
                  </Badge>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune demande recente</div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // ============================================
  // DIRECTEUR
  // ============================================
  if (role === 'directeur') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - Directeur</h1>
          <p style={{ color: 'var(--text-muted)' }}>Demandes de votre direction</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Demandes totales</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.demandes.total}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>En attente validation</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{stats.demandes.enCours}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Taux validation</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.demandes.tauxValidation}%</div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demandes a valider</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.activiteRecente.demandes.filter(d => d.statut !== 'VALIDEE' && d.statut !== 'REJETEE').length > 0 ? (
              stats.activiteRecente.demandes.filter(d => d.statut !== 'VALIDEE' && d.statut !== 'REJETEE').map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontWeight: 500, flex: 1 }}>{d.intitulePoste}</span>
                  <Badge variant="amber">En attente</Badge>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune demande en attente</div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // ============================================
  // DRH
  // ============================================
  if (role === 'rh') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - DRH</h1>
          <p style={{ color: 'var(--text-muted)' }}>Vue d'ensemble du recrutement</p>
        </div>

        {/* KPIS RH */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Demandes</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.demandes.total}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{stats.demandes.validees} validees</div>
                </div>
                <FileText size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Offres</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.offres.total}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{stats.offres.publiees} publiees</div>
                </div>
                <Briefcase size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Candidatures</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.candidatures.total}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{stats.candidatures.acceptees} acceptees</div>
                </div>
                <Users size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Taux transformation</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.kpis.tauxTransformation}%</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Candidatures vers embauches</div>
                </div>
                <Award size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Graphiques */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardHeader>
              <CardTitle>Tendance recrutement</CardTitle>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.tendances.mois.map((mois, i) => ({
                  mois,
                  demandes: stats.tendances.demandes[i],
                  offres: stats.tendances.offres[i],
                  candidatures: stats.tendances.candidatures[i]
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="demandes" stroke="#4a90d9" name="Demandes" />
                  <Line type="monotone" dataKey="offres" stroke="#f39c12" name="Offres" />
                  <Line type="monotone" dataKey="candidatures" stroke="#2ecc71" name="Candidatures" />
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Demandes par niveau</CardTitle>
            </CardHeader>
            <CardBody>
              {pieDataNiveaux.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie data={pieDataNiveaux} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} dataKey="value">
                      {pieDataNiveaux.map((entry, index) => (<Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>Aucune donnee</div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Activite recente */}
        <Card>
          <CardHeader>
            <CardTitle>Activite recente</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.activiteRecente.demandes.slice(0, 3).map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ flex: 1 }}>{d.intitulePoste}</span>
                  <Badge variant={d.statut === 'VALIDEE' ? 'green' : 'amber'}>{d.statut}</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ============================================
  // DAF
  // ============================================
  if (role === 'daf') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - DAF</h1>
          <p style={{ color: 'var(--text-muted)' }}>Suivi budgetaire et validations financieres</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>A valider (DAF)</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{stats.demandes.enCours}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Budget total engagé</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>0 DT</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Taux validation</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.demandes.tauxValidation}%</div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demandes en attente de validation budgetaire</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.activiteRecente.demandes.filter(d => d.statut === 'EN_VALIDATION_DAF').length > 0 ? (
              stats.activiteRecente.demandes.filter(d => d.statut === 'EN_VALIDATION_DAF').map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontWeight: 500, flex: 1 }}>{d.intitulePoste}</span>
                  <Badge variant="amber">A valider</Badge>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune demande en attente</div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // ============================================
  // DGA
  // ============================================
  if (role === 'dga') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - DGA</h1>
          <p style={{ color: 'var(--text-muted)' }}>Validations strategiques</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>A valider (DGA)</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{stats.demandes.enCours}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Demandes validees</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.demandes.validees}</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // ============================================
  // DG
  // ============================================
  if (role === 'dg') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - DG</h1>
          <p style={{ color: 'var(--text-muted)' }}>Validation finale et vision strategique</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>A valider (DG)</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{stats.demandes.enCours}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Recrutements en cours</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.candidatures.entretien}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Taux global</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.kpis.tauxValidationDemandes}%</div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demandes en attente de validation finale</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.activiteRecente.demandes.filter(d => d.statut === 'EN_VALIDATION_DG').length > 0 ? (
              stats.activiteRecente.demandes.filter(d => d.statut === 'EN_VALIDATION_DG').map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontWeight: 500, flex: 1 }}>{d.intitulePoste}</span>
                  <Badge variant="amber">Validation finale</Badge>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune demande en attente</div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // ============================================
  // RESPONSABLE PAIE
  // ============================================
  if (role === 'paie') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - Paie</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestion des contrats et periodes d'essai</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Contrats a generer</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{stats.candidatures.acceptees}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Periodes d'essai</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>0</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Contrats signes</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>0</div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Candidats a contracter</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.activiteRecente.candidatures.length > 0 ? (
              stats.activiteRecente.candidatures.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontWeight: 500, flex: 1 }}>{c.prenom} {c.nom}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.offre}</span>
                  <Badge variant="green">A contracter</Badge>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun candidat a contracter</div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // Fallback
  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord</h1>
        <p style={{ color: 'var(--text-muted)' }}>Bienvenue sur votre espace personnel</p>
      </div>
      <Card>
        <CardBody>
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Bienvenue sur la plateforme RH Kilani
          </div>
        </CardBody>
      </Card>
    </div>
  );
}