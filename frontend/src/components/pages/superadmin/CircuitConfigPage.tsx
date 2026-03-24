import { useState, useEffect } from 'react';
import { Edit, Save, X, Plus, Trash2, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { Modal } from '../../ui/Modal';
import { Input, FormGroup, FormLabel, FormRow, Select } from '../../ui/FormField';

interface CircuitEtape {
  niveau: number;
  role: string;
  label: string;
  delai: number;
}

interface CircuitConfig {
  id: string;
  type: string;
  nom: string;
  description: string;
  seuilMin: number | null;
  seuilMax: number | null;
  etapes: CircuitEtape[];
  totalEtapes: number;
  delaiParDefaut: number;
  actif: boolean;
}

const ROLES_DISPONIBLES = [
  { value: 'DIRECTEUR', label: 'Directeur', color: '#7A6C3A' },
  { value: 'DRH', label: 'DRH', color: '#6A7A3A' },
  { value: 'DAF', label: 'DAF', color: '#C07820' },
  { value: 'DGA', label: 'DGA', color: '#7A5A3A' },
  { value: 'DG', label: 'DG', color: '#7A5A3A' },
  { value: 'CONSEIL', label: 'Conseil d\'administration', color: '#9A8A50' }
];

export const CircuitConfigPage = () => {
  const [circuits, setCircuits] = useState<CircuitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingCircuit, setEditingCircuit] = useState<CircuitConfig | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCircuit, setNewCircuit] = useState<Partial<CircuitConfig>>({
    type: '',
    nom: '',
    description: '',
    seuilMin: null,
    seuilMax: null,
    etapes: [{ niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 }],
    totalEtapes: 1,
    delaiParDefaut: 48
  });

  useEffect(() => {
    fetchCircuits();
  }, []);

  const fetchCircuits = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/circuits');
      setCircuits(response.data.data);
    } catch (err) {
      setError('Erreur lors du chargement des circuits');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCircuit = async (circuit: CircuitConfig) => {
    try {
      await api.put(`/admin/circuits/${circuit.id}`, circuit);
      setSuccess('Circuit mis à jour avec succès');
      setShowEditModal(false);
      fetchCircuits();
    } catch (err) {
      setError('Erreur lors de la mise à jour');
    }
  };

  const handleCreateCircuit = async () => {
    if (!newCircuit.nom || !newCircuit.type) {
      setError('Nom et type requis');
      return;
    }
    if (!newCircuit.etapes || newCircuit.etapes.length === 0) {
      setError('Au moins une étape est requise');
      return;
    }

    try {
      await api.post('/admin/circuits', {
        ...newCircuit,
        totalEtapes: newCircuit.etapes.length,
        actif: true
      });
      setSuccess('Circuit créé avec succès');
      setShowCreateModal(false);
      setNewCircuit({
        type: '',
        nom: '',
        description: '',
        seuilMin: null,
        seuilMax: null,
        etapes: [{ niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 }],
        totalEtapes: 1,
        delaiParDefaut: 48
      });
      fetchCircuits();
    } catch (err) {
      setError('Erreur lors de la création');
    }
  };

  const handleToggleCircuit = async (id: string, actif: boolean) => {
    try {
      await api.patch(`/admin/circuits/${id}/toggle`, { actif: !actif });
      setSuccess(`Circuit ${!actif ? 'activé' : 'désactivé'} avec succès`);
      fetchCircuits();
    } catch (err) {
      setError('Erreur lors de la modification');
    }
  };

  const handleResetCircuits = async () => {
    if (!confirm('⚠️ Cette action va réinitialiser tous les circuits par défaut. Continuer ?')) return;
    try {
      await api.post('/admin/circuits/reset');
      setSuccess('Circuits réinitialisés avec succès');
      fetchCircuits();
    } catch (err) {
      setError('Erreur lors de la réinitialisation');
    }
  };

  const getSeuilLabel = (circuit: CircuitConfig) => {
    if (circuit.seuilMin === null && circuit.seuilMax === null) return 'Tous budgets';
    if (circuit.seuilMax === null) return `> ${circuit.seuilMin?.toLocaleString()} DT`;
    if (circuit.seuilMin === null) return `< ${circuit.seuilMax?.toLocaleString()} DT`;
    return `${circuit.seuilMin?.toLocaleString()} - ${circuit.seuilMax?.toLocaleString()} DT`;
  };

  const addEtape = () => {
    const newEtapes = [...(editingCircuit?.etapes || newCircuit.etapes || [])];
    newEtapes.push({
      niveau: newEtapes.length + 1,
      role: 'DIRECTEUR',
      label: 'Directeur',
      delai: 48
    });
    if (editingCircuit) {
      setEditingCircuit({ ...editingCircuit, etapes: newEtapes, totalEtapes: newEtapes.length });
    } else {
      setNewCircuit({ ...newCircuit, etapes: newEtapes, totalEtapes: newEtapes.length });
    }
  };

  const removeEtape = (index: number) => {
    const newEtapes = [...(editingCircuit?.etapes || newCircuit.etapes || [])];
    newEtapes.splice(index, 1);
    const renumbered = newEtapes.map((e, i) => ({ ...e, niveau: i + 1 }));
    if (editingCircuit) {
      setEditingCircuit({ ...editingCircuit, etapes: renumbered, totalEtapes: renumbered.length });
    } else {
      setNewCircuit({ ...newCircuit, etapes: renumbered, totalEtapes: renumbered.length });
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;
  }

  return (
    <div className="page-fade">
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            Configuration des circuits de validation
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Définissez les seuils budgétaires et les étapes de validation pour chaque type de poste
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" onClick={handleResetCircuits}>
            <RefreshCw size={14} /> Réinitialiser
          </Button>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} /> Nouveau circuit
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {error && <Alert variant="red" style={{ marginBottom: 20 }}>{error}</Alert>}
      {success && <Alert variant="green" style={{ marginBottom: 20 }}>{success}</Alert>}

      {/* Grille des circuits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        {circuits.map((circuit) => (
          <Card key={circuit.id}>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <CardTitle>{circuit.nom}</CardTitle>
                  <CardSubtitle>{circuit.description}</CardSubtitle>
                </div>
                <Badge variant={circuit.actif ? 'green' : 'red'}>
                  {circuit.actif ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              {/* Seuil budgétaire */}
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Budget annuel</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--gold)' }}>
                  {getSeuilLabel(circuit)}
                </div>
              </div>

              {/* Étapes du circuit */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Circuit ({circuit.totalEtapes} étapes)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {circuit.etapes.map((etape, idx) => (
                    <div key={etape.niveau} style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        background: 'var(--gold-pale)',
                        color: 'var(--gold-deep)',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 500
                      }}>
                        {etape.label}
                      </div>
                      {idx < circuit.etapes.length - 1 && (
                        <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingCircuit(JSON.parse(JSON.stringify(circuit)));
                    setShowEditModal(true);
                  }}
                >
                  <Edit size={14} /> Modifier
                </Button>
                <Button
                  variant={circuit.actif ? 'danger' : 'success'}
                  size="sm"
                  onClick={() => handleToggleCircuit(circuit.id, circuit.actif)}
                >
                  {circuit.actif ? 'Désactiver' : 'Activer'}
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Modal d'édition */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Modifier circuit : ${editingCircuit?.nom}`}
        maxWidth={700}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>Annuler</Button>
            <Button onClick={() => editingCircuit && handleUpdateCircuit(editingCircuit)}>
              Sauvegarder
            </Button>
          </div>
        }
      >
        {editingCircuit && (
          <div style={{ padding: '16px 0' }}>
            <FormGroup>
              <FormLabel>Nom du circuit</FormLabel>
              <Input
                value={editingCircuit.nom}
                onChange={(e) => setEditingCircuit({ ...editingCircuit, nom: e.target.value })}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>Description</FormLabel>
              <Input
                value={editingCircuit.description}
                onChange={(e) => setEditingCircuit({ ...editingCircuit, description: e.target.value })}
              />
            </FormGroup>

            <FormRow>
              <FormGroup>
                <FormLabel>Budget minimum (DT/an)</FormLabel>
                <Input
                  type="number"
                  value={editingCircuit.seuilMin || ''}
                  onChange={(e) => setEditingCircuit({ ...editingCircuit, seuilMin: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0"
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Budget maximum (DT/an)</FormLabel>
                <Input
                  type="number"
                  value={editingCircuit.seuilMax || ''}
                  onChange={(e) => setEditingCircuit({ ...editingCircuit, seuilMax: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Illimité"
                />
              </FormGroup>
            </FormRow>

            <div style={{ marginTop: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <FormLabel>Étapes de validation</FormLabel>
                <Button variant="secondary" size="xs" onClick={addEtape}>
                  <Plus size={12} /> Ajouter une étape
                </Button>
              </div>

              {editingCircuit.etapes.map((etape, index) => (
                <div key={index} style={{ marginBottom: 12, padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 40, fontWeight: 600 }}>Étape {etape.niveau}</div>
                    <div style={{ flex: 1 }}>
                      <select
                        value={etape.role}
                        onChange={(e) => {
                          const newEtapes = [...editingCircuit.etapes];
                          const selectedRole = ROLES_DISPONIBLES.find(r => r.value === e.target.value);
                          newEtapes[index] = { 
                            ...etape, 
                            role: e.target.value, 
                            label: selectedRole?.label || e.target.value 
                          };
                          setEditingCircuit({ ...editingCircuit, etapes: newEtapes });
                        }}
                        style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid var(--border)' }}
                      >
                        {ROLES_DISPONIBLES.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 80 }}>
                      <Input
                        type="number"
                        value={etape.delai}
                        onChange={(e) => {
                          const newEtapes = [...editingCircuit.etapes];
                          newEtapes[index] = { ...etape, delai: Number(e.target.value) };
                          setEditingCircuit({ ...editingCircuit, etapes: newEtapes });
                        }}
                        style={{ textAlign: 'center' }}
                      />
                    </div>
                    <Button variant="danger" size="xs" onClick={() => removeEtape(index)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8, background: 'var(--gold-pale)', borderRadius: 4 }}>
              💡 Les délais sont exprimés en heures. Par défaut : 48h (2 jours ouvrés)
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de création */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouveau circuit de validation"
        maxWidth={700}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Annuler</Button>
            <Button variant="primary" onClick={handleCreateCircuit}>Créer</Button>
          </div>
        }
      >
        <div style={{ padding: '16px 0' }}>
          <FormRow>
            <FormGroup>
              <FormLabel required>Type (identifiant)</FormLabel>
              <Input
                value={newCircuit.type}
                onChange={(e) => setNewCircuit({ ...newCircuit, type: e.target.value.toUpperCase() })}
                placeholder="EX: NOUVEAU_TYPE"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Nom du circuit</FormLabel>
              <Input
                value={newCircuit.nom}
                onChange={(e) => setNewCircuit({ ...newCircuit, nom: e.target.value })}
                placeholder="Ex: Nouveau circuit"
              />
            </FormGroup>
          </FormRow>

          <FormGroup>
            <FormLabel>Description</FormLabel>
            <Input
              value={newCircuit.description}
              onChange={(e) => setNewCircuit({ ...newCircuit, description: e.target.value })}
              placeholder="Description du circuit"
            />
          </FormGroup>

          <FormRow>
            <FormGroup>
              <FormLabel>Budget minimum (DT/an)</FormLabel>
              <Input
                type="number"
                value={newCircuit.seuilMin || ''}
                onChange={(e) => setNewCircuit({ ...newCircuit, seuilMin: e.target.value ? Number(e.target.value) : null })}
                placeholder="0"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Budget maximum (DT/an)</FormLabel>
              <Input
                type="number"
                value={newCircuit.seuilMax || ''}
                onChange={(e) => setNewCircuit({ ...newCircuit, seuilMax: e.target.value ? Number(e.target.value) : null })}
                placeholder="Illimité"
              />
            </FormGroup>
          </FormRow>

          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <FormLabel>Étapes de validation</FormLabel>
              <Button variant="secondary" size="xs" onClick={addEtape}>
                <Plus size={12} /> Ajouter une étape
              </Button>
            </div>

            {newCircuit.etapes?.map((etape, index) => (
              <div key={index} style={{ marginBottom: 12, padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 40, fontWeight: 600 }}>Étape {etape.niveau}</div>
                  <div style={{ flex: 1 }}>
                    <select
                      value={etape.role}
                      onChange={(e) => {
                        const newEtapes = [...(newCircuit.etapes || [])];
                        const selectedRole = ROLES_DISPONIBLES.find(r => r.value === e.target.value);
                        newEtapes[index] = { 
                          ...etape, 
                          role: e.target.value, 
                          label: selectedRole?.label || e.target.value 
                        };
                        setNewCircuit({ ...newCircuit, etapes: newEtapes });
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid var(--border)' }}
                    >
                      {ROLES_DISPONIBLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ width: 80 }}>
                    <Input
                      type="number"
                      value={etape.delai}
                      onChange={(e) => {
                        const newEtapes = [...(newCircuit.etapes || [])];
                        newEtapes[index] = { ...etape, delai: Number(e.target.value) };
                        setNewCircuit({ ...newCircuit, etapes: newEtapes });
                      }}
                      style={{ textAlign: 'center' }}
                    />
                  </div>
                  <Button variant="danger" size="xs" onClick={() => removeEtape(index)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8, background: 'var(--gold-pale)', borderRadius: 4 }}>
            💡 Les délais sont exprimés en heures. Par défaut : 48h (2 jours ouvrés)
          </div>
        </div>
      </Modal>
    </div>
  );
};