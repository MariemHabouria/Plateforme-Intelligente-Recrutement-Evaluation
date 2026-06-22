// frontend/src/components/ui/ShapCard.tsx
// Carte d'explication SHAP-like du score IA
// Utilisée dans CandidatDetailPage.tsx pour remplacer la section "Analyse IA"

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from './Card';
import { ScoreBar } from './ScoreBar';

export interface ShapDetail {
  critere: string;
  score: number;        // 0-100
  poids: number;        // 0-100 (%)
  contribution: number; // points contribués au score final
  positif: boolean;
  details: string;
}

interface Props {
  scoreGlobal: number;
  scoreExperience: number;
  recommandation: string;
  competencesDetectees: string[];
  competencesManquantes: string[];
  shapDetails?: ShapDetail[];
  versionModele?: string;
}

function RecoTag({ label }: { label: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    FORT:   { bg: 'rgba(90,122,58,0.15)',  color: 'var(--green)' },
    BON:    { bg: 'rgba(162,119,38,0.15)', color: 'var(--gold)' },
    MOYEN:  { bg: 'rgba(217,119,6,0.12)',  color: '#D97706' },
    FAIBLE: { bg: 'rgba(220,38,38,0.1)',   color: '#DC2626' },
  };
  const c = colors[label] || colors['FAIBLE'];
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontWeight: 700, fontSize: 13,
      padding: '4px 14px', borderRadius: 20,
    }}>
      {label}
    </span>
  );
}

export function ShapCard({
  scoreGlobal, scoreExperience, recommandation,
  competencesDetectees, competencesManquantes,
  shapDetails = [], versionModele,
}: Props) {
  return (
    <Card style={{ marginBottom: 24 }}>
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <CardTitle>Analyse IA — Matching candidature</CardTitle>
            <CardSubtitle>
              Modèle {versionModele || 'M3-Hybride'} · Score calculé automatiquement
            </CardSubtitle>
          </div>
          <RecoTag label={recommandation} />
        </div>
      </CardHeader>
      <CardBody>

        {/* Scores principaux */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Score global</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--gold)' }}>{scoreGlobal}%</div>
            <ScoreBar label="" value={scoreGlobal} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Score expérience</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--olive)' }}>{scoreExperience}%</div>
            <ScoreBar label="" value={scoreExperience} />
          </div>
        </div>

        {/* Détail SHAP par critère */}
        {shapDetails.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Détail par critère
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shapDetails.map((s) => (
                <div key={s.critere} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8,
                  background: s.positif ? 'rgba(90,122,58,0.06)' : 'rgba(220,38,38,0.05)',
                  border: `1px solid ${s.positif ? 'rgba(90,122,58,0.2)' : 'rgba(220,38,38,0.15)'}`,
                }}>
                  {/* Icône */}
                  <div style={{ flexShrink: 0 }}>
                    {s.positif
                      ? <TrendingUp  size={16} style={{ color: 'var(--green)' }} />
                      : s.score >= 40
                        ? <Minus       size={16} style={{ color: '#D97706' }} />
                        : <TrendingDown size={16} style={{ color: '#DC2626' }} />
                    }
                  </div>

                  {/* Critère + détails */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.critere}</div>
                    {s.details && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {s.details}
                      </div>
                    )}
                  </div>

                  {/* Poids */}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                    poids {s.poids.toFixed(0)}%
                  </div>

                  {/* Barre */}
                  <div style={{ width: 80, flexShrink: 0 }}>
                    <div style={{
                      height: 6, borderRadius: 3,
                      background: 'var(--surface-raised)',
                      position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${s.score}%`,
                        background: s.positif ? 'var(--green)' : '#DC2626',
                        borderRadius: 3,
                      }} />
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{
                    minWidth: 38, textAlign: 'right',
                    fontSize: 13, fontWeight: 700,
                    color: s.positif ? 'var(--green)' : '#DC2626',
                  }}>
                    {s.score.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compétences */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              Compétences détectées ({competencesDetectees.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {competencesDetectees.length === 0
                ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune</span>
                : competencesDetectees.map(c => (
                    <span key={c} style={{
                      background: 'var(--olive-bg)', color: 'var(--olive)',
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500
                    }}>{c}</span>
                  ))
              }
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              Compétences manquantes ({competencesManquantes.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {competencesManquantes.length === 0
                ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune</span>
                : competencesManquantes.map(c => (
                    <span key={c} style={{
                      background: 'rgba(217,119,6,0.1)', color: '#D97706',
                      padding: '3px 10px', borderRadius: 20, fontSize: 11
                    }}>{c}</span>
                  ))
              }
            </div>
          </div>
        </div>

      </CardBody>
    </Card>
  );
}

// ── Comment l'utiliser dans CandidatDetailPage.tsx ──────────────────────────
//
// 1. Importer :
//    import { ShapCard } from '../../ui/ShapCard';
//
// 2. Remplacer la section "Scores IA" existante par :
//
//    <ShapCard
//      scoreGlobal={candidature.scoreGlobal}
//      scoreExperience={candidature.scoreExp}
//      recommandation={candidature.recommandation || 'FAIBLE'}
//      competencesDetectees={candidature.competencesDetectees}
//      competencesManquantes={candidature.competencesManquantes}
//      shapDetails={candidature.shapDetails || []}
//      versionModele={candidature.versionModele}
//    />
//
// 3. Ajouter shapDetails et recommandation dans l'interface CandidatureDetail :
//    shapDetails?: ShapDetail[];
//    recommandation?: string;
//    versionModele?: string;