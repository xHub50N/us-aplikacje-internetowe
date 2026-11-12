import React, { useState, useEffect } from 'react';
import { api, setTokens, User } from '../../api';
import { LayoutDashboard, Eye, EyeOff } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function evaluatePassword(pwd: string) {
  const minLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  let score = 0;
  if (minLength) score++;
  if (hasUpper && hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  let label = 'Wpisz hasło';
  let color = '#64748b';
  if (pwd.length === 0) {
    label = 'Wpisz hasło';
    color = '#64748b';
  } else if (!minLength || score <= 1) {
    label = 'Słabe';
    color = '#f43f5e';
  } else if (score === 2) {
    label = 'Średnie';
    color = '#f59e0b';
  } else if (score === 3) {
    label = 'Dobre';
    color = '#3b82f6';
  } else {
    label = 'Bardzo silne';
    color = '#10b981';
  }

  return {
    score,
    label,
    color,
    criteria: {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
    },
  };
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  showToast,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  // Sprawdzanie tokena resetowania hasła w adresie URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
      setAuthMode('reset');
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authMode === 'register') {
      if (password.length < 8) {
        setAuthError('Hasło musi mieć co najmniej 8 znaków.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Wprowadzone hasła nie są identyczne.');
        return;
      }
    }

    setIsAuthSubmitting(true);
    try {
      if (authMode === 'login') {
        const res = await api.auth.login({ email, password });
        setTokens({ token: res.token, refreshToken: res.refreshToken }, rememberMe);
        onAuthSuccess(res.user);
        showToast(`Witaj ponownie, ${res.user.name}!`, 'success');
      } else {
        const res = await api.auth.register({ name, email, password });
        setTokens({ token: res.token, refreshToken: res.refreshToken }, rememberMe);
        onAuthSuccess(res.user);
        showToast(`Witaj w aplikacji, ${res.user.name}!`, 'success');
      }
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setName('');
    } catch (err: any) {
      let msg = err.message || 'Błąd autoryzacji';
      if (msg === 'Invalid email or password') {
        msg = 'Nieprawidłowy adres e-mail lub hasło. Upewnij się, że dane są poprawne lub załóż konto w zakładce Rejestracja.';
      } else if (msg === 'User no longer exists' || msg === 'Invalid or expired token') {
        msg = 'Twoja sesja wygasła. Zaloguj się ponownie.';
      }
      setAuthError(msg);
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setForgotSuccessMessage(null);
    setIsAuthSubmitting(true);
    try {
      const res = await api.auth.forgotPassword({ email });
      setForgotSuccessMessage(res.message);
      showToast('Wysłano prośbę o reset hasła', 'info');
    } catch (err: any) {
      setAuthError(err.message || 'Błąd wysyłania linku resetującego');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!resetToken) {
      setAuthError('Brak tokena resetowania hasła lub link jest nieprawidłowy.');
      return;
    }
    if (password.length < 8) {
      setAuthError('Hasło musi mieć co najmniej 8 znaków.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Wprowadzone hasła nie są identyczne.');
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const res = await api.auth.resetPassword({ token: resetToken, password });
      setResetSuccessMessage(res.message);
      showToast('Hasło zostało pomyślnie zmienione!', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
      setResetToken(null);
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setAuthMode('login');
        setResetSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setAuthError(err.message || 'Błąd resetowania hasła');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const pwdEval = evaluatePassword(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand-center">
          <div className="auth-brand-badge">
            <LayoutDashboard size={22} />
          </div>
          <h1 className="auth-title">Task Manager</h1>
          <p className="auth-subtitle">
            {authMode === 'login' && 'Zaloguj się, aby zarządzać projektami i zadaniami'}
            {authMode === 'register' && 'Stwórz nowe konto i współpracuj ze swoim zespołem'}
            {authMode === 'forgot' && 'Odzyskaj dostęp do swojego konta'}
            {authMode === 'reset' && 'Wprowadź nowe hasło do swojego konta'}
          </p>
        </div>

        {(authMode === 'login' || authMode === 'register') && (
          <div className="auth-tabs-segmented">
            <button
              type="button"
              className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
                setPassword('');
                setConfirmPassword('');
              }}
            >
              Logowanie
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
                setPassword('');
                setConfirmPassword('');
              }}
            >
              Rejestracja
            </button>
          </div>
        )}

        {authError && <div className="error-banner">{authError}</div>}

        {/* Formularz Logowania i Rejestracji */}
        {(authMode === 'login' || authMode === 'register') && (
          <form onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <div className="form-field">
                <label>Imię i nazwisko</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Jan Kowalski"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-field">
              <label>Adres e-mail</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="jan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="form-field">
              <label>Hasło</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder={authMode === 'login' ? 'Wpisz hasło' : 'Minimum 8 znaków'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {authMode === 'register' && password.length > 0 && (
                <div className="strength-meter-box">
                  <div className="strength-meter-header">
                    <span>Siła hasła:</span>
                    <strong style={{ color: pwdEval.color }}>{pwdEval.label}</strong>
                  </div>
                  <div className="strength-meter-track">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className="strength-meter-segment"
                        style={{
                          backgroundColor: pwdEval.score >= step ? pwdEval.color : undefined,
                        }}
                      />
                    ))}
                  </div>
                  <div className="password-criteria-list">
                    <div className={`criterion-item ${pwdEval.criteria.minLength ? 'valid' : 'invalid'}`}>
                      {pwdEval.criteria.minLength ? '✓' : '○'} Min. 8 znaków
                    </div>
                    <div className={`criterion-item ${pwdEval.criteria.hasUpper && pwdEval.criteria.hasLower ? 'valid' : 'invalid'}`}>
                      {pwdEval.criteria.hasUpper && pwdEval.criteria.hasLower ? '✓' : '○'} Mała i wielka litera
                    </div>
                    <div className={`criterion-item ${pwdEval.criteria.hasNumber ? 'valid' : 'invalid'}`}>
                      {pwdEval.criteria.hasNumber ? '✓' : '○'} Przynajmniej jedna cyfra
                    </div>
                    <div className={`criterion-item ${pwdEval.criteria.hasSpecial ? 'valid' : 'invalid'}`}>
                      {pwdEval.criteria.hasSpecial ? '✓' : '○'} Znak specjalny
                    </div>
                  </div>
                </div>
              )}
            </div>

            {authMode === 'register' && (
              <div className="form-field">
                <label>Potwierdź hasło</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    placeholder="Powtórz hasło"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordsMatch && (
                  <div className="match-status valid">✓ Hasła są identyczne</div>
                )}
                {passwordsMismatch && (
                  <div className="match-status invalid">✕ Hasła nie są identyczne</div>
                )}
              </div>
            )}

            <div className="auth-options-row">
              <label className="remember-me-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Zapamiętaj mnie
              </label>
              {authMode === 'login' && (
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => {
                    setAuthMode('forgot');
                    setAuthError(null);
                    setForgotSuccessMessage(null);
                  }}
                >
                  Nie pamiętasz hasła?
                </button>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isAuthSubmitting}
            >
              {isAuthSubmitting
                ? (authMode === 'login' ? 'Logowanie...' : 'Rejestracja...')
                : (authMode === 'login' ? 'Zaloguj się' : 'Zarejestruj się')}
            </button>

            <div className="auth-footer-nav">
              {authMode === 'login' ? (
                <span>
                  Nie masz jeszcze konta?{' '}
                  <button
                    type="button"
                    className="auth-footer-link"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError(null);
                    }}
                  >
                    Zarejestruj się
                  </button>
                </span>
              ) : (
                <span>
                  Masz już konto?{' '}
                  <button
                    type="button"
                    className="auth-footer-link"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                    }}
                  >
                    Zaloguj się
                  </button>
                </span>
              )}
            </div>
          </form>
        )}

        {/* Widok Resetowania Hasła (Forgot) */}
        {authMode === 'forgot' && (
          <div>
            {forgotSuccessMessage ? (
              <div>
                <div className="auth-info-banner">
                  <strong>Wiadomość wysłana!</strong>
                  <p style={{ margin: '8px 0 0 0' }}>{forgotSuccessMessage}</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#86efac' }}>
                    Podgląd poczty testowej w Mailpit:{' '}
                    <a
                      href="http://localhost:8025"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#4ade80', textDecoration: 'underline' }}
                    >
                      http://localhost:8025
                    </a>
                  </p>
                </div>
                <button
                  type="button"
                  className="auth-submit-btn"
                  onClick={() => {
                    setAuthMode('login');
                    setForgotSuccessMessage(null);
                  }}
                >
                  Powrót do logowania
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit}>
                <div className="form-field">
                  <label>Adres e-mail</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="jan@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isAuthSubmitting}
                >
                  {isAuthSubmitting ? 'Wysyłanie...' : 'Wyślij link do resetu hasła'}
                </button>
                <div className="auth-footer-nav">
                  <button
                    type="button"
                    className="auth-footer-link"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                    }}
                  >
                    ← Wróć do logowania
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Widok Resetowania Hasła (Reset z tokenem z URL) */}
        {authMode === 'reset' && (
          <div>
            {resetSuccessMessage ? (
              <div className="auth-info-banner">
                <strong>Sukces!</strong>
                <p style={{ margin: '8px 0 0 0' }}>{resetSuccessMessage}</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '11px' }}>Przekierowywanie do logowania...</p>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit}>
                <div className="form-field">
                  <label>Nowe hasło</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="form-input"
                      placeholder="Minimum 8 znaków"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="strength-meter-box">
                      <div className="strength-meter-header">
                        <span>Siła hasła:</span>
                        <strong style={{ color: pwdEval.color }}>{pwdEval.label}</strong>
                      </div>
                      <div className="strength-meter-track">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className="strength-meter-segment"
                            style={{
                              backgroundColor: pwdEval.score >= step ? pwdEval.color : undefined,
                            }}
                          />
                        ))}
                      </div>
                      <div className="password-criteria-list">
                        <div className={`criterion-item ${pwdEval.criteria.minLength ? 'valid' : 'invalid'}`}>
                          {pwdEval.criteria.minLength ? '✓' : '○'} Min. 8 znaków
                        </div>
                        <div className={`criterion-item ${pwdEval.criteria.hasUpper && pwdEval.criteria.hasLower ? 'valid' : 'invalid'}`}>
                          {pwdEval.criteria.hasUpper && pwdEval.criteria.hasLower ? '✓' : '○'} Mała i wielka litera
                        </div>
                        <div className={`criterion-item ${pwdEval.criteria.hasNumber ? 'valid' : 'invalid'}`}>
                          {pwdEval.criteria.hasNumber ? '✓' : '○'} Przynajmniej jedna cyfra
                        </div>
                        <div className={`criterion-item ${pwdEval.criteria.hasSpecial ? 'valid' : 'invalid'}`}>
                          {pwdEval.criteria.hasSpecial ? '✓' : '○'} Znak specjalny
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-field">
                  <label>Powtórz nowe hasło</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      className="form-input"
                      placeholder="Powtórz nowe hasło"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordsMatch && (
                    <div className="match-status valid">✓ Hasła są identyczne</div>
                  )}
                  {passwordsMismatch && (
                    <div className="match-status invalid">✕ Hasła nie są identyczne</div>
                  )}
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isAuthSubmitting}
                >
                  {isAuthSubmitting ? 'Zapisywanie...' : 'Zapisz nowe hasło'}
                </button>

                <div className="auth-footer-nav">
                  <button
                    type="button"
                    className="auth-footer-link"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                      setResetToken(null);
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }}
                  >
                    ← Anuluj i przejdź do logowania
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
