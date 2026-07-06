import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Users, FileText, Briefcase, Calendar,
  CheckCircle, XCircle, Clock, Eye, Star, DollarSign, Award,
  Activity, FileCheck, GitBranch, Shield, UserCheck, BarChart, Target, Gauge
} from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { dashboardService, DashboardStats } from '../../../services/dashboard.service';
import { useAuth } from '../../../contexts/AuthContext';
import {
  LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart as ReBarChart, Bar
} from 'recharts';

// ============================================
// TYPES POUR LES KPI AVANCÉS (miroir du backend)
// ============================================

type TendanceDirection = 'up' | 'down' | 'stable';

interface TendanceKpi {
  valeur: number;
  precedent: number;
  evolution: number;
  direction: TendanceDirection;
}

interface FunnelEtape {
  label: string;
  valeur: number;
  tauxConversion: number;
}

// ============================================
// COMPOSANTS RÉUTILISABLES "NIVEAU ERP"
// ============================================

/**
 * Petit badge de tendance (flèche + %). `sensInverse` = true quand une baisse
 * est une bonne nouvelle (ex: délai de recrutement).
 */
function TendanceBadge({ tendance, sensInverse = false }: { tendance?: TendanceKpi; sensInverse?: boolean }) {
  if (!tendance || tendance.direction === 'stable' || tendance.evolution === 0) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
        <Minus size={12} /> stable
      </span>
    );
  }

  const estPositif = sensInverse ? tendance.direction === 'down' : tendance.direction === 'up';
  const couleur = estPositif ? 'var(--green)' : 'var(--red)';
  const Icone = tendance.direction === 'up' ? TrendingUp : TrendingDown;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: couleur, fontWeight: 600 }}>
      <Icone size={12} /> {Math.abs(tendance.evolution)}% vs 30j précédents
    </span>
  );
}

/**
 * Carte KPI standard avec icône, valeur, sous-titre et tendance optionnelle.
 */
function KpiCard({
  label,
  value,
  icon,
  subtitle,
  tendance,
  sensInverse,
  valueColor
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  tendance?: TendanceKpi;
  sensInverse?: boolean;
  valueColor?: string;
}) {
  return (
    <Card>
      <CardBody>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: valueColor }}>{value}</div>
            {subtitle && <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>{subtitle}</div>}
            {tendance && <div style={{ marginTop: 6 }}><TendanceBadge tendance={tendance} sensInverse={sensInverse} /></div>}
          </div>
          {icon && <div style={{ opacity: 0.5 }}>{icon}</div>}
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Jauge horizontale simple (0-100) pour les scores composites (qualité, SLA...).
 */
function GaugeBar({ label, value, suffix = '%' }: { label: string; value: number; suffix?: string }) {
  const couleur = value >= 75 ? 'var(--green)' : value >= 50 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--border-light)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: couleur, borderRadius: 4, transition: 'width .3s' }} />
      </div>
    </div>
  );
}

/**
 * Funnel de conversion du recrutement (pipeline visuel + taux de conversion entre étapes).
 */
function PipelineFunnel({ funnel }: { funnel: FunnelEtape[] }) {
  const maxValeur = Math.max(...funnel.map(e => e.valeur), 1);
  return (
    <div>
      {funnel.map((etape, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span>{etape.label}</span>
            <span style={{ fontWeight: 600 }}>
              {etape.valeur} {i > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({etape.tauxConversion}%)</span>}
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 4, background: 'var(--border-light)', overflow: 'hidden' }}>
            <div style={{
              width: `${(etape.valeur / maxValeur) * 100}%`,
              height: '100%',
              background: `hsl(${210 - i * 30}, 65%, 55%)`,
              borderRadius: 4,
              transition: 'width .3s'
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const formatMontant = (value: number) => `${(value || 0).toLocaleString()} DT`;

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

  const pieDataNiveaux = Object.entries(stats.counters?.demandes?.parNiveau || {}).map(([name, value]) => ({ name, value }));
  const pieColors = ['#4a90d9', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];
  const userRole = user?.role?.toLowerCase();

  const kpisAvances = stats.kpisAvances;
  const tendances = kpisAvances?.tendances;
  const pipeline = kpisAvances?.pipeline;
  const sla = kpisAvances?.sla;

  const alerteVariant = (type: string) => (type === 'danger' ? 'red' : type === 'warning' ? 'amber' : 'gold');
  const badgeStatutVariant = (statut: string) =>
    statut === 'VALIDEE' || statut === 'ACTIF' || statut === 'ACCEPTEE' ? 'green'
      : statut === 'REJETEE' || statut === 'REFUSEE' ? 'red'
      : 'gold';

  // ============================================
  // BLOC COMMUN : SECTION KPI AVANCÉS (réutilisé par tous les rôles)
  // ============================================
  const SectionKpiAvances = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
        <KpiCard
          label="Délai moyen de recrutement"
          value={formatDelai(stats.kpis?.delaiMoyenRecrutement || 0)}
          icon={<Clock size={28} />}
          tendance={tendances?.delaiMoyenRecrutement}
          sensInverse
        />
        <KpiCard
          label="Taux de transformation"
          value={formatPourcentage(stats.kpis?.tauxTransformation || 0)}
          icon={<Target size={28} />}
          tendance={tendances?.tauxTransformation}
        />
        <KpiCard
          label="Coût par recrutement"
          value={formatMontant(kpisAvances?.coutParRecrutement || 0)}
          icon={<DollarSign size={28} />}
          subtitle="Budget engagé / embauche réussie"
        />
        <KpiCard
          label="Score qualité recrutement"
          value={`${kpisAvances?.scoreQualiteRecrutement || 0}/100`}
          icon={<Award size={28} />}
          subtitle="Évaluation entretiens + conversion"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline de recrutement</CardTitle>
            <CardSubtitle>Taux de conversion entre chaque étape</CardSubtitle>
          </CardHeader>
          <CardBody>
            {pipeline?.funnel ? <PipelineFunnel funnel={pipeline.funnel} /> : <div>Aucune donnée</div>}
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Taux d'acceptation final (décision entretien) : <strong>{pipeline?.tauxAcceptationFinal || 0}%</strong>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conformité & rétention</CardTitle>
            <CardSubtitle>Indicateurs de pilotage RH</CardSubtitle>
          </CardHeader>
          <CardBody>
            <GaugeBar label={`SLA validation (cible ${sla?.delaiCible || 21}j)`} value={sla?.tauxConformite || 0} />
            <GaugeBar label="Rétention période d'essai" value={kpisAvances?.tauxRetentionEssai || 0} />
            <GaugeBar label="Score qualité global" value={kpisAvances?.scoreQualiteRecrutement || 0} />
          </CardBody>
        </Card>
      </div>
    </>
  );

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
          <KpiCard
            label="Utilisateurs actifs"
            value={stats.kpis?.utilisateursActifs || 0}
            icon={<Users size={32} />}
            subtitle={`${stats.kpis?.tauxOccupation || 0}% d'occupation`}
          />
          <KpiCard
            label="Demandes totales"
            value={stats.counters?.demandes?.total || 0}
            icon={<FileText size={32} />}
            subtitle={`${stats.counters?.demandes?.validees || 0} validées`}
          />
          <KpiCard
            label="Taux global"
            value={formatPourcentage(stats.counters?.demandes?.tauxValidation || 0)}
            icon={<CheckCircle size={32} />}
            subtitle="Validation demandes"
          />
          <KpiCard
            label="Budget total engagé"
            value={formatMontant(stats.kpis?.budgetTotalEngage || 0)}
            icon={<DollarSign size={32} />}
            tendance={tendances?.budgetEngage}
          />
        </div>

        <SectionKpiAvances />

        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>Activité globale</CardTitle>
            <CardSubtitle>Évolution des demandes, offres et budget sur 6 mois</CardSubtitle>
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

        {stats.alertes && stats.alertes.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {stats.alertes.map((alerte, idx) => (
              <Alert key={idx} variant={alerteVariant(alerte.type)}>{alerte.message}</Alert>
            ))}
          </div>
        )}

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
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, minWidth: 130 }}>
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </span>
                    <span style={{ flexShrink: 0 }}><Badge variant="gold">{log.action}</Badge></span>
                    <span style={{ flex: 1, fontSize: 13, minWidth: 0 }}>{log.details || `${log.entityType} - ${log.entityId}`}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{log.acteur}</span>
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
          <KpiCard
            label="Mes demandes"
            value={stats.counters?.demandes?.total || 0}
            subtitle={`${stats.counters?.demandes?.enCours || 0} en cours`}
          />
          <KpiCard
            label="Mes entretiens"
            value={stats.counters?.entretiens?.total || 0}
            subtitle={`${stats.kpis?.entretiensASaisir || 0} feedback à donner`}
          />
          <KpiCard
            label="Évaluations PE"
            value={stats.kpis?.evaluationsAPreparer || 0}
            valueColor={(stats.kpis?.evaluationsAPreparer || 0) > 0 ? 'var(--amber)' : 'var(--green)'}
            subtitle="à réaliser"
          />
          <KpiCard
            label="Mon équipe"
            value={stats.kpis?.monEquipe || 0}
            subtitle="collaborateurs actifs"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          <KpiCard
            label="Taux de conversion équipe"
            value={formatPourcentage(stats.kpis?.tauxConversionEquipe || 0)}
            icon={<Target size={24} />}
          />
          <KpiCard
            label="Délai moyen équipe"
            value={formatDelai(stats.kpis?.delaiMoyenEquipe || 0)}
            icon={<Clock size={24} />}
            tendance={tendances?.delaiMoyenRecrutement}
            sensInverse
          />
          <KpiCard
            label="Rétention période d'essai"
            value={formatPourcentage(stats.kpis?.retentionEquipeEssai || 0)}
            icon={<Shield size={24} />}
          />
        </div>

        {stats.alertes && stats.alertes.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {stats.alertes.map((alerte, idx) => (
              <Alert key={idx} variant={alerteVariant(alerte.type)}>{alerte.message}</Alert>
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
                  <Badge variant={badgeStatutVariant(d.statut)}>{d.statut}</Badge>
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
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, minWidth: 130 }}>
                    {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </span>
                  <span style={{ flexShrink: 0 }}><Badge variant="gold">{log.action}</Badge></span>
                  <span style={{ flex: 1, fontSize: 13, minWidth: 0 }}>{log.details}</span>
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
          <KpiCard label="Demandes totales" value={stats.counters?.demandes?.total || 0} />
          <KpiCard
            label="En attente validation"
            value={stats.counters?.demandes?.enCours || 0}
            valueColor="var(--amber)"
          />
          <KpiCard label="Taux validation" value={formatPourcentage(stats.counters?.demandes?.tauxValidation || 0)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          <KpiCard
            label="Coût par recrutement"
            value={formatMontant(stats.kpis?.coutParRecrutementDirection || 0)}
            icon={<DollarSign size={24} />}
          />
          <KpiCard
            label="Conformité SLA"
            value={formatPourcentage(stats.kpis?.slaDirection || 0)}
            icon={<Gauge size={24} />}
          />
          <KpiCard
            label="Score qualité"
            value={`${stats.kpis?.scoreQualiteDirection || 0}/100`}
            icon={<Award size={24} />}
          />
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
          <KpiCard
            label="Demandes"
            value={stats.counters?.demandes?.total || 0}
            icon={<FileText size={28} />}
            subtitle={`${stats.counters?.demandes?.validees || 0} validées`}
          />
          <KpiCard
            label="Offres"
            value={stats.counters?.offres?.total || 0}
            icon={<Briefcase size={28} />}
            subtitle={`${stats.counters?.offres?.publiees || 0} publiées`}
          />
          <KpiCard
            label="Candidatures"
            value={stats.counters?.candidatures?.total || 0}
            icon={<Users size={28} />}
            subtitle={`${stats.counters?.candidatures?.acceptees || 0} acceptées`}
          />
          <KpiCard
            label="Taux transformation"
            value={formatPourcentage(stats.kpis?.tauxTransformation || 0)}
            icon={<Target size={28} />}
            tendance={tendances?.tauxTransformation}
          />
        </div>

        <SectionKpiAvances />

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
                    <Pie
                      data={pieDataNiveaux}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      dataKey="value"
                    >
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
                  <Badge variant={badgeStatutVariant(d.statut)}>{d.statut}</Badge>
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
          <KpiCard
            label="Contrats à préparer"
            value={stats.kpis?.contratsAPreparer || 0}
            valueColor="var(--amber)"
            subtitle="candidatures acceptées"
          />
          <KpiCard
            label="Évaluations PE"
            value={stats.kpis?.evaluationsASaisir || 0}
            subtitle="données à saisir"
          />
          <KpiCard
            label="Contrats actifs"
            value={stats.kpis?.contratsActifs || 0}
            subtitle="en période d'essai"
          />
          <KpiCard
            label="Périodes critiques"
            value={stats.kpis?.periodesEssai || 0}
            valueColor={(stats.kpis?.periodesEssai || 0) > 0 ? 'var(--red)' : 'var(--green)'}
            subtitle="fin dans -30 jours"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 20, marginBottom: 24 }}>
          <Card>
            <CardHeader>
              <CardTitle>Rétention en période d'essai</CardTitle>
              <CardSubtitle>Part des évaluations validées vs rejetées</CardSubtitle>
            </CardHeader>
            <CardBody>
              <GaugeBar label="Taux de rétention" value={stats.kpis?.tauxRetentionEssai || 0} />
            </CardBody>
          </Card>
        </div>

        {stats.alertes && stats.alertes.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {stats.alertes.map((alerte, idx) => (
              <Alert key={idx} variant={alerteVariant(alerte.type)}>{alerte.message}</Alert>
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
                  <Badge variant={badgeStatutVariant(c.statut)}>{c.statut}</Badge>
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
          <KpiCard label="À valider (DAF)" value={stats.counters?.demandes?.enCours || 0} valueColor="var(--amber)" />
          <KpiCard
            label="Budget total engagé"
            value={formatMontant(stats.kpis?.budgetTotal || 0)}
            tendance={stats.kpis?.budgetEngageVsPrecedent}
          />
          <KpiCard label="Taux validation" value={formatPourcentage(stats.counters?.demandes?.tauxValidation || 0)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
          <KpiCard
            label="Coût moyen par recrutement"
            value={formatMontant(stats.kpis?.coutMoyenParRecrutement || 0)}
            icon={<DollarSign size={24} />}
            subtitle="Budget engagé / embauche réussie"
          />
          <Card>
            <CardHeader>
              <CardTitle>Budget engagé (6 mois)</CardTitle>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={200}>
                <ReBarChart data={stats.tendances?.mois?.map((mois, i) => ({
                  mois,
                  budget: stats.tendances?.budget?.[i] || 0
                })) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="budget" fill="#c9a84c" name="Budget (DT)" />
                </ReBarChart>
              </ResponsiveContainer>
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
          <KpiCard label="À valider (DGA)" value={stats.counters?.demandes?.enCours || 0} valueColor="var(--amber)" />
          <KpiCard label="Demandes validées" value={stats.counters?.demandes?.validees || 0} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
          <KpiCard label="Conformité SLA" value={formatPourcentage(stats.kpis?.slaConformite || 0)} icon={<Gauge size={24} />} />
          <KpiCard label="Score qualité recrutement" value={`${stats.kpis?.scoreQualiteRecrutement || 0}/100`} icon={<Award size={24} />} />
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
          <KpiCard label="À valider (DG)" value={stats.counters?.demandes?.enCours || 0} valueColor="var(--amber)" />
          <KpiCard label="Recrutements en cours" value={stats.counters?.candidatures?.entretien || 0} />
          <KpiCard label="Taux global" value={formatPourcentage(stats.counters?.demandes?.tauxValidation || 0)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
          <KpiCard label="Budget total engagé" value={formatMontant(stats.kpis?.budgetTotalEngage || 0)} icon={<DollarSign size={22} />} />
          <KpiCard label="Coût par recrutement" value={formatMontant(stats.kpis?.coutParRecrutement || 0)} icon={<Target size={22} />} />
          <KpiCard label="Score qualité" value={`${stats.kpis?.scoreQualiteRecrutement || 0}/100`} icon={<Award size={22} />} />
          <KpiCard label="Conformité SLA" value={formatPourcentage(stats.kpis?.slaConformite || 0)} icon={<Gauge size={22} />} />
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