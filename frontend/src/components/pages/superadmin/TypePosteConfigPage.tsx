import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import api from '../../../services/api';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Alert } from '../../ui/Alert';
import { Modal } from '../../ui/Modal';
import { Input, FormGroup, FormLabel, Select } from '../../ui/FormField';

interface Direction {
  id: string;
  code: string;
  nom: string;
}

interface CircuitConfig {
  id: string;
  type: string;
  nom: string;
  description: string;
  totalEtapes: number;
}

interface TypePoste {
  id: string;
  code: string;
  nom: string;
  description?: string;
  circuitType: string;
  actif: boolean;
  directionId: string;
  direction?: Direction;
  circuit?: CircuitConfig;
}

export const TypePosteConfigPage = () => {
  const [typePostes, setTypePostes] = useState<TypePoste[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [circuits, setCircuits] = useState<CircuitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDirectionId, setSelectedDirectionId] = useState<string>('');
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTypePoste, setSelectedTypePoste] = useState<TypePoste | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    description: '',
    circuitType: '',
    directionId: ''
  });

  useEffect(() => {
    fetchTypePostes();
    fetchDirections();
    fetchCircuits();
  }, []);

  useEffect(() => {
    if (selectedDirectionId) {
      fetchTypePostesByDirection(selectedDirectionId);
    }
  }, [selectedDirectionId]);

  const fetchDirections = async () => {
    try {
      const response = await api.get('/directions');
      setDirections(response.data.data || []);
    } catch (err) {
      console.error('Erreur chargement directions:', err);
    }
  };

  const fetchCircuits = async () => {
    try {
      const response = await api.get('/admin/circuits');
      setCircuits(response.data.data || []);
    } catch (err) {
      console.error('Erreur chargement circuits:', err);
    }
  };

  const fetchTypePostes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/type-postes');
      setTypePostes(response.data.data || []);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchTypePostesByDirection = async (directionId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/type-postes?directionId=${directionId}`);
      setTypePostes(response.data.data || []);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async () => {
    if (!formData.code || !formData.nom || !formData.circuitType || !formData.directionId) {
      setError('Code, nom, circuit et direction sont requis');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/type-postes', formData);
      setSuccess('Type de poste créé');
      setShowModal(false);
      resetForm();
      if (selectedDirectionId) {
        fetchTypePostesByDirection(selectedDirectionId);
      } else {
        fetchTypePostes();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTypePoste) return;

    try {
      setSubmitting(true);
      await api.put(`/type-postes/${selectedTypePoste.id}`, formData);
      setSuccess('Type de poste modifié');
      setShowModal(false);
      resetForm();
      if (selectedDirectionId) {
        fetchTypePostesByDirection(selectedDirectionId);
      } else {
        fetchTypePostes();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce type de poste ?')) return;
    try {
      await api.delete(`/type-postes/${id}`);
      setSuccess('Type de poste supprimé');
      if (selectedDirectionId) {
        fetchTypePostesByDirection(selectedDirectionId);
      } else {
        fetchTypePostes();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur');
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedTypePoste(null);
    setFormData({
      code: '',
      nom: '',
      description: '',
      circuitType: '',
      directionId: selectedDirectionId || ''
    });
    setShowModal(true);
  };

  const openEditModal = (typePoste: TypePoste) => {
    setModalMode('edit');
    setSelectedTypePoste(typePoste);
    setFormData({
      code: typePoste.code,
      nom: typePoste.nom,
      description: typePoste.description || '',
      circuitType: typePoste.circuitType,
      directionId: typePoste.directionId
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      nom: '',
      description: '',
      circuitType: '',
      directionId: ''
    });
    setError('');
  };

  const getCircuitInfo = (circuitType: string) => {
    const circuit = circuits.find(c => c.type === circuitType);
    return circuit;
  };

  const getDirectionName = (directionId: string) => {
    const direction = directions.find(d => d.id === directionId);
    return direction?.nom || '-';
  };

  if (loading && typePostes.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;
  }

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            Types de poste
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Associez un circuit de validation à chaque type de poste
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            value={selectedDirectionId}
            onChange={(e) => setSelectedDirectionId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
          >
            <option value="">Toutes les directions</option>
            {directions.map(dir => (
              <option key={dir.id} value={dir.id}>{dir.nom}</option>
            ))}
          </select>
          <Button variant="primary" onClick={openCreateModal}>
            <Plus size={14} /> Nouveau type de poste
          </Button>
        </div>
      </div>

      {error && <Alert variant="red">{error}</Alert>}
      {success && <Alert variant="green">{success}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
        {typePostes.map((type) => {
          const circuit = getCircuitInfo(type.circuitType);
          return (
            <Card key={type.id}>
              <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <CardTitle>{type.nom}</CardTitle>
                    <CardSubtitle>Code: {type.code}</CardSubtitle>
                  </div>
                  <Badge variant={type.actif ? 'green' : 'red'}>
                    {type.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Direction</div>
                  <div>{getDirectionName(type.directionId)}</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Circuit associé</div>
                  <div>
                    <Badge variant="gold">
                      {circuit?.nom || type.circuitType} ({circuit?.totalEtapes || 0} étapes)
                    </Badge>
                  </div>
                </div>
                {type.description && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Description</div>
                    <div style={{ fontSize: 13 }}>{type.description}</div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <Button variant="secondary" size="sm" onClick={() => openEditModal(type)}>
                    <Edit size={14} /> Modifier
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(type.id)}>
                    <Trash2 size={14} /> Supprimer
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {typePostes.length === 0 && (
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              Aucun type de poste. Cliquez sur "Nouveau type de poste".
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal de création/édition */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={modalMode === 'create' ? 'Nouveau type de poste' : 'Modifier type de poste'}
        maxWidth={600}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
            <Button variant="primary" onClick={modalMode === 'create' ? handleCreate : handleUpdate} disabled={submitting}>
              {submitting ? 'En cours...' : (modalMode === 'create' ? 'Créer' : 'Mettre à jour')}
            </Button>
          </div>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <FormGroup>
            <FormLabel required>Code</FormLabel>
            <Input
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              placeholder="EX: PHARMA_CADRE_CONFIRME"
              disabled={modalMode === 'edit'}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Nom</FormLabel>
            <Input
              name="nom"
              value={formData.nom}
              onChange={handleInputChange}
              placeholder="ex: Chef de produit"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Direction</FormLabel>
            <Select
              name="directionId"
              value={formData.directionId}
              onChange={handleInputChange}
              disabled={modalMode === 'edit'}
            >
              <option value="">Sélectionner une direction</option>
              {directions.map(dir => (
                <option key={dir.id} value={dir.id}>{dir.nom}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <FormLabel required>Circuit de validation</FormLabel>
            <Select
              name="circuitType"
              value={formData.circuitType}
              onChange={handleInputChange}
            >
              <option value="">Sélectionner un circuit</option>
              {circuits.map(circuit => (
                <option key={circuit.type} value={circuit.type}>
                  {circuit.nom} ({circuit.totalEtapes} étapes)
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <FormLabel>Description</FormLabel>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Description optionnelle"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
          </FormGroup>
        </div>
      </Modal>
    </div>
  );
};