import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, X } from 'lucide-react';
import api from '../../../services/api';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { Modal } from '../../ui/Modal';
import { Input, FormGroup, FormLabel } from '../../ui/FormField';

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
  etapes: CircuitEtape[];
  totalEtapes: number;
  delaiParDefaut: number;
  actif: boolean;
}

const ROLES_DISPONIBLES = [
  { value: 'DIRECTEUR', label: 'Directeur' },
  { value: 'DRH', label: 'DRH' },
  { value: 'DAF', label: 'DAF' },
  { value: 'DGA', label: 'DGA' },
  { value: 'DG', label: 'DG' }
];

export const CircuitConfigPage = () => {
  const [circuits, setCircuits] = useState<CircuitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingCircuit, setEditingCircuit] = useState<CircuitConfig | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCircuit = async (circuit: CircuitConfig) => {
    try {
      await api.put(`/admin/circuits/${circuit.id}`, circuit);
      setSuccess('Circuit mis à jour');
      setShowEditModal(false);
      fetchCircuits();
    } catch (err) {
      setError('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteCircuit = async (id: string) => {
    if (!confirm('Supprimer ce circuit ?')) return;
    try {
      await api.delete(`/admin/circuits/${id}`);
      setSuccess('Circuit supprimé');
      fetchCircuits();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  const addEtape = () => {
    if (!editingCircuit) return;
    const newEtapes = [...editingCircuit.etapes, {
      niveau: editingCircuit.etapes.length + 1,
      role: 'DIRECTEUR',
      label: 'Directeur',
      delai: 48
    }];
    setEditingCircuit({ ...editingCircuit, etapes: newEtapes, totalEtapes: newEtapes.length });
  };

  const removeEtape = (index: number) => {
    if (!editingCircuit) return;
    const newEtapes = editingCircuit.etapes
      .filter((_, i) => i !== index)
      .map((e, i) => ({ ...e, niveau: i + 1 }));
    setEditingCircuit({ ...editingCircuit, etapes: newEtapes, totalEtapes: newEtapes.length });
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;
  }

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          Circuits de validation
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Définissez les circuits qui seront associés aux types de poste
        </p>
      </div>

      {error && <Alert variant="red">{error}</Alert>}
      {success && <Alert variant="green">{success}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20 }}>
        {circuits.map((circuit) => (
          <Card key={circuit.id}>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <CardTitle>{circuit.nom}</CardTitle>
                  <CardSubtitle>{circuit.type}</CardSubtitle>
                </div>
                <Badge variant={circuit.actif ? 'green' : 'red'}>
                  {circuit.actif ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Circuit ({circuit.totalEtapes} étape{circuit.totalEtapes > 1 ? 's' : ''})
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

              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                ⏱️ Délai: {circuit.delaiParDefaut} heures
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => {
                  setEditingCircuit(JSON.parse(JSON.stringify(circuit)));
                  setShowEditModal(true);
                }}>
                  <Edit size={14} /> Modifier
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDeleteCircuit(circuit.id)}>
                  <Trash2 size={14} /> Supprimer
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Modal d'édition uniquement */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Modifier circuit : ${editingCircuit?.nom}`}
        maxWidth={600}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>Annuler</Button>
            <Button variant="primary" onClick={() => editingCircuit && handleUpdateCircuit(editingCircuit)}>
              Sauvegarder
            </Button>
          </div>
        }
      >
        {editingCircuit && (
          <div style={{ padding: '16px 0' }}>
            <FormGroup>
              <FormLabel>Nom</FormLabel>
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
            <FormGroup>
              <FormLabel>Délai (heures)</FormLabel>
              <Input
                type="number"
                value={editingCircuit.delaiParDefaut}
                onChange={(e) => setEditingCircuit({ ...editingCircuit, delaiParDefaut: Number(e.target.value) })}
              />
            </FormGroup>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <FormLabel>Étapes</FormLabel>
                <Button variant="secondary" size="xs" onClick={addEtape}>
                  <Plus size={12} /> Ajouter étape
                </Button>
              </div>
              {editingCircuit.etapes.map((etape, index) => (
                <div key={index} style={{ marginBottom: 12, padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 50, fontSize: 13 }}>Étape {etape.niveau}</div>
                    <select
                      value={etape.role}
                      onChange={(e) => {
                        const newEtapes = [...editingCircuit.etapes];
                        const selected = ROLES_DISPONIBLES.find(r => r.value === e.target.value);
                        newEtapes[index] = { ...etape, role: e.target.value, label: selected?.label || e.target.value };
                        setEditingCircuit({ ...editingCircuit, etapes: newEtapes });
                      }}
                      style={{ flex: 1, padding: '6px', borderRadius: 4, border: '1px solid var(--border)' }}
                    >
                      {ROLES_DISPONIBLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
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
                      <X size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};