// frontend/src/components/pages/candidat/FicheRenseignement.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Check, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '../../ui/Card';
import { Alert } from '../../ui/Alert';
import api from '../../../services/api';

export function FicheRenseignement() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [candidat, setCandidat] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    // INFORMATIONS PERSONNELLES
    civilite: '' as 'Mr' | 'Mme' | 'Melle' | '',
    situationFamiliale: '' as 'Celibataire' | 'Marie(e)' | 'Divorce(e)' | 'Veuf' | '',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: '',
    adresse: '',
    telephone: '',
    mobile: '',
    email: '',
    nomConjoint: '',
    autresPersonnesACharge: '',

    // FORMATION
    formationBase: {
      baccalaureat: { specialite: '', etablissement: '', diplome: '', date: '', mention: '' },
      diplomeUniversitaire: { specialite: '', etablissement: '', diplome: '', date: '', mention: '' },
      master: { specialite: '', etablissement: '', diplome: '', date: '', mention: '' },
      doctorat: { specialite: '', etablissement: '', diplome: '', date: '', mention: '' },
    },
    autresFormations: Array(6).fill({ formation: '', etablissement: '', duree: '', diplome: '', date: '' }),

    // EXPERIENCE PROFESSIONNELLE
    experiences: Array(6).fill({ fonction: '', duree: '', etablissement: '', salaire: '' }),

    // AUTRES INFORMATIONS
    langues: {
      arabe: '' as 'Faible' | 'Moyenne' | 'Bonne' | 'Maitrise' | '',
      francais: '' as 'Faible' | 'Moyenne' | 'Bonne' | 'Maitrise' | '',
      anglais: '' as 'Faible' | 'Moyenne' | 'Bonne' | 'Maitrise' | '',
      allemand: '' as 'Faible' | 'Moyenne' | 'Bonne' | 'Maitrise' | '',
      italien: '' as 'Faible' | 'Moyenne' | 'Bonne' | 'Maitrise' | '',
      autres: '',
    },
    permisConduire: '',
    meilleureFonctionProjet: '',
    fonctionSouhaitee: '',
    piecesFournies: '',
    salaireSouhaite: '',
    valideSincerite: false,
  });

  useEffect(() => {
    chargerFiche();
  }, [token]);

  const chargerFiche = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/candidatures/fiche-renseignement/${token}`);
      setCandidat(response.data.data.candidat);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fiche invalide ou expiree');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validation des champs obligatoires
    if (!form.civilite) errors.civilite = 'La civilite est requise';
    if (!form.situationFamiliale) errors.situationFamiliale = 'La situation familiale est requise';
    if (!form.dateNaissance) errors.dateNaissance = 'La date de naissance est requise';
    if (!form.lieuNaissance) errors.lieuNaissance = 'Le lieu de naissance est requis';
    if (!form.nationalite) errors.nationalite = 'La nationalite est requise';
    if (!form.adresse) errors.adresse = 'L\'adresse est requise';
    if (!form.mobile) errors.mobile = 'Le numero de mobile est requis';
    
    // Validation email
    if (!form.email) {
      errors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = 'Email invalide';
    }

    // Validation téléphone
    if (form.telephone && !/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3,4}[-\s\.]?[0-9]{3,4}$/.test(form.telephone)) {
      errors.telephone = 'Numero de telephone invalide';
    }

    if (form.mobile && !/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3,4}[-\s\.]?[0-9]{3,4}$/.test(form.mobile)) {
      errors.mobile = 'Numero de mobile invalide';
    }

    // Validation salaire
    if (form.salaireSouhaite) {
      const salaire = parseFloat(form.salaireSouhaite.replace(/[^0-9]/g, ''));
      if (isNaN(salaire) || salaire < 0) {
        errors.salaireSouhaite = 'Salaire invalide';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Veuillez corriger les erreurs dans le formulaire');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!form.valideSincerite) {
      setError('Vous devez certifier la sincerite des renseignements fournis.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.post(`/candidatures/fiche-renseignement/${token}/soumettre`, { data: form });
      setSuccess(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi de la fiche');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement de la fiche...</div>;
if (loading) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      Chargement de la fiche...
    </div>
  );
}

if (success) {
  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div
        style={{
          width: 60,
          height: 60,
          background: '#5a7a3a',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}
      >
        <Check size={30} color="white" />
      </div>

      <h2>Fiche envoyée avec succès !</h2>
      <p>
        Merci {candidat?.prenom}, nous vous contacterons prochainement.
      </p>
    </div>
  );
}
  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ width: 60, height: 60, background: '#5a7a3a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Check size={30} color="white" />
        </div>
        <h2>Fiche envoyee avec succes !</h2>
        <p>Merci {candidat?.prenom}, nous vous contacterons prochainement.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Fiche de Renseignement</h1>
      <p style={{ marginBottom: 30, fontSize: 18 }}>
        {candidat?.prenom} {candidat?.nom} — {candidat?.poste}
      </p>

      {Object.keys(validationErrors).length > 0 && (
        <Alert variant="red" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <strong>Veuillez corriger les erreurs suivantes :</strong>
          </div>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            {Object.values(validationErrors).map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* INFORMATIONS PERSONNELLES */}
        <Card style={{ marginBottom: 24 }}>
          <CardHeader><CardTitle>INFORMATIONS PERSONNELLES</CardTitle></CardHeader>
          <CardBody>
            <div style={{ marginBottom: 20 }}>
              <strong>Civilité :</strong> <span style={{ color: 'red' }}>*</span>
              <div style={{ marginTop: 8 }}>
                {['Mr', 'Mme', 'Melle'].map((c) => (
                  <label key={c} style={{ marginRight: 15, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="civilite" 
                      checked={form.civilite === c} 
                      onChange={() => handleChange('civilite', c)} 
                    /> {c}
                  </label>
                ))}
              </div>
              {validationErrors.civilite && <span style={{ color: 'red', fontSize: 12 }}>{validationErrors.civilite}</span>}
            </div>

            <div style={{ marginBottom: 20 }}>
              <strong>Situation familiale :</strong> <span style={{ color: 'red' }}>*</span>
              <div style={{ marginTop: 8 }}>
                {['Celibataire', 'Marie(e)', 'Divorce(e)', 'Veuf'].map((s) => (
                  <label key={s} style={{ marginRight: 15, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="situation" 
                      checked={form.situationFamiliale === s} 
                      onChange={() => handleChange('situationFamiliale', s)} 
                    /> {s}
                  </label>
                ))}
              </div>
              {validationErrors.situationFamiliale && <span style={{ color: 'red', fontSize: 12 }}>{validationErrors.situationFamiliale}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div>
                <label>Date de naissance <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="date" 
                  style={{ ...inputStyle, borderColor: validationErrors.dateNaissance ? 'red' : '#ccc' }}
                  onChange={(e) => handleChange('dateNaissance', e.target.value)} 
                />
                {validationErrors.dateNaissance && <span style={{ color: 'red', fontSize: 11 }}>{validationErrors.dateNaissance}</span>}
              </div>
              <div>
                <label>Lieu de naissance <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  placeholder="Ville, pays" 
                  style={{ ...inputStyle, borderColor: validationErrors.lieuNaissance ? 'red' : '#ccc' }}
                  onChange={(e) => handleChange('lieuNaissance', e.target.value)} 
                />
                {validationErrors.lieuNaissance && <span style={{ color: 'red', fontSize: 11 }}>{validationErrors.lieuNaissance}</span>}
              </div>
              <div>
                <label>Nationalite <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  placeholder="Tunisienne, Francaise..." 
                  style={{ ...inputStyle, borderColor: validationErrors.nationalite ? 'red' : '#ccc' }}
                  onChange={(e) => handleChange('nationalite', e.target.value)} 
                />
                {validationErrors.nationalite && <span style={{ color: 'red', fontSize: 11 }}>{validationErrors.nationalite}</span>}
              </div>
              <div>
                <label>Adresse complete <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  placeholder="Numero, rue, code postal, ville" 
                  style={{ ...inputStyle, borderColor: validationErrors.adresse ? 'red' : '#ccc' }}
                  onChange={(e) => handleChange('adresse', e.target.value)} 
                />
                {validationErrors.adresse && <span style={{ color: 'red', fontSize: 11 }}>{validationErrors.adresse}</span>}
              </div>
              <div>
                <label>Telephone fixe</label>
                <input 
                  type="tel" 
                  placeholder="+216 XX XXX XXX" 
                  style={{ ...inputStyle, borderColor: validationErrors.telephone ? 'red' : '#ccc' }}
                  onChange={(e) => handleChange('telephone', e.target.value)} 
                />
                {validationErrors.telephone && <span style={{ color: 'red', fontSize: 11 }}>{validationErrors.telephone}</span>}
              </div>
              <div>
                <label>Mobile <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="tel" 
                  placeholder="+216 XX XXX XXX" 
                  style={{ ...inputStyle, borderColor: validationErrors.mobile ? 'red' : '#ccc' }}
                  onChange={(e) => handleChange('mobile', e.target.value)} 
                />
                {validationErrors.mobile && <span style={{ color: 'red', fontSize: 11 }}>{validationErrors.mobile}</span>}
              </div>
              <div>
                <label>Email <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="email" 
                  placeholder="votre@email.com" 
                  style={{ ...inputStyle, borderColor: validationErrors.email ? 'red' : '#ccc' }}
                  onChange={(e) => handleChange('email', e.target.value)} 
                />
                {validationErrors.email && <span style={{ color: 'red', fontSize: 11 }}>{validationErrors.email}</span>}
              </div>
              <div>
                <label>Nom du conjoint (si marie(e))</label>
                <input 
                  type="text" 
                  placeholder="Nom et prenom" 
                  style={inputStyle}
                  onChange={(e) => handleChange('nomConjoint', e.target.value)} 
                />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <label>Autres personnes a charge :</label>
              <textarea 
                style={inputStyle} 
                rows={2} 
                placeholder="Precisez..." 
                onChange={(e) => handleChange('autresPersonnesACharge', e.target.value)} 
              />
            </div>
          </CardBody>
        </Card>

        {/* AUTRES INFORMATIONS */}
        <Card>
          <CardHeader><CardTitle>AUTRES INFORMATIONS</CardTitle></CardHeader>
          <CardBody>
            <h4 style={{ marginBottom: 12 }}>Connaissance linguistique</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr)', gap: 8, marginBottom: 24, overflowX: 'auto' }}>
              {['Arabe', 'Francais', 'Anglais', 'Allemand', 'Italien'].map((lang, i) => (
                <div key={i} style={{ display: 'contents' }}>
                  <strong>{lang}</strong>
                  {['Faible', 'Moyenne', 'Bonne', 'Maitrise'].map((niveau) => (
                    <label key={niveau} style={{ fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`lang_${lang}`}
                        onChange={() => setForm({ ...form, langues: { ...form.langues, [lang.toLowerCase()]: niveau as any } })}
                      /> {niveau}
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label>Autres langues (a preciser) :</label>
              <input type="text" style={inputStyle} onChange={(e) => setForm({ ...form, langues: { ...form.langues, autres: e.target.value } })} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label>Avez-vous un permis de conduire ?</label>
              <input type="text" style={inputStyle} placeholder="Oui / Non + categorie" onChange={(e) => handleChange('permisConduire', e.target.value)} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label>Parmi tout ce que vous avez fait, quelle fonction et quel projet avez-vous le mieux reussi ?</label>
              <textarea rows={3} style={inputStyle} onChange={(e) => handleChange('meilleureFonctionProjet', e.target.value)} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label>Par quelle fonction dans l'entreprise seriez-vous interesse(e) ?</label>
              <textarea rows={2} style={inputStyle} onChange={(e) => handleChange('fonctionSouhaitee', e.target.value)} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label>Pieces fournies a l'appui de votre candidature :</label>
              <textarea rows={2} style={inputStyle} placeholder="CV, diplomes, attestations..." onChange={(e) => handleChange('piecesFournies', e.target.value)} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label><strong>Salaire souhaite :</strong></label>
              <input 
                type="text" 
                style={{ ...inputStyle, borderColor: validationErrors.salaireSouhaite ? 'red' : '#ccc' }}
                placeholder="Ex: 2500 TND" 
                onChange={(e) => handleChange('salaireSouhaite', e.target.value)} 
              />
              {validationErrors.salaireSouhaite && <span style={{ color: 'red', fontSize: 11 }}>{validationErrors.salaireSouhaite}</span>}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 500, marginBottom: 20, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.valideSincerite}
                onChange={(e) => handleChange('valideSincerite', e.target.checked)}
              />
              Je certifie la sincerite des renseignements indiques ci-dessus
            </label>

            <Button type="submit" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Envoi en cours...' : 'Envoyer la fiche de renseignement'}
            </Button>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ccc',
  borderRadius: 6,
  fontSize: 15,
  fontFamily: 'inherit',
  boxSizing: 'border-box'
};