import { useState, useRef } from 'react'
import { Upload, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { FormGroup, FormLabel, FormRow, Input } from '@/components/ui/FormField'
import { ScoreBar } from '@/components/ui/ScoreBar'

export function CandidatFormPage() {
  const [fileUploaded, setFileUploaded] = useState(false)
  const [fileName, setFileName] = useState('')
  const [showIA, setShowIA] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFileName(e.target.files[0].name)
      setFileUploaded(true)
      setTimeout(() => setShowIA(true), 1200)
    }
  }

  const handleSubmit = () => {
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); setSubmitted(true) }, 1000)
  }

  const skills_match = ['React', 'Node.js', 'Docker', 'PostgreSQL']
  const skills_miss  = ['Agile/Scrum certifié', 'NestJS']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16 }}>K</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Kilani Groupe</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Formulaire de candidature</div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 680 }}>
          {/* Title */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Postuler — Chef de projet IT</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge variant="gold">CDI</Badge>
              <Badge variant="gray">📍 Tunis, Siège</Badge>
              <Badge variant="gold">Réf. OFF-2026-011</Badge>
            </div>
          </div>

          {/* Step 1: CV */}
          <Card style={{ marginBottom: 16 }}>
            <CardHeader><CardTitle>1. Votre CV</CardTitle></CardHeader>
            <CardBody>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${fileUploaded ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer',
                  background: fileUploaded ? 'var(--green-bg)' : 'transparent',
                  color: fileUploaded ? 'var(--green)' : 'var(--text-muted)',
                  transition: 'all .18s',
                }}
                onMouseEnter={e => { if (!fileUploaded) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLElement).style.background = 'var(--gold-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--gold)' } }}
                onMouseLeave={e => { if (!fileUploaded) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' } }}
              >
                {fileUploaded
                  ? <><div style={{ fontSize: 28, marginBottom: 8 }}>✅</div><div style={{ fontWeight: 600 }}>{fileName}</div>{!showIA && <div style={{ fontSize: 12, marginTop: 4 }}>Analyse IA en cours…</div>}</>
                  : <><Upload size={32} style={{ margin: '0 auto 10px' }} /><div style={{ fontWeight: 600, marginBottom: 4 }}>Déposer votre CV ici</div><div style={{ fontSize: 12 }}>PDF ou DOCX · Max 5 Mo</div></>
                }
                <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={handleFile} />
              </div>

              {/* IA Feedback */}
              {showIA && (
                <div style={{ marginTop: 16, background: 'linear-gradient(135deg,#1D2235,#252B42)', borderRadius: 12, padding: 20, color: '#fff' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>🤖 Analyse IA — Résultat en temps réel</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--gold-light)', lineHeight: 1 }}>78<span style={{ fontSize: 24 }}>%</span></div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>Score de matching</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}><span>Score expérience</span><span>85%</span></div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,.15)', borderRadius: 10 }}><div style={{ width: '85%', height: '100%', background: 'var(--gold-light)', borderRadius: 10 }} /></div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}><span>Adéquation profil</span><span>72%</span></div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,.15)', borderRadius: 10 }}><div style={{ width: '72%', height: '100%', background: '#6EE7B7', borderRadius: 10 }} /></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>Compétences détectées ✓</div>
                    <div>{skills_match.map(s => <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(45,155,111,.2)', color: '#6EE7B7', border: '1px solid rgba(45,155,111,.3)', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, margin: '2px 3px 2px 0' }}>{s}</span>)}</div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>Compétences manquantes</div>
                    <div>{skills_miss.map(s => <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(217,119,6,.2)', color: '#FCD34D', border: '1px solid rgba(217,119,6,.3)', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, margin: '2px 3px 2px 0' }}>{s}</span>)}</div>
                  </div>
                  <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 12, color: 'rgba(255,255,255,.55)', fontStyle: 'italic' }}>
                    💡 Conseil : Précisez vos projets concrets en gestion d'équipe. Mentionnez NestJS si vous le maîtrisez.
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Step 2: Info */}
          <Card style={{ marginBottom: 16 }}>
            <CardHeader><CardTitle>2. Informations personnelles</CardTitle></CardHeader>
            <CardBody>
              <FormRow>
                <FormGroup><FormLabel required>Prénom</FormLabel><Input placeholder="Votre prénom" /></FormGroup>
                <FormGroup><FormLabel required>Nom</FormLabel><Input placeholder="Nom de famille" /></FormGroup>
              </FormRow>
              <FormRow>
                <FormGroup><FormLabel required>Email</FormLabel><Input type="email" placeholder="votre@email.com" /></FormGroup>
                <FormGroup><FormLabel required>Téléphone</FormLabel><Input type="tel" placeholder="+216 XX XXX XXX" /></FormGroup>
              </FormRow>
            </CardBody>
          </Card>

          {/* Step 3: RGPD */}
          <Card style={{ marginBottom: 24 }}>
            <CardHeader><CardTitle>3. Consentement RGPD</CardTitle></CardHeader>
            <CardBody>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 10 }}>
                <input type="checkbox" id="rgpd1" style={{ marginTop: 2, accentColor: 'var(--gold)' }} />
                <label htmlFor="rgpd1" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <strong>Utilisation du CV pour les offres Kilani Groupe</strong> — Votre CV pourra être analysé par notre IA pour d'autres postes correspondant à votre profil. <span style={{ color: 'var(--red)' }}>Obligatoire</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <input type="checkbox" id="rgpd2" style={{ marginTop: 2, accentColor: 'var(--gold)' }} />
                <label htmlFor="rgpd2" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <strong>Entraînement des modèles IA</strong> — Votre CV (anonymisé) peut être utilisé pour améliorer nos modèles de matching. <em>Optionnel</em>
                </label>
              </div>
            </CardBody>
          </Card>

          {/* Submit */}
          {!submitted ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 24px', fontSize: 14 }}>
                {submitting ? 'Envoi en cours…' : <><Check size={15} />Soumettre ma candidature</>}
              </Button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Un email de confirmation vous sera envoyé avec votre numéro de suivi.</span>
            </div>
          ) : (
            <Alert variant="green">
              ✅ <strong>Candidature envoyée !</strong> Référence : <strong>CAND-2026-089</strong>. Un email de confirmation a été envoyé à votre adresse.
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}
