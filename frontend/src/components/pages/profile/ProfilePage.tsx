import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardBody } from '../../ui/Card';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { Input, FormGroup, FormLabel } from '../../ui/FormField';
import { userService } from '../../../services/user.service';
import type { User, Role } from '../../../types';

export const ProfilePage = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    departement: '',
    poste: ''
  });

  useEffect(() => { fetchUserData(); }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await userService.getCurrentUser();
      const typedUser: User = { ...response, role: response.role as Role };
      setUser(typedUser);
      setFormData({
        nom:         response.nom         || '',
        prenom:      response.prenom      || '',
        email:       response.email       || '',
        telephone:   response.telephone   || '',
        departement: response.departement || '',
        poste:       response.poste       || ''
      });
    } catch (err) {
      setError('Erreur lors du chargement du profil');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      // ✅ Utilise updateOwnProfile (route utilisateur) et non updateUser (route admin)
      await userService.updateOwnProfile({
        nom:         formData.nom,
        prenom:      formData.prenom,
        telephone:   formData.telephone,
        poste:       formData.poste
        // departement n'est pas géré côté backend updateOwnProfile, à ajouter si besoin
      });
      setSuccess('Profil mis à jour avec succès');
      setEditMode(false);
      fetchUserData();
    } catch {
      setError('Erreur lors de la mise à jour');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement du profil...</div>;
  if (!user)   return <div style={{ padding: 40, textAlign: 'center' }}>Utilisateur non trouvé</div>;

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Mon profil</h1>
        <p style={{ color: 'var(--text-muted)' }}>Gérez vos informations personnelles</p>
      </div>

      {error   && <div style={{ marginBottom: 20 }}><Alert variant="red">{error}</Alert></div>}
      {success && <div style={{ marginBottom: 20 }}><Alert variant="green">{success}</Alert></div>}

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          {!editMode && (
            <Button variant="secondary" size="sm" onClick={() => setEditMode(true)}>
              Modifier
            </Button>
          )}
        </CardHeader>
        <CardBody>
          {/* Avatar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 24,
            marginBottom: 32, padding: 24,
            background: 'var(--surface)', borderRadius: 12
          }}>
            <Avatar name={`${user.prenom} ${user.nom}`} size="lg" color="var(--gold)" />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
                {user.prenom} {user.nom}
              </h2>
              <p style={{ margin: '4px 0', color: 'var(--text-muted)' }}>
                {user.poste || 'Poste non défini'} · {user.departement || 'Département non défini'}
              </p>
              <p style={{ margin: '4px 0', color: 'var(--text-muted)' }}>
                Rôle : <strong>{user.role}</strong>
              </p>
              <p style={{ margin: '4px 0', color: 'var(--text-muted)' }}>{user.email}</p>
            </div>
          </div>

          {editMode ? (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <FormGroup>
                  <FormLabel>Prénom</FormLabel>
                  <Input name="prenom" value={formData.prenom} onChange={handleInputChange} placeholder="Votre prénom" />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Nom</FormLabel>
                  <Input name="nom" value={formData.nom} onChange={handleInputChange} placeholder="Votre nom" />
                </FormGroup>
              </div>

              <FormGroup>
                <FormLabel>Email</FormLabel>
                {/* ✅ email en lecture seule, pas de onChange inutile */}
                <Input name="email" type="email" value={formData.email} disabled style={{ background: '#f5f5f5' }} />
                <small style={{ color: 'var(--text-muted)' }}>L'email ne peut pas être modifié</small>
              </FormGroup>

              <FormGroup>
                <FormLabel>Téléphone</FormLabel>
                <Input name="telephone" value={formData.telephone} onChange={handleInputChange} placeholder="+216 XX XXX XXX" />
              </FormGroup>

              <FormGroup>
                <FormLabel>Poste</FormLabel>
                <Input name="poste" value={formData.poste} onChange={handleInputChange} placeholder="ex: Chef de service" />
              </FormGroup>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <Button type="submit" variant="primary">Enregistrer</Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditMode(false);
                    setFormData({
                      nom:         user.nom         || '',
                      prenom:      user.prenom       || '',
                      email:       user.email        || '',
                      telephone:   user.telephone    || '',
                      departement: user.departement  || '',
                      poste:       user.poste        || ''
                    });
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
                padding: 16, background: 'var(--surface)', borderRadius: 8, marginBottom: 16
              }}>
                {[
                  { label: 'Prénom',      value: user.prenom },
                  { label: 'Nom',         value: user.nom },
                  { label: 'Email',       value: user.email },
                  { label: 'Téléphone',   value: user.telephone   || 'Non renseigné' },
                  { label: 'Département', value: user.direction?.nom || 'Non renseigné' },
                  { label: 'Poste',       value: user.poste        || 'Non renseigné' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 8 }}>
                <h3 style={{ fontSize: 14, margin: '0 0 12px 0' }}>Informations de compte</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rôle</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{user.role}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Compte créé le</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dernière connexion</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {user.dernierConnexion
                        ? new Date(user.dernierConnexion).toLocaleDateString('fr-FR')
                        : 'Première connexion'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Statut</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {user.actif ? 'Actif' : 'Inactif'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};