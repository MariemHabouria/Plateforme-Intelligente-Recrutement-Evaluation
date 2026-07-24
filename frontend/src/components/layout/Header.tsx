import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Settings, User as UserIcon, LogOut, X } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import type { SearchResults } from '../../types';

const PAGE_TITLES: Record<string, [string, string | null]> = {
  dashboard:    ['Tableau de bord', "Vue d'ensemble"],
  demandes:     ['Demandes de recrutement', null],
  offres:       ["Offres d'emploi", null],
  candidats:    ['Candidatures & IA', 'Présélection intelligente'],
  entretiens:   ['Entretiens', null],
  evaluation:   ["Évaluation Période d'Essai", 'Processus 2 — 6 étapes'],
  contrats:     ['Contractualisation', null],
  validation:   ['Circuit de validation', 'Approbations en attente'],
  utilisateurs: ['Utilisateurs & Rôles', 'Super Admin'],
  workflows:    ['Workflows', 'Circuits de validation'],
  ia_config:    ['Configuration IA', 'Paramètres du moteur de matching'],
  audit:        ["Journal d'audit", 'Traçabilité complète'],
};

const EMPTY_RESULTS: SearchResults = { demandes: [], candidats: [], offres: [], contrats: [] };

interface HeaderProps { page: string }

export function Header({ page }: HeaderProps) {
  const [title, sub] = PAGE_TITLES[page] || [page, null];
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ---------- SEARCH ----------
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useOnClickOutside(searchRef, () => setSearchOpen(false));

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults(EMPTY_RESULTS);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    try {
      const { data } = await api.get('/search', { params: { q } });
      if (data.success) {
        setSearchResults({
          demandes: data.demandes,
          candidats: data.candidats,
          offres: data.offres,
          contrats: data.contrats,
        });
        setSearchOpen(true);
      }
    } catch (err) {
      console.error('Erreur recherche', err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 350);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(EMPTY_RESULTS);
    setSearchOpen(false);
  };

  const goToResult = (type: keyof SearchResults, id: string) => {
    const routes: Record<keyof SearchResults, string> = {
      demandes: `/demandes/${id}`,
      candidats: `/candidats/${id}`,
      offres: `/offres/${id}`,
      contrats: `/contrats/${id}`,
    };
    navigate(routes[type]);
    clearSearch();
  };

  const hasResults = Object.values(searchResults).some(arr => arr.length > 0);

  // ---------- SETTINGS ----------
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(settingsRef, () => setSettingsOpen(false));

  const handleLogout = () => {
    setSettingsOpen(false);
    logout();
  };

  return (
    <header style={{ height: 60, background: 'var(--white)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, position: 'sticky', top: 0, zIndex: 90 }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        {sub && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>· {sub}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* SEARCH */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', minWidth: 220 }}>
            <Search size={13} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
              style={{ border: 'none', background: 'none', fontSize: 13, color: 'var(--text-primary)', outline: 'none', width: '100%', fontFamily: 'inherit' }}
            />
            {searchQuery && (
              <X size={13} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={clearSearch} />
            )}
          </div>

          {searchOpen && (
            <div style={{ position: 'absolute', top: 42, right: 0, width: 340, maxHeight: 420, overflowY: 'auto', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100 }}>
              {searchLoading && (
                <div style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>Recherche…</div>
              )}

              {!searchLoading && !hasResults && (
                <div style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>Aucun résultat</div>
              )}

              {!searchLoading && searchResults.demandes.length > 0 && (
                <div>
                  <div style={sectionTitleStyle}>Demandes</div>
                  {searchResults.demandes.map(d => (
                    <div key={d.id} onClick={() => goToResult('demandes', d.id)} style={itemStyle}>
                      <div style={{ fontWeight: 500 }}>{d.intitulePoste}</div>
                      <div style={metaStyle}>{d.reference} · {d.statut}</div>
                    </div>
                  ))}
                </div>
              )}

              {!searchLoading && searchResults.candidats.length > 0 && (
                <div>
                  <div style={sectionTitleStyle}>Candidats</div>
                  {searchResults.candidats.map(c => (
                    <div key={c.id} onClick={() => goToResult('candidats', c.id)} style={itemStyle}>
                      <div style={{ fontWeight: 500 }}>{c.prenom} {c.nom}</div>
                      <div style={metaStyle}>{c.reference} · {c.statut}</div>
                    </div>
                  ))}
                </div>
              )}

              {!searchLoading && searchResults.offres.length > 0 && (
                <div>
                  <div style={sectionTitleStyle}>Offres</div>
                  {searchResults.offres.map(o => (
                    <div key={o.id} onClick={() => goToResult('offres', o.id)} style={itemStyle}>
                      <div style={{ fontWeight: 500 }}>{o.intitule}</div>
                      <div style={metaStyle}>{o.reference} · {o.statut}</div>
                    </div>
                  ))}
                </div>
              )}

              {!searchLoading && searchResults.contrats.length > 0 && (
                <div>
                  <div style={sectionTitleStyle}>Contrats</div>
                  {searchResults.contrats.map(c => (
                    <div key={c.id} onClick={() => goToResult('contrats', c.id)} style={itemStyle}>
                      <div style={{ fontWeight: 500 }}>{c.reference}</div>
                      <div style={metaStyle}>{c.typeContrat} · {c.statut}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SETTINGS */}
        <div ref={settingsRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setSettingsOpen(o => !o)}
            style={{ width: 34, height: 34, borderRadius: 8, background: settingsOpen ? 'var(--surface)' : 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <Settings size={16} />
          </button>

          {settingsOpen && (
            <div style={{ position: 'absolute', top: 42, right: 0, width: 200, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
              <div onClick={() => { setSettingsOpen(false); navigate('/profil'); }} style={menuItemStyle}>
                <UserIcon size={14} /> Mon profil
              </div>
              <div onClick={() => { setSettingsOpen(false); navigate('/parametres'); }} style={menuItemStyle}>
                <Settings size={14} /> Paramètres
              </div>
              <div onClick={handleLogout} style={{ ...menuItemStyle, color: 'var(--red)' }}>
                <LogOut size={14} /> Déconnexion
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  padding: '8px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
};

const itemStyle: React.CSSProperties = {
  padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)',
};

const metaStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
};

const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)',
};