// frontend/src/pages/CandidatFormPage.tsx

import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Upload, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { FormGroup, FormLabel, FormRow, Input } from '@/components/ui/FormField';
import api from '@/services/api';

interface OffrePublic {
  id: string;
  reference: string;
  intitule: string;
  description: string;
  profilRecherche: string;
  competences: string[];
  fourchetteSalariale: string;
  typeContrat: string;
}

export function CandidatFormPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('ref');
  
  const [offre, setOffre] = useState<OffrePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showIA, setShowIA] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consentRGPD, setConsentRGPD] = useState(false);
  const [consentIA, setConsentIA] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Formulaire
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: ''
  });

  // IA Feedback state
  const [skillsMatch, setSkillsMatch] = useState<string[]>([]);
  const [skillsMiss, setSkillsMiss] = useState<string[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    chargerOffre();
  }, [token]);

  const chargerOffre = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/offres/public/${token}`);
      setOffre(response.data.data.offre);
      setError(null);
    } catch (err: any) {
      console.error('Erreur chargement offre:', err);
      setError(err.response?.data?.message || 'Offre non trouvee');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFileName(e.target.files[0].name);
      setFileUploaded(true);
      
      // Simulation analyse IA avec les competences de l'offre
      setTimeout(() => {
        if (offre) {
          const detected = ['React', 'TypeScript', 'Node.js', 'Git'];
          const missing = offre.competences.filter(c => !detected.includes(c));
          const calculatedScore = Math.floor(Math.random() * 30) + 60;
          
          setSkillsMatch(detected);
          setSkillsMiss(missing);
          setScore(calculatedScore);
          setShowIA(true);
        }
      }, 1200);
    }
  };

  const handleSubmit = () => {
    if (!consentRGPD) {
      alert('Veuillez accepter le consentement RGPD');
      return;
    }
    if (!fileUploaded) {
      alert('Veuillez uploader votre CV');
      return;
    }
    
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  const handleCopyLien = () => {
    const lien = window.location.href;
    navigator.clipboard.writeText(lien);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Chargement de l'offre...</div>
      </div>
    );
  }

  if (error || !offre) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert variant="red">
          {error || 'Offre non disponible'}
        </Alert>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16 }}>K</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Kilani Groupe</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Formulaire de candidature</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopyLien}>
          <Copy size={14} />
          {copied ? 'Copie !' : 'Partager'}
        </Button>
      </header>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 680 }}>
          {/* Title */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Postuler — {offre.intitule}</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge variant="gold">{offre.typeContrat}</Badge>
              <Badge variant="umber">Tunis, Siege</Badge>
              <Badge variant="gold">Ref. {offre.reference}</Badge>
            </div>
          </div>

          {/* Description offre */}
          <Card style={{ marginBottom: 16 }}>
            <CardHeader><CardTitle>Description du poste</CardTitle></CardHeader>
            <CardBody>
              <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {offre.description || 'Aucune description disponible'}
              </div>
              {offre.fourchetteSalariale && (
                <div style={{ marginTop: 12, padding: 10, background: 'var(--gold-light)', borderRadius: 8 }}>
                  <strong>Salaire proposé :</strong> {offre.fourchetteSalariale}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Step 1: CV */}
          <Card style={{ marginBottom: 16 }}>
            <CardHeader><CardTitle>1. Votre CV</CardTitle></CardHeader>
            <CardBody>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${fileUploaded ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer',
                  background: fileUploaded ? 'rgba(90,122,58,0.1)' : 'transparent',
                  transition: 'all .18s',
                }}
              >
                {fileUploaded ? (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                    <div style={{ fontWeight: 600 }}>{fileName}</div>
                    {!showIA && <div style={{ fontSize: 12, marginTop: 4 }}>Analyse IA en cours...</div>}
                  </>
                ) : (
                  <>
                    <Upload size={32} style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Deposer votre CV ici</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF ou DOCX · Max 5 Mo</div>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={handleFile} />
              </div>

              {/* IA Feedback */}
              {showIA && (
                <div style={{ marginTop: 16, background: 'linear-gradient(135deg,#1D2235,#252B42)', borderRadius: 12, padding: 20, color: '#fff' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Analyse IA - Resultat en temps reel</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--gold-light)', lineHeight: 1 }}>{score}<span style={{ fontSize: 24 }}>%</span></div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>Score de matching</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span>Score experience</span><span>{Math.min(95, score + 10)}%</span></div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,.15)', borderRadius: 10 }}>
                          <div style={{ width: `${Math.min(95, score + 10)}%`, height: '100%', background: 'var(--gold-light)', borderRadius: 10 }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span>Adequation profil</span><span>{score}%</span></div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,.15)', borderRadius: 10 }}>
                          <div style={{ width: `${score}%`, height: '100%', background: '#6EE7B7', borderRadius: 10 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>Competences detectees</div>
                    <div>
                      {skillsMatch.map(s => (
                        <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(45,155,111,.2)', color: '#6EE7B7', padding: '3px 9px', borderRadius: 20, fontSize: 11, margin: '2px 3px' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>Competences recommandees</div>
                    <div>
                      {skillsMiss.map(s => (
                        <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(217,119,6,.2)', color: '#FCD34D', padding: '3px 9px', borderRadius: 20, fontSize: 11, margin: '2px 3px' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 12, color: 'rgba(255,255,255,.55)', fontStyle: 'italic' }}>
                    Conseil : Mettez en avant vos experiences pertinentes et les competences recommandees ci-dessus.
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Step 2: Info personnelles */}
          <Card style={{ marginBottom: 16 }}>
            <CardHeader><CardTitle>2. Informations personnelles</CardTitle></CardHeader>
            <CardBody>
              <FormRow>
                <FormGroup>
                  <FormLabel required>Prenom</FormLabel>
                  <Input placeholder="Votre prenom" value={formData.prenom} onChange={(e) => setFormData({...formData, prenom: e.target.value})} />
                </FormGroup>
                <FormGroup>
                  <FormLabel required>Nom</FormLabel>
                  <Input placeholder="Votre nom" value={formData.nom} onChange={(e) => setFormData({...formData, nom: e.target.value})} />
                </FormGroup>
              </FormRow>
              <FormRow>
                <FormGroup>
                  <FormLabel required>Email</FormLabel>
                  <Input type="email" placeholder="votre@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </FormGroup>
                <FormGroup>
                  <FormLabel required>Telephone</FormLabel>
                  <Input type="tel" placeholder="+216 XX XXX XXX" value={formData.telephone} onChange={(e) => setFormData({...formData, telephone: e.target.value})} />
                </FormGroup>
              </FormRow>
            </CardBody>
          </Card>

          {/* Step 3: RGPD */}
          <Card style={{ marginBottom: 24 }}>
            <CardHeader><CardTitle>3. Consentement RGPD</CardTitle></CardHeader>
            <CardBody>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 10 }}>
                <input type="checkbox" id="rgpd1" style={{ marginTop: 2 }} onChange={(e) => setConsentRGPD(e.target.checked)} />
                <label htmlFor="rgpd1" style={{ fontSize: 13, cursor: 'pointer' }}>
                  <strong>Utilisation du CV pour les offres Kilani Groupe</strong> — Votre CV pourra etre analyse par notre IA pour d'autres postes. <span style={{ color: 'var(--red)' }}>Obligatoire</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <input type="checkbox" id="rgpd2" style={{ marginTop: 2 }} onChange={(e) => setConsentIA(e.target.checked)} />
                <label htmlFor="rgpd2" style={{ fontSize: 13, cursor: 'pointer' }}>
                  <strong>Entrainement des modeles IA</strong> — Votre CV (anonymise) peut etre utilise pour ameliorer nos modeles. <em>Optionnel</em>
                </label>
              </div>
            </CardBody>
          </Card>

          {/* Submit */}
          {!submitted ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Envoi en cours...' : <><Check size={15} /> Soumettre ma candidature</>}
              </Button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Un email de confirmation vous sera envoye.</span>
            </div>
          ) : (
            <Alert variant="green">
              <strong>Candidature envoyee !</strong> Reference: <strong>CAND-{Date.now()}</strong>. Un email de confirmation a ete envoye.
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}