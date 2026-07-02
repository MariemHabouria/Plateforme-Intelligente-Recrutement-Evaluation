// frontend/src/components/pages/candidat/CandidatFormPage.tsx

import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Upload, Check, Copy } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Card, CardHeader, CardTitle, CardBody } from '../../ui/Card';
import { Alert } from '../../ui/Alert';
import { FormGroup, FormLabel, FormRow, Input } from '../../ui/FormField';
import { offreService } from '../../../services/offre.service';
import api from '../../../services/api';

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
  
  const [offre, setOffre] = useState<OffrePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
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

  useEffect(() => {
    chargerOffre();
  }, [token]);

  const chargerOffre = async () => {
    try {
      setLoading(true);
      const response = await offreService.getOffreByToken(token!);
      setOffre(response.data.offre);
      setError(null);
    } catch (err: any) {
      console.error('Erreur chargement offre:', err);
      setError(err.response?.data?.message || 'Offre non trouvee');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setCvFile(file);
      setFileUploaded(true);
    }
  };

  const handleSubmit = async () => {
    if (!consentRGPD) {
      alert('Veuillez accepter le consentement RGPD');
      return;
    }
    if (!fileUploaded || !cvFile) {
      alert('Veuillez uploader votre CV');
      return;
    }
    if (!formData.prenom || !formData.nom || !formData.email) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // 1. Upload du CV
      const uploadFormData = new FormData();
      uploadFormData.append('cv', cvFile);
      
      const uploadResponse = await api.post('/upload/cv', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const cvUrl = uploadResponse.data.cvUrl;
      
      // 2. Soumission de la candidature
      await api.post(`/candidatures/public/${token}`, {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        cvUrl,
        consentementRGPD: consentRGPD,
        consentementIA: consentIA
      });
      
      setSubmitted(true);
    } catch (err: any) {
      console.error('Erreur soumission:', err);
      alert(err.response?.data?.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
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
                   
                    <div style={{ fontWeight: 600 }}>{fileName}</div>
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
                <input type="checkbox" id="rgpd1" style={{ marginTop: 2 }} checked={consentRGPD} onChange={(e) => setConsentRGPD(e.target.checked)} />
                <label htmlFor="rgpd1" style={{ fontSize: 13, cursor: 'pointer' }}>
                  <strong>Utilisation du CV pour les offres Kilani Groupe</strong> — Votre CV pourra etre analyse par notre IA pour d'autres postes. <span style={{ color: 'var(--red)' }}>Obligatoire</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <input type="checkbox" id="rgpd2" style={{ marginTop: 2 }} checked={consentIA} onChange={(e) => setConsentIA(e.target.checked)} />
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
              <strong>Candidature envoyee !</strong> Un email de confirmation a ete envoye.
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}