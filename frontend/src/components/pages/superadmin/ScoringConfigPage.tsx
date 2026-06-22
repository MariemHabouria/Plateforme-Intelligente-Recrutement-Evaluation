// frontend/src/components/pages/superadmin/ScoringConfigPage.tsx

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Info, Sliders, Target, Zap } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import api from '../../../services/api';

interface ScoringConfig {
  id: string;
  poidsCompetences: number;
  poidsExperience: number;
  poidsFormation: number;
  poidsSemantique: number;
  poidsCompletude: number;
  seuilMatching: number;
  updatedAt: string;
  somme: number;
}

interface SliderRowProps {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  index: number;
}

function SliderRow({ label, description, value, onChange, color, index }: SliderRowProps) {
  const pct = Math.round(value * 100);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '180px 1fr 52px',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))',
    }}>
      {/* Label */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 }}>{description}</div>
      </div>

      {/* Slider + track */}
      <div style={{ position: 'relative' }}>
        {/* Track background */}
        <div style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--surface-raised, #f0ede6)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 6,
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
            transition: 'width 0.1s',
          }} />
        </div>
        <input
          type="range"
          min={0} max={100} step={1}
          value={pct}
          onChange={e => onChange(Number(e.target.value) / 100)}
          style={{
            position: 'absolute',
            top: -2,
            left: 0,
            width: '100%',
            height: 10,
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
        {/* Min/max hints */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Value */}
      <div style={{
        textAlign: 'right',
        fontSize: 18,
        fontWeight: 700,
        color: color,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.5px',
      }}>
        {pct}%
      </div>
    </div>
  );
}

const CRITERION_COLORS = [
  '#9A8A50', // gold — compétences
  '#5A7A3A', // vert — expérience
  '#7A6C3A', // olive — formation
  '#C07820', // ambre — sémantique
  '#7A5A3A', // brun — complétude
];

export function ScoringConfigPage() {
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [form, setForm] = useState({
    poidsCompetences: 0.35,
    poidsExperience:  0.25,
    poidsFormation:   0.20,
    poidsSemantique:  0.12,
    poidsCompletude:  0.08,
    seuilMatching:    70,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  const somme = Number((
    form.poidsCompetences + form.poidsExperience +
    form.poidsFormation   + form.poidsSemantique +
    form.poidsCompletude
  ).toFixed(3));
  const sommeOk = Math.abs(somme - 1.0) < 0.001;

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/scoring-config');
      const c = res.data.data.config;
      setConfig(c);
      setForm({
        poidsCompetences: c.poidsCompetences,
        poidsExperience:  c.poidsExperience,
        poidsFormation:   c.poidsFormation,
        poidsSemantique:  c.poidsSemantique,
        poidsCompletude:  c.poidsCompletude,
        seuilMatching:    c.seuilMatching,
      });
    } catch {
      setError('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const normaliser = () => {
    const total = form.poidsCompetences + form.poidsExperience +
                  form.poidsFormation   + form.poidsSemantique + form.poidsCompletude;
    if (total === 0) return;
    const a = Number((form.poidsCompetences / total).toFixed(3));
    const b = Number((form.poidsExperience  / total).toFixed(3));
    const c = Number((form.poidsFormation   / total).toFixed(3));
    const d = Number((form.poidsSemantique  / total).toFixed(3));
    setForm(prev => ({
      ...prev,
      poidsCompetences: a,
      poidsExperience:  b,
      poidsFormation:   c,
      poidsSemantique:  d,
      poidsCompletude:  Number((1 - a - b - c - d).toFixed(3)),
    }));
  };

  const sauvegarder = async () => {
    if (!sommeOk) {
      setError(`La somme des poids doit être 1.0 (actuellement ${somme.toFixed(3)})`);
      return;
    }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await api.put('/admin/scoring-config', form);
      setSuccess('Configuration sauvegardée et appliquée au moteur IA.');
      await fetchConfig();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', fontSize: 13 }}>
      Chargement de la configuration…
    </div>
  );

  const criteria = [
    { key: 'poidsCompetences', label: 'Compétences techniques',    description: 'Correspondance des compétences requises',     value: form.poidsCompetences, onChange: (v: number) => setForm(p => ({ ...p, poidsCompetences: v })) },
    { key: 'poidsExperience',  label: 'Expérience professionnelle', description: 'Années d\'expérience vs minimum requis',     value: form.poidsExperience,  onChange: (v: number) => setForm(p => ({ ...p, poidsExperience: v })) },
    { key: 'poidsFormation',   label: 'Niveau de formation',        description: 'Diplôme vs niveau requis',                   value: form.poidsFormation,   onChange: (v: number) => setForm(p => ({ ...p, poidsFormation: v })) },
    { key: 'poidsSemantique',  label: 'Adéquation sémantique',      description: 'Similarité CV / description offre',          value: form.poidsSemantique,  onChange: (v: number) => setForm(p => ({ ...p, poidsSemantique: v })) },
    { key: 'poidsCompletude',  label: 'Complétude du profil',        description: 'Richesse du CV (langues, certifications…)', value: form.poidsCompletude,  onChange: (v: number) => setForm(p => ({ ...p, poidsCompletude: v })) },
  ];

  return (
    <div style={{ maxWidth: 860 }}>

      {/* ── En-tête compact ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Sliders size={18} style={{ color: 'var(--gold)' }} />
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Configuration du scoring IA</h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          
            {config?.updatedAt && (
              <span style={{ marginLeft: 12, opacity: 0.7 }}>
                · Mis à jour le {new Date(config.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            )}
          </p>
        </div>

        {/* Actions en haut à droite */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button variant="ghost" onClick={fetchConfig} disabled={saving} size="sm">
            <RefreshCw size={13} /> Réinitialiser
          </Button>
          <Button variant="primary" onClick={sauvegarder} disabled={saving || !sommeOk} size="sm">
            <Save size={13} />
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {error   && <div style={{ marginBottom: 12 }}><Alert variant="red">{error}</Alert></div>}
      {success && <div style={{ marginBottom: 12 }}><Alert variant="green">{success}</Alert></div>}

      {/* ── Layout 2 colonnes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start' }}>

        {/* Colonne gauche — Poids */}
        <Card>
          <CardBody style={{ padding: '16px 20px' }}>
            {/* Barre de statut somme */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 6,
              marginBottom: 8,
              background: sommeOk ? 'rgba(90,122,58,0.08)' : 'rgba(220,38,38,0.07)',
              border: `1px solid ${sommeOk ? 'var(--green, #5A7A3A)' : '#DC2626'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={13} style={{ color: sommeOk ? 'var(--green, #5A7A3A)' : '#DC2626' }} />
                <span style={{ fontSize: 12, fontWeight: 500 }}>
                  Somme : <strong>{(somme * 100).toFixed(1)}%</strong>
                  {sommeOk
                    ? <span style={{ color: 'var(--green, #5A7A3A)', marginLeft: 8 }}>✓ Valide</span>
                    : <span style={{ color: '#DC2626', marginLeft: 8 }}>⚠ Doit être 100%</span>
                  }
                </span>
              </div>
              {!sommeOk && (
                <button
                  onClick={normaliser}
                  style={{
                    fontSize: 11, fontWeight: 600,
                    background: 'none', border: '1px solid #DC2626',
                    color: '#DC2626', borderRadius: 4,
                    padding: '2px 8px', cursor: 'pointer',
                  }}
                >
                  Normaliser
                </button>
              )}
            </div>

            {/* Barre visuelle de répartition */}
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 16, gap: 1 }}>
              {criteria.map((c, i) => (
                <div
                  key={c.key}
                  style={{
                    flex: c.value,
                    background: CRITERION_COLORS[i],
                    transition: 'flex 0.15s',
                    minWidth: c.value > 0 ? 2 : 0,
                  }}
                  title={`${c.label} : ${Math.round(c.value * 100)}%`}
                />
              ))}
            </div>

            {/* Sliders */}
            {criteria.map((c, i) => (
              <SliderRow
                key={c.key}
                label={c.label}
                description={c.description}
                value={c.value}
                onChange={c.onChange}
                color={CRITERION_COLORS[i]}
                index={i}
              />
            ))}
          </CardBody>
        </Card>

        {/* Colonne droite — Seuil + résumé */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Seuil de matching */}
          <Card>
            <CardBody style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Target size={14} style={{ color: 'var(--gold)' }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Seuil de matching</span>
              </div>

              {/* Valeur centrale */}
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: 'var(--gold)', lineHeight: 1, letterSpacing: '-2px' }}>
                  {form.seuilMatching}
                  <span style={{ fontSize: 20, fontWeight: 500, opacity: 0.7 }}>%</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  score minimum pour matching inverse
                </div>
              </div>

              {/* Slider */}
              <div style={{ position: 'relative' }}>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-raised, #f0ede6)', overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{
                    height: '100%',
                    width: `${form.seuilMatching}%`,
                    background: 'var(--gold)',
                    borderRadius: 3,
                    transition: 'width 0.1s',
                  }} />
                </div>
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={form.seuilMatching}
                  onChange={e => setForm(p => ({ ...p, seuilMatching: Number(e.target.value) }))}
                  style={{ position: 'absolute', top: -2, left: 0, width: '100%', height: 10, opacity: 0, cursor: 'pointer', margin: 0 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Résumé des poids */}
          <Card>
            <CardBody style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Zap size={14} style={{ color: 'var(--gold)' }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Résumé</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {criteria.map((c, i) => (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: CRITERION_COLORS[i], flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.label}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: CRITERION_COLORS[i], fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(c.value * 100)}%
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border, rgba(0,0,0,0.08))', marginTop: 4, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sommeOk ? 'var(--green, #5A7A3A)' : '#DC2626' }}>
                    {(somme * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

        </div>
      </div>
    </div>
  );
}