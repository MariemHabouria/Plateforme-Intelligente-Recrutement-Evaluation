// frontend/src/components/pages/auth/ChangePasswordPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';

export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { changePassword, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Redirection si l'utilisateur n'a pas besoin de changer son mot de passe
  useEffect(() => {
    if (user && !user.mustChangePassword && !redirecting) {
      navigate('/dashboard');
    }
  }, [user, navigate, redirecting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Tous les champs sont requis');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      setLoading(true);
      await changePassword(currentPassword, newPassword);
      setSuccess('Mot de passe changé avec succès ! Redirection...');
      setRedirecting(true);
      
      // Redirection après 2 secondes
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors du changement');
      setRedirecting(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E1A0E 0%, #2A2413 100%)'
    }}>
      <div style={{
        width: 480,
        padding: 40,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: 'var(--gold)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 800,
            color: '#1E1A0E',
            marginBottom: 16
          }}>
            K
          </div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Changement de mot de passe</h1>
          <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>
            {user?.prenom} {user?.nom}, changez votre mot de passe temporaire
          </p>
        </div>

        {error && <Alert variant="red" style={{ marginBottom: 20 }}>{error}</Alert>}
        {success && <Alert variant="green" style={{ marginBottom: 20 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14
              }}
              required
              disabled={loading || redirecting}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14
              }}
              required
              disabled={loading || redirecting}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              Minimum 8 caractères avec majuscule, minuscule, chiffre et symbole
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14
              }}
              required
              disabled={loading || redirecting}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || redirecting}
            style={{ width: '100%', padding: 14 }}
          >
            {loading ? 'Changement en cours...' : redirecting ? 'Redirection...' : 'Changer le mot de passe'}
          </Button>
        </form>
      </div>
    </div>
  );
};