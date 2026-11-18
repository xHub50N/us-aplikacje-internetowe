import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ProjectMember } from '../../api';
import { Avatar } from './Avatar';
import { Search, ChevronDown, Check, X, UserX } from 'lucide-react';

interface SearchableAssigneeSelectProps {
  value: number | '';
  onChange: (userId: number | null) => void;
  members: ProjectMember[];
  placeholder?: string;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  onOpenChange?: (open: boolean) => void;
}

export const SearchableAssigneeSelect: React.FC<SearchableAssigneeSelectProps> = ({
  value,
  onChange,
  members,
  placeholder = 'Wybierz osobę do przypisania...',
  disabled = false,
  variant = 'default',
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleOpen = useCallback(
    (newVal: boolean) => {
      setIsOpen(newVal);
      if (onOpenChange) onOpenChange(newVal);
      if (!newVal) setSearchQuery('');
    },
    [onOpenChange]
  );

  // Znajdź aktualnie wybranego członka
  const selectedMember = useMemo(
    () => members.find((m) => m.userId === Number(value)),
    [members, value]
  );

  // Filtrowanie członków po imieniu, nazwisku i e-mailu (odfiltrowujemy też ewentualnych VIEWERów, bo do widza nie można przypisać zadania)
  const filteredMembers = useMemo(() => {
    // Zadania można przypisywać tylko do MEMBER i OWNER
    const assignableMembers = members.filter((m) => m.role !== 'VIEWER');

    const query = searchQuery.trim().toLowerCase();
    if (!query) return assignableMembers;

    return assignableMembers.filter((m) => {
      const name = (m.user?.name || '').toLowerCase();
      const email = (m.user?.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [members, searchQuery]);

  // Zamykanie dropdownu przy kliknięciu poza komponentem
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        toggleOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, toggleOpen]);

  // Auto-focus na pole wyszukiwania po otwarciu
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (userId: number | null) => {
    onChange(userId);
    toggleOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%' }}
      className={`searchable-assignee-select ${variant === 'compact' ? 'compact' : ''}`}
    >
      {/* Przycisk aktywujący / Wybrany użytkownik */}
      <div
        onClick={() => {
          if (!disabled) toggleOpen(!isOpen);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          backgroundColor: variant === 'compact' ? (isOpen ? '#111827' : 'transparent') : '#0b1120',
          border: isOpen
            ? '1px solid #6366f1'
            : variant === 'compact'
            ? '1px solid transparent'
            : '1px solid #273549',
          borderRadius: variant === 'compact' ? '6px' : '8px',
          padding: variant === 'compact' ? '2px 6px' : '7px 12px',
          fontSize: variant === 'compact' ? '12px' : '13px',
          color: '#f8fafc',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: isOpen ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          minHeight: variant === 'compact' ? '28px' : '38px',
          height: variant === 'compact' ? '28px' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: variant === 'compact' ? '6px' : '8px', overflow: 'hidden', flex: 1 }}>
          {selectedMember ? (
            <>
              <Avatar user={selectedMember.user} size={variant === 'compact' ? 18 : 22} />
              <span style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', fontSize: variant === 'compact' ? '12px' : '13px' }}>
                {selectedMember.user?.name || `Użytkownik #${selectedMember.userId}`}
              </span>
              {variant !== 'compact' && (
                <span style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  ({selectedMember.user?.email})
                </span>
              )}
            </>
          ) : (
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', fontSize: variant === 'compact' ? '12px' : '13px' }}>
              <UserX size={variant === 'compact' ? 13 : 15} color="#64748b" />
              <span>{placeholder}</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
          {selectedMember && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
              }}
              title="Wyczyść przypisanie"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={variant === 'compact' ? 13 : 15}
            color="#64748b"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </div>
      </div>

      {/* Rozwijany panel wyszukiwania i lista osób */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            left: variant === 'compact' ? 'auto' : 0,
            width: variant === 'compact' ? '260px' : '100%',
            backgroundColor: '#111827',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
            zIndex: 1050,
            overflow: 'hidden',
            animation: 'modalIn 0.15s ease',
          }}
        >
          {/* Pole wyszukiwania */}
          <div
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0b1120',
            }}
          >
            <Search size={14} color="#64748b" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Szukaj po imieniu, nazwisku lub mailu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '12px',
                color: '#f8fafc',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Lista wyników */}
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {/* Opcja: Nieprzypisane */}
            {(!searchQuery || 'nieprzypisane'.includes(searchQuery.toLowerCase())) && (
              <div
                onClick={() => handleSelect(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: !selectedMember ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  color: !selectedMember ? '#818cf8' : '#94a3b8',
                  fontSize: '12px',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = !selectedMember
                    ? 'rgba(99, 102, 241, 0.18)'
                    : 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = !selectedMember
                    ? 'rgba(99, 102, 241, 0.12)'
                    : 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserX size={16} />
                  <span>Nieprzypisane</span>
                </div>
                {!selectedMember && <Check size={14} color="#6366f1" />}
              </div>
            )}

            {/* Lista dopasowanych użytkowników */}
            {filteredMembers.length > 0 ? (
              filteredMembers.map((m) => {
                const isSelected = selectedMember?.userId === m.userId;

                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelect(m.userId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isSelected
                        ? 'rgba(99, 102, 241, 0.18)'
                        : 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isSelected
                        ? 'rgba(99, 102, 241, 0.12)'
                        : 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <Avatar user={m.user} size={24} />
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                          {m.user?.name || `Użytkownik #${m.userId}`}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.user?.email}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: m.role === 'OWNER' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                          color: m.role === 'OWNER' ? '#60a5fa' : '#94a3b8',
                        }}
                      >
                        {m.role === 'OWNER' ? 'Właściciel' : 'Członek'}
                      </span>
                      {isSelected && <Check size={14} color="#6366f1" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '16px 12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                Brak osób pasujących do "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
