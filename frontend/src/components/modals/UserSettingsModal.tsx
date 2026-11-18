import React, { useState } from 'react';
import { api, User } from '../../api';
import { Avatar } from '../common/Avatar';
import { X, Upload, Trash2, Shield, User as UserIcon, Check, Eye, EyeOff } from 'lucide-react';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdated: (user: User) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
];

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profil
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser.avatarUrl || null);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Zmiana hasła
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Kompresja wybranego pliku obrazka do max 256x256 WebP/JPEG Base64 Data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Wybrany plik musi być obrazem');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(dataUrl);
          setProfileError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileError('Imię i nazwisko nie może być puste');
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileError(null);

      const res = await api.auth.updateProfile({
        name: name.trim(),
        avatarUrl,
      });

      onUserUpdated(res.user);
      showToast('Profil został zaktualizowany', 'success');
      onClose();
    } catch (err: any) {
      setProfileError(err.message || 'Błąd aktualizacji profilu');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError('Podaj obecne hasło');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Nowe hasło musi mieć co najmniej 8 znaków');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Nowe hasła nie są identyczne');
      return;
    }

    try {
      setIsChangingPassword(true);
      setPasswordError(null);

      await api.auth.changePassword({
        currentPassword,
        newPassword,
      });

      showToast('Hasło zostało pomyślnie zmienione', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      onClose();
    } catch (err: any) {
      setPasswordError(err.message || 'Nie udało się zmienić hasła');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-window"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Ustawienia konta</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Zakładki */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', borderBottom: '1px solid #1e293b' }}>
          <button
            type="button"
            className={`btn-secondary ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1,
              backgroundColor: activeTab === 'profile' ? '#1e293b' : 'transparent',
              borderColor: activeTab === 'profile' ? '#4f46e5' : '#1e293b',
              color: activeTab === 'profile' ? '#f8fafc' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <UserIcon size={14} /> Profil & Awatar
          </button>
          <button
            type="button"
            className={`btn-secondary ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
            style={{
              flex: 1,
              backgroundColor: activeTab === 'password' ? '#1e293b' : 'transparent',
              borderColor: activeTab === 'password' ? '#4f46e5' : '#1e293b',
              color: activeTab === 'password' ? '#f8fafc' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Shield size={14} /> Bezpieczeństwo i hasło
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'profile' ? (
            <form onSubmit={handleSaveProfile}>
              {profileError && <div className="error-banner">{profileError}</div>}

              {/* Sekcja awatara */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                <Avatar
                  user={{ name, email: currentUser.email, avatarUrl }}
                  size={72}
                  style={{ border: '2px solid #334155' }}
                />

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <label
                      className="btn-secondary"
                      style={{
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                      }}
                    >
                      <Upload size={13} /> Wgraj zdjęcie
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                    </label>

                    {avatarUrl && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setAvatarUrl(null)}
                        style={{
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          color: '#fb7185',
                        }}
                      >
                        <Trash2 size={13} /> Usuń zdjęcie
                      </button>
                    )}
                  </div>

                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Wybierz plik z dysku lub jeden z gotowych awatarów poniżej
                  </span>
                </div>
              </div>

              {/* Presety awatarów */}
              <div style={{ marginBottom: '18px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                  Gotowe szablony awatarów:
                </span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {PRESET_AVATARS.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setAvatarUrl(url)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: '50%',
                        padding: '2px',
                        border: avatarUrl === url ? '2px solid #6366f1' : '2px solid transparent',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <img
                        src={url}
                        alt={`Preset ${idx + 1}`}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Ręczny link URL */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Lub wklej bezpośredni adres URL do zdjęcia:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    className="form-input"
                    value={avatarUrlInput}
                    onChange={(e) => setAvatarUrlInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (avatarUrlInput.trim()) {
                        setAvatarUrl(avatarUrlInput.trim());
                        setAvatarUrlInput('');
                      }
                    }}
                  >
                    Ustaw
                  </button>
                </div>
              </div>

              {/* Imię i nazwisko */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Imię i nazwisko:
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Np. Jan Kowalski"
                />
              </div>

              {/* E-mail (nieedytowalny) */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Adres e-mail:
                </label>
                <input
                  type="email"
                  disabled
                  className="form-input"
                  value={currentUser.email}
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Anuluj
                </button>
                <button type="submit" className="btn-primary" disabled={isSavingProfile}>
                  <Check size={14} style={{ marginRight: '6px' }} />
                  {isSavingProfile ? 'Zapisywanie...' : 'Zapisz profil'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword}>
              {passwordError && <div className="error-banner">{passwordError}</div>}

              {/* Obecne hasło */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Obecne hasło:
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Wpisz swoje aktualne hasło"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Nowe hasło */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Nowe hasło (min. 8 znaków):
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Wprowadź nowe silne hasło"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Powtórz nowe hasło */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Powtórz nowe hasło:
                </label>
                <input
                  type="password"
                  required
                  className="form-input"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Wpisz ponownie nowe hasło"
                />
                {confirmNewPassword && newPassword !== confirmNewPassword && (
                  <span style={{ color: '#fb7185', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Hasła nie są identyczne
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Anuluj
                </button>
                <button type="submit" className="btn-primary" disabled={isChangingPassword}>
                  <Shield size={14} style={{ marginRight: '6px' }} />
                  {isChangingPassword ? 'Zmienianie...' : 'Zmień hasło'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
