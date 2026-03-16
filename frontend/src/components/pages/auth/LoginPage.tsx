import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login(email, password);
      if (result?.forcePasswordChange) {
        window.location.href = '/change-password';
      }
    } catch (err: any) {
      setError(err.message || 'Email ou mot de passe incorrect');
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
        width: 420, 
        padding: 40,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Logo */}
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
          <h1 style={{ fontSize: 24, margin: 0, color: '#1E1A0E' }}>Kilani RH</h1>
          <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>
            Plateforme intelligente de recrutement
          </p>
          <p style={{ 
            color: 'var(--gold)', 
            fontSize: 12, 
            marginTop: 8,
            fontWeight: 500,
            background: 'var(--gold-pale)',
            padding: '4px 12px',
            borderRadius: 20,
            display: 'inline-block'
          }}>
            🔐 Accès réservé au personnel interne
          </p>
        </div>

        {error && (
          <div style={{ 
            background: '#ffebee', 
            color: '#c62828', 
            padding: 12, 
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 20,
            borderLeft: '3px solid #c62828'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ 
              fontSize: 12, 
              fontWeight: 600, 
              display: 'block', 
              marginBottom: 6,
              color: '#333'
            }}>
              Email professionnel
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@kilani.tn"
              style={{ 
                width: '100%', 
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--gold)'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
              required
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ 
              fontSize: 12, 
              fontWeight: 600, 
              display: 'block', 
              marginBottom: 6,
              color: '#333'
            }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ 
                width: '100%', 
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--gold)'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: 14,
              background: 'var(--gold)',
              color: '#1E1A0E',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginBottom: 20
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={{ 
          textAlign: 'center', 
          padding: '12px 0',
          borderTop: '1px solid #eee',
          borderBottom: '1px solid #eee'
        }}>
          <span style={{ fontSize: 13, color: '#666' }}>
            Vous êtes candidat ?{' '}
          </span>
          <a 
            href="/candidature" 
            style={{ 
              color: 'var(--gold)', 
              fontSize: 13, 
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              background: 'var(--gold-pale)',
              borderRadius: 20,
              marginLeft: 8
            }}
          >
            📝 Postuler ici
          </a>
        </div>

        <p style={{ 
          fontSize: 11, 
          color: '#999', 
          textAlign: 'center', 
          marginTop: 20 
        }}>
          © 2026 Kilani Groupe - Plateforme RH Intelligente
        </p>
      </div>
    </div>
  );
};