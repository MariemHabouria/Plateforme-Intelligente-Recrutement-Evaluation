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

const pieDataNiveaux = Object.entries(stats.counters?.demandes?.parNiveau || {}).map(([name, value]) => ({ name, value }));  const pieColors = ['#4a90d9', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];
  const userRole = user?.role?.toLowerCase();

  // ============================================
  // SUPER ADMIN
  // ============================================
  if (userRole === 'superadmin') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - Administration</h1>
          <p style={{ color: 'var(--text-muted)' }}>Vue d'ensemble globale de la plateforme</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Utilisateurs actifs</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.kpis?.utilisateursActifs || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
                    {stats.kpis?.tauxOccupation || 0}% d'occupation
                  </div>
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
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.demandes?.total || 0}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{stats.counters?.demandes?.validees || 0} validées</div>
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
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.demandes?.tauxValidation || 0}%</div>
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
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Budget total engagé</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.kpis?.budgetTotalEngage?.toLocaleString() || 0} DT</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Tous recrutements validés</div>
                </div>
                <DollarSign size={32} style={{ opacity: 0.5 }} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Graphique tendance */}
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>Activité globale</CardTitle>
            <CardSubtitle>Évolution des demandes et offres sur 6 mois</CardSubtitle>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.tendances?.mois?.map((mois, i) => ({
                mois,
                demandes: stats.tendances?.demandes?.[i] || 0,
                offres: stats.tendances?.offres?.[i] || 0
              })) || []}>
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

        {/* Alertes */}
        {stats.alertes && stats.alertes.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {stats.alertes.map((alerte, idx) => (
              <Alert key={idx} variant={alerte.type === 'danger' ? 'red' : alerte.type === 'warning' ? 'amber' : 'blue'}>
                {alerte.message}
              </Alert>
            ))}
          </div>
        )}

        {/* Logs d'audit */}
        <Card>
          <CardHeader>
            <CardTitle>Logs d'audit récents</CardTitle>
            <CardSubtitle>Activité système et actions des utilisateurs</CardSubtitle>
          </CardHeader>
          <CardBody>
            {stats.auditLogs && stats.auditLogs.length > 0 ? (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {stats.auditLogs.map((log, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 150 }}>
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </span>
                    <Badge variant="blue" style={{ width: 120 }}>{log.action}</Badge>
                    <span style={{ flex: 1, fontSize: 13 }}>{log.details || `${log.entityType} - ${log.entityId}`}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.acteur}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun log récent</div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // ============================================
  // MANAGER
  // ============================================
  if (userRole === 'manager') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - Manager</h1>
          <p style={{ color: 'var(--text-muted)' }}>Suivi de vos demandes, entretiens et évaluations</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mes demandes</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.demandes?.total || 0}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{stats.counters?.demandes?.enCours || 0} en cours</div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mes entretiens</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.entretiens?.total || 0}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{stats.kpis?.entretiensASaisir || 0} feedback à donner</div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Évaluations PE</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: (stats.kpis?.evaluationsAPreparer || 0) > 0 ? 'var(--amber)' : 'var(--green)' }}>
                  {stats.kpis?.evaluationsAPreparer || 0}
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>à réaliser</div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mon équipe</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.kpis?.monEquipe || 0}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>collaborateurs actifs</div>
              </div>
            </CardBody>
          </Card>
        </div>

        {stats.alertes && stats.alertes.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {stats.alertes.map((alerte, idx) => (
              <Alert key={idx} variant={alerte.type === 'danger' ? 'red' : alerte.type === 'warning' ? 'amber' : 'blue'}>
                {alerte.message}
              </Alert>
            ))}
          </div>
        )}

        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>Mes demandes récentes</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.activiteRecente?.demandes?.length > 0 ? (
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
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune demande récente</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historique de mes actions</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.auditLogs && stats.auditLogs.length > 0 ? (
              stats.auditLogs.map((log, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 150 }}>
                    {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </span>
                  <Badge variant="blue">{log.action}</Badge>
                  <span style={{ flex: 1, fontSize: 13 }}>{log.details}</span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun historique récent</div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // ============================================
  // DIRECTEUR
  // ============================================
  if (userRole === 'directeur') {
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
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.demandes?.total || 0}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>En attente validation</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{stats.counters?.demandes?.enCours || 0}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Taux validation</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.demandes?.tauxValidation || 0}%</div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demandes à valider</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.activiteRecente?.demandes?.filter(d => d.statut !== 'VALIDEE' && d.statut !== 'REJETEE').length > 0 ? (
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
  if (userRole === 'rh') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - DRH</h1>
          <p style={{ color: 'var(--text-muted)' }}>Vue d'ensemble du recrutement</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Demandes</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.demandes?.total || 0}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{stats.counters?.demandes?.validees || 0} validées</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Offres</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.offres?.total || 0}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{stats.counters?.offres?.publiees || 0} publiées</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Candidatures</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.candidatures?.total || 0}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{stats.counters?.candidatures?.acceptees || 0} acceptées</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Taux transformation</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.kpis?.tauxTransformation || 0}%</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Candidatures → embauches</div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardHeader>
              <CardTitle>Tendance recrutement</CardTitle>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.tendances?.mois?.map((mois, i) => ({
                  mois,
                  demandes: stats.tendances?.demandes?.[i] || 0,
                  offres: stats.tendances?.offres?.[i] || 0,
                  candidatures: stats.tendances?.candidatures?.[i] || 0
                })) || []}>
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

        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.activiteRecente?.demandes?.slice(0, 3).map((d, i) => (
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
  // RESPONSABLE PAIE
  // ============================================
  if (userRole === 'paie') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - Paie</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestion des contrats et périodes d'essai</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Contrats à préparer</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{stats.kpis?.contratsAPreparer || 0}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>candidatures acceptées</div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Évaluations PE</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.kpis?.evaluationsASaisir || 0}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>données à saisir</div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Contrats actifs</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.kpis?.contratsActifs || 0}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>en période d'essai</div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Périodes critiques</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: (stats.kpis?.periodesEssai || 0) > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {stats.kpis?.periodesEssai || 0}
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>fin dans -30 jours</div>
              </div>
            </CardBody>
          </Card>
        </div>

        {stats.alertes && stats.alertes.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {stats.alertes.map((alerte, idx) => (
              <Alert key={idx} variant={alerte.type === 'danger' ? 'red' : alerte.type === 'warning' ? 'amber' : 'blue'}>
                {alerte.message}
              </Alert>
            ))}
          </div>
        )}

        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>Candidats à contracter</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.activiteRecente?.candidatures?.filter(c => c.statut === 'ACCEPTEE').length > 0 ? (
              stats.activiteRecente.candidatures
                .filter(c => c.statut === 'ACCEPTEE')
                .map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontWeight: 500, flex: 1 }}>{c.prenom} {c.nom}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.offre}</span>
                    <Badge variant="green">À contracter</Badge>
                  </div>
                ))
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun candidat à contracter</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contrats récents</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.activiteRecente?.contrats?.length > 0 ? (
              stats.activiteRecente.contrats.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 120 }}>{c.reference}</span>
                  <span style={{ flex: 1 }}>{c.employe}</span>
                  <Badge variant={c.statut === 'ACTIF' ? 'green' : c.statut === 'ENVOYE' ? 'amber' : 'blue'}>
                    {c.statut}
                  </Badge>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun contrat récent</div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // ============================================
  // DAF
  // ============================================
  if (userRole === 'daf') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - DAF</h1>
          <p style={{ color: 'var(--text-muted)' }}>Suivi budgétaire et validations financières</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>À valider (DAF)</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{stats.counters?.demandes?.enCours || 0}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Budget total engagé</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.kpis?.budgetTotalEngage?.toLocaleString() || 0} DT</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Taux validation</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.demandes?.tauxValidation || 0}%</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // ============================================
  // DGA
  // ============================================
  if (userRole === 'dga') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - DGA</h1>
          <p style={{ color: 'var(--text-muted)' }}>Validations stratégiques</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>À valider (DGA)</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{stats.counters?.demandes?.enCours || 0}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Demandes validées</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.demandes?.validees || 0}</div>
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
  if (userRole === 'dg') {
    return (
      <div className="page-fade">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Tableau de bord - DG</h1>
          <p style={{ color: 'var(--text-muted)' }}>Validation finale et vision stratégique</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>À valider (DG)</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{stats.counters?.demandes?.enCours || 0}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Recrutements en cours</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.candidatures?.entretien || 0}</div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Taux global</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.counters?.demandes?.tauxValidation || 0}%</div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demandes en attente de validation finale</CardTitle>
          </CardHeader>
          <CardBody>
            {stats.activiteRecente?.demandes?.filter(d => d.statut === 'EN_VALIDATION_DG').length > 0 ? (
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