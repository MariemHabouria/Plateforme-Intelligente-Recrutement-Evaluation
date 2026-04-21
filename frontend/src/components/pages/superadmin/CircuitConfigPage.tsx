// frontend/src/components/pages/superadmin/CircuitConfigPage.tsx

import { useState, useEffect } from 'react';
import { Edit, Plus, X, RefreshCw, Power, PowerOff } from 'lucide-react';
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

// Tous les rôles disponibles pour les circuits (inclut MANAGER)
const ROLES_DISPONIBLES = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'DIRECTEUR', label: 'Directeur' },
  { value: 'DRH', label: 'DRH' },
  { value: 'DAF', label: 'DAF' },
  { value: 'DGA', label: 'DGA' },
  { value: 'DG', label: 'DG' }
];

// Circuits par defaut selon la logique backend
const DEFAULT_CIRCUITS: Record<string, { nom: string; description: string; etapes: CircuitEtape[] }> = {
  TECHNICIEN: {
    nom: 'Technicien / Ouvrier',
    description: 'Postes techniques et ouvriers',
    etapes: [
      { niveau: 1, role: 'MANAGER', label: 'Manager', delai: 48 },
      { niveau: 2, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 3, role: 'DRH', label: 'DRH', delai: 48 }
    ]
  },
  EMPLOYE: {
    nom: 'Employe / Agent',
    description: 'Postes administratifs',
    etapes: [
      { niveau: 1, role: 'MANAGER', label: 'Manager', delai: 48 },
      { niveau: 2, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 3, role: 'DRH', label: 'DRH', delai: 48 }
    ]
  },
  CADRE_DEBUTANT: {
    nom: 'Cadre debutant',
    description: 'Cadres juniors (1-3 ans experience)',
    etapes: [
      { niveau: 1, role: 'MANAGER', label: 'Manager', delai: 48 },
      { niveau: 2, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 3, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 4, role: 'DAF', label: 'DAF', delai: 48 }
    ]
  },
  CADRE_CONFIRME: {
    nom: 'Cadre confirme',
    description: 'Cadres seniors (4-8 ans experience)',
    etapes: [
      { niveau: 1, role: 'MANAGER', label: 'Manager', delai: 48 },
      { niveau: 2, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 3, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 4, role: 'DAF', label: 'DAF', delai: 48 },
      { niveau: 5, role: 'DGA', label: 'DGA', delai: 48 }
    ]
  },
  CADRE_SUPERIEUR: {
    nom: 'Cadre superieur',
    description: 'Directeurs de departement',
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
      { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 },
      { niveau: 5, role: 'DG', label: 'DG', delai: 48 }
    ]
  },
  STRATEGIQUE: {
    nom: 'Poste strategique',
    description: 'Postes de direction generale',
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
      { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 },
      { niveau: 5, role: 'DG', label: 'DG', delai: 48 }
    ]
  }
};

export const CircuitConfigPage = () => {
  const [circuits, setCircuits] = useState<CircuitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingCircuit, setEditingCircuit] = useState<CircuitConfig | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState<CircuitConfig | null>(null);

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
      if (circuit.etapes.length === 0) {
        setError('Le circuit doit contenir au moins une etape');
        return;
      }
      
      await api.put(`/admin/circuits/${circuit.id}`, circuit);
      setSuccess('Circuit mis a jour avec succes');
      setShowEditModal(false);
      fetchCircuits();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise a jour');
      setTimeout(() => setError(''), 3000);
    }
  };

  // ✅ Activer/Desactiver un circuit (soft delete - reste en base)
  const handleToggleCircuit = async (circuit: CircuitConfig) => {
    try {
      await api.patch(`/admin/circuits/${circuit.id}/toggle`, { actif: !circuit.actif });
      setSuccess(`Circuit ${circuit.actif ? 'desactive' : 'active'} avec succes`);
      setShowToggleConfirm(null);
      fetchCircuits();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la modification');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleResetCircuits = async () => {
    try {
      await api.post('/admin/circuits/reset');
      setSuccess('Circuits reinitialises avec succes');
      setShowResetConfirm(false);
      fetchCircuits();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la reinitialisation');
      setTimeout(() => setError(''), 3000);
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

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'TECHNICIEN': 'Technicien',
      'EMPLOYE': 'Employe',
      'CADRE_DEBUTANT': 'Cadre debutant',
      'CADRE_CONFIRME': 'Cadre confirme',
      'CADRE_SUPERIEUR': 'Cadre superieur',
      'STRATEGIQUE': 'Strategique'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Chargement des circuits...
      </div>
    );
  }

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            Circuits de validation
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Definissez les circuits qui seront associes aux types de poste
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowResetConfirm(true)}>
          <RefreshCw size={14} style={{ marginRight: 6 }} />
          Reinitialiser par defaut
        </Button>
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <Alert variant="red">{error}</Alert>
        </div>
      )}
      {success && (
        <div style={{ marginBottom: 20 }}>
          <Alert variant="green">{success}</Alert>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
        {circuits.map((circuit) => (
          <Card key={circuit.id} style={{ opacity: circuit.actif ? 1 : 0.7 }}>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <CardTitle>{circuit.nom}</CardTitle>
                  <CardSubtitle>{getTypeLabel(circuit.type)}</CardSubtitle>
                </div>
                <Badge variant={circuit.actif ? 'green' : 'red'}>
                  {circuit.actif ? 'Actif' : 'Desactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>
                  Circuit ({circuit.totalEtapes} etape{circuit.totalEtapes > 1 ? 's' : ''})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {circuit.etapes.map((etape, idx) => (
                    <div key={etape.niveau} style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        background: 'rgba(172, 107, 46, 0.1)',
                        color: '#ac6b2e',
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
                <div>Delai par defaut: {circuit.delaiParDefaut} heures</div>
                {circuit.description && (
                  <div style={{ marginTop: 4 }}>{circuit.description}</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" onClick={() => {
                  setEditingCircuit(JSON.parse(JSON.stringify(circuit)));
                  setShowEditModal(true);
                }}>
                  <Edit size={14} style={{ marginRight: 4 }} />
                  Modifier
                </Button>
                
                {/* ✅ Bouton Activer/Desactiver (soft delete) */}
                <Button 
                  variant={circuit.actif ? 'danger' : 'success'} 
                  size="sm" 
                  onClick={() => setShowToggleConfirm(circuit)}
                >
                  {circuit.actif ? (
                    <><PowerOff size={14} style={{ marginRight: 4 }} /> Desactiver</>
                  ) : (
                    <><Power size={14} style={{ marginRight: 4 }} /> Activer</>
                  )}
                </Button>
              </div>
              
              {!circuit.actif && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
                  Ce circuit est desactive. Il ne peut pas etre utilise pour les nouvelles demandes.
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Modal d'edition */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Modifier circuit : ${editingCircuit?.nom}`}
        maxWidth={650}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={() => editingCircuit && handleUpdateCircuit(editingCircuit)}>
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
                value={editingCircuit.description || ''}
                onChange={(e) => setEditingCircuit({ ...editingCircuit, description: e.target.value })}
                placeholder="Description du circuit..."
              />
            </FormGroup>
            
            <FormGroup>
              <FormLabel>Delai par defaut (heures)</FormLabel>
              <Input
                type="number"
                value={editingCircuit.delaiParDefaut}
                onChange={(e) => setEditingCircuit({ ...editingCircuit, delaiParDefaut: Number(e.target.value) })}
                min={1}
                max={168}
              />
            </FormGroup>

            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <FormLabel>Etapes de validation</FormLabel>
                <Button variant="secondary" size="xs" onClick={addEtape}>
                  <Plus size={12} style={{ marginRight: 4 }} />
                  Ajouter une etape
                </Button>
              </div>
              
              <div style={{ 
                maxHeight: 400, 
                overflowY: 'auto',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                padding: 12
              }}>
                {editingCircuit.etapes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Aucune etape. Cliquez sur "Ajouter une etape" pour commencer.
                  </div>
                ) : (
                  editingCircuit.etapes.map((etape, index) => (
                    <div key={index} style={{ 
                      marginBottom: 12, 
                      padding: 12, 
                      background: 'var(--surface)', 
                      borderRadius: 8,
                      border: '1px solid var(--border-light)'
                    }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ width: 60, fontSize: 13, fontWeight: 600 }}>
                          Etape {etape.niveau}
                        </div>
                        
                        <select
                          value={etape.role}
                          onChange={(e) => {
                            const newEtapes = [...editingCircuit.etapes];
                            const selected = ROLES_DISPONIBLES.find(r => r.value === e.target.value);
                            newEtapes[index] = { 
                              ...etape, 
                              role: e.target.value, 
                              label: selected?.label || e.target.value 
                            };
                            setEditingCircuit({ ...editingCircuit, etapes: newEtapes });
                          }}
                          style={{ 
                            flex: 2, 
                            padding: '6px 12px', 
                            borderRadius: 6, 
                            border: '1px solid var(--border)',
                            background: 'var(--white)'
                          }}
                        >
                          {ROLES_DISPONIBLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        
                        <div style={{ width: 100 }}>
                          <Input
                            type="number"
                            value={etape.delai}
                            onChange={(e) => {
                              const newEtapes = [...editingCircuit.etapes];
                              newEtapes[index] = { ...etape, delai: Number(e.target.value) };
                              setEditingCircuit({ ...editingCircuit, etapes: newEtapes });
                            }}
                            min={1}
                            max={168}
                            placeholder="Heures"
                          />
                        </div>
                        
                        <Button 
                          variant="danger" 
                          size="xs" 
                          onClick={() => removeEtape(index)}
                          disabled={editingCircuit.etapes.length === 1}
                          title={editingCircuit.etapes.length === 1 ? "Au moins une etape requise" : "Supprimer cette etape"}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, marginLeft: 60 }}>
                        Delai de validation: {etape.delai} heures
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Note: Le createur de la demande sera automatiquement exclu du circuit de validation.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de confirmation activation/desactivation */}
      <Modal
        open={showToggleConfirm !== null}
        onClose={() => setShowToggleConfirm(null)}
        title={showToggleConfirm?.actif ? "Desactiver le circuit" : "Activer le circuit"}
        maxWidth={400}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowToggleConfirm(null)}>
              Annuler
            </Button>
            <Button 
              variant={showToggleConfirm?.actif ? "danger" : "success"} 
              onClick={() => showToggleConfirm && handleToggleCircuit(showToggleConfirm)}
            >
              {showToggleConfirm?.actif ? "Desactiver" : "Activer"}
            </Button>
          </div>
        }
      >
        {showToggleConfirm && (
          <div style={{ padding: '16px 0' }}>
            <p>
              {showToggleConfirm.actif 
                ? `Etes-vous sur de vouloir DESACTIVER le circuit "${showToggleConfirm.nom}" ?`
                : `Etes-vous sur de vouloir ACTIVER le circuit "${showToggleConfirm.nom}" ?`
              }
            </p>
            {showToggleConfirm.actif && (
              <p style={{ fontSize: 13, color: 'var(--red)', marginTop: 12 }}>
                Attention: Les demandes existantes ne seront pas affectees, mais aucune nouvelle demande ne pourra utiliser ce circuit.
              </p>
            )}
            {!showToggleConfirm.actif && (
              <p style={{ fontSize: 13, color: 'var(--green)', marginTop: 12 }}>
                Le circuit sera a nouveau disponible pour les nouvelles demandes.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de confirmation reinitialisation */}
      <Modal
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reinitialiser les circuits"
        maxWidth={450}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowResetConfirm(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleResetCircuits}>
              Confirmer la reinitialisation
            </Button>
          </div>
        }
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: 12 }}>
            Etes-vous sur de vouloir reinitialiser tous les circuits de validation ?
          </p>
          <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>
            Attention: Cette action va supprimer toutes les modifications personnalisees et restaurer les circuits par defaut.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Circuits qui seront restaures :
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
            <li>Technicien : Manager → Directeur → DRH</li>
            <li>Employe : Manager → Directeur → DRH</li>
            <li>Cadre debutant : Manager → Directeur → DRH → DAF</li>
            <li>Cadre confirme : Manager → Directeur → DRH → DAF → DGA</li>
            <li>Cadre superieur : Directeur → DRH → DAF → DGA → DG</li>
            <li>Strategique : Directeur → DRH → DAF → DGA → DG</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};