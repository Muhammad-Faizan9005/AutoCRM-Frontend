import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Code2, Copy, Eye, EyeOff, KeyRound, Save, Trash2, X } from 'lucide-react';
import { apiFetch } from '../api/client';
import { ThemeToggle } from './ThemeToggle';
import { toast } from '../utils/toast';

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
};

const MAX_AVATAR_BYTES = 2_000_000;
const SERVICE_TOKEN_SCOPES = [
  'runs:create',
  'runs:read',
  'traces:create',
  'actions:create',
  'actions:read',
  'settings:read',
];

const formatCredentialDate = (value) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const isAdminUser = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return Boolean(user?.is_admin || user?.is_superuser || role === 'admin');
};

const PasswordField = ({
  label,
  value,
  onChange,
  visibilityKey,
  autoComplete,
  visiblePasswords,
  onToggleVisibility,
}) => {
  const isVisible = visiblePasswords[visibilityKey];
  const Icon = isVisible ? EyeOff : Eye;
  return (
    <div>
      <label className="label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          style={{ paddingRight: 42 }}
        />
        <button
          type="button"
          className="btn-ghost btn-icon"
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => onToggleVisibility(visibilityKey)}
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 30,
            height: 30,
            color: 'var(--color-text-tertiary)',
          }}
        >
          <Icon size={16} />
        </button>
      </div>
    </div>
  );
};

const ProfileSettingsModal = ({ user, onClose, onUserUpdate }) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [developerMode, setDeveloperMode] = useState(Boolean(user?.developer_mode));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [credentialExpiry, setCredentialExpiry] = useState('365');
  const [credentials, setCredentials] = useState([]);
  const [createdCredential, setCreatedCredential] = useState(null);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);
  const [isCreatingCredential, setIsCreatingCredential] = useState(false);
  const [revokingCredentialId, setRevokingCredentialId] = useState(null);
  const initializedUserId = useRef(null);
  const canUseDeveloperMode = isAdminUser(user);
  const canUseServiceCredentials = canUseDeveloperMode && (developerMode || Boolean(user?.developer_mode));

  useEffect(() => {
    if (initializedUserId.current === user?.id) return;
    initializedUserId.current = user?.id || null;
    setFullName(user?.full_name || '');
    setEmail(user?.email || '');
    setAvatarUrl(user?.avatar_url || '');
    setDeveloperMode(Boolean(user?.developer_mode));
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setVisiblePasswords({ current: false, next: false, confirm: false });
    setCreatedCredential(null);
  }, [user?.avatar_url, user?.developer_mode, user?.email, user?.full_name, user?.id]);

  useEffect(() => {
    setDeveloperMode(Boolean(user?.developer_mode));
  }, [user?.developer_mode]);

  const loadServiceCredentials = async () => {
    if (!canUseServiceCredentials) return;
    setIsLoadingCredentials(true);
    try {
      const rows = await apiFetch('/api/agent/service-credentials', {}, { cache: false, timeoutMs: 15000 });
      setCredentials(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setCredentials([]);
      toast.error(error?.message || 'Unable to load service credentials.');
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  useEffect(() => {
    if (!canUseServiceCredentials) {
      setCreatedCredential(null);
      setCredentials([]);
      return;
    }

    loadServiceCredentials();
  }, [canUseServiceCredentials]);

  const displayName = fullName || user?.email || 'User';

  const togglePasswordVisibility = (key) => {
    setVisiblePasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Profile image must be under 2 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingAvatar(true);
    try {
      const updatedUser = await apiFetch('/api/auth/avatar', {
        method: 'POST',
        body: formData,
      }, { cache: false, timeoutMs: 15000 });
      setAvatarUrl(updatedUser?.avatar_url || '');
      onUserUpdate?.(updatedUser);
      toast.success('Profile photo uploaded.');
    } catch (error) {
      toast.error(error?.message || 'Unable to upload profile photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    setIsUploadingAvatar(true);
    try {
      const updatedUser = await apiFetch('/api/auth/avatar', {
        method: 'DELETE',
      }, { cache: false, timeoutMs: 15000 });
      setAvatarUrl('');
      onUserUpdate?.(updatedUser);
      toast.success('Profile photo removed.');
    } catch (error) {
      toast.error(error?.message || 'Unable to remove profile photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedName.length < 2) {
      toast.error('Name must be at least 2 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Enter a valid email address.');
      return;
    }
    const emailChanged = trimmedEmail !== String(user?.email || '').trim().toLowerCase();
    if (newPassword || currentPassword || confirmPassword || emailChanged) {
      if (!currentPassword) {
        toast.error(emailChanged ? 'Enter your current password to change your email.' : 'Enter your current password to change it.');
        return;
      }
      if (newPassword && newPassword.length < 6) {
        toast.error('New password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match.');
        return;
      }
    }

    const payload = {
      full_name: trimmedName,
      email: trimmedEmail,
    };
    if (canUseDeveloperMode) {
      payload.settings = { developer_mode: developerMode };
    }
    if (newPassword || emailChanged) {
      payload.current_password = currentPassword;
    }
    if (newPassword) {
      payload.new_password = newPassword;
    }

    setIsSaving(true);
    try {
      const updatedUser = await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }, { cache: false, timeoutMs: 15000 });
      onUserUpdate?.(updatedUser);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setVisiblePasswords({ current: false, next: false, confirm: false });
      toast.success('Profile settings saved.');
    } catch (error) {
      toast.error(error?.message || 'Unable to update profile settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const createdTokenSnippet = createdCredential?.raw_token
    ? `AUTOCRM_AI_SERVICE_TOKEN=${createdCredential.raw_token}`
    : '';

  const handleCreateCredential = async () => {
    setIsCreatingCredential(true);
    setCreatedCredential(null);
    try {
      const expiresInDays = credentialExpiry === 'none' ? null : Number(credentialExpiry);
      const credential = await apiFetch('/api/agent/service-credentials', {
        method: 'POST',
        body: JSON.stringify({
          scopes: SERVICE_TOKEN_SCOPES,
          expires_in_days: expiresInDays,
        }),
      }, { cache: false, timeoutMs: 15000 });
      setCreatedCredential(credential);
      await loadServiceCredentials();
      toast.success('Service token generated.');
    } catch (error) {
      toast.error(error?.message || 'Unable to generate service token.');
    } finally {
      setIsCreatingCredential(false);
    }
  };

  const handleRevokeCredential = async (credentialId) => {
    if (!credentialId) return;
    setRevokingCredentialId(credentialId);
    try {
      await apiFetch(`/api/agent/service-credentials/${credentialId}`, {
        method: 'DELETE',
      }, { cache: false, timeoutMs: 15000 });
      if (createdCredential?.id === credentialId) {
        setCreatedCredential(null);
      }
      await loadServiceCredentials();
      toast.success('Service token revoked.');
    } catch (error) {
      toast.error(error?.message || 'Unable to revoke service token.');
    } finally {
      setRevokingCredentialId(null);
    }
  };

  const handleCopyTokenSnippet = async () => {
    if (!createdTokenSnippet) return;
    try {
      await navigator.clipboard.writeText(createdTokenSnippet);
      toast.success('Service token copied.');
    } catch {
      toast.error('Unable to copy token.');
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        initial={{ opacity: 0, scale: 0.97, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h3 id="profile-settings-title" className="section-title" style={{ margin: 0 }}>Profile Settings</h3>
              <p style={{ marginTop: 4, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                Manage your account identity and password.
              </p>
            </div>
            <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close profile settings">
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: 20, display: 'grid', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                className="avatar avatar-accent"
                style={{
                  width: 72,
                  height: 72,
                  fontSize: 22,
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials(displayName)
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <label className="btn btn-secondary" style={{ cursor: isUploadingAvatar ? 'default' : 'pointer', opacity: isUploadingAvatar ? 0.75 : 1 }}>
                  <Camera size={15} /> {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
                  <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={isUploadingAvatar} style={{ display: 'none' }} />
                </label>
                {avatarUrl && (
                  <button type="button" className="btn btn-ghost" onClick={handleAvatarRemove} disabled={isUploadingAvatar}>
                    <Trash2 size={15} /> Remove
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                className="input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
              {email.trim().toLowerCase() !== String(user?.email || '').trim().toLowerCase() && (
                <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  Current password is required to change your email.
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderTop: '1px solid var(--color-border)',
              paddingTop: 16,
            }}>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
                  Theme
                </div>
                <div style={{ marginTop: 3, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  Switch between light and dark workspace modes.
                </div>
              </div>
              <ThemeToggle />
            </div>

            {canUseDeveloperMode && (
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'grid', gap: 14 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
                      <Code2 size={16} /> Developer Mode
                    </div>
                    <div style={{ marginTop: 3, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      Show technical AI payloads and diagnostic details in admin tools.
                    </div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                    <input
                      type="checkbox"
                      checked={developerMode}
                      onChange={(event) => setDeveloperMode(event.target.checked)}
                    />
                    {developerMode ? 'On' : 'Off'}
                  </label>
                </div>

                {canUseServiceCredentials && (
                  <div style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: 14,
                    display: 'grid',
                    gap: 12,
                    background: 'var(--color-surface-secondary)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
                          <KeyRound size={16} /> AI Service Credentials
                        </div>
                        <div style={{ marginTop: 3, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                          Generate copy-once tokens for backend-authenticated AI workers.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, alignItems: 'end' }}>
                      <div>
                        <label className="label">Expiry</label>
                        <select className="input" value={credentialExpiry} onChange={(event) => setCredentialExpiry(event.target.value)}>
                          <option value="90">90 days</option>
                          <option value="365">365 days</option>
                          <option value="none">No expiry</option>
                        </select>
                      </div>
                      <button type="button" className="btn btn-primary" onClick={handleCreateCredential} disabled={isCreatingCredential}>
                        <KeyRound size={15} /> {isCreatingCredential ? 'Generating...' : 'Generate'}
                      </button>
                    </div>

                    {createdCredential?.raw_token && (
                      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, display: 'grid', gap: 10, background: 'var(--color-surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
                              New AI service token
                            </div>
                            <div style={{ marginTop: 3, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                              Copy it now; it will not be shown again.
                            </div>
                          </div>
                          <button type="button" className="btn btn-secondary" onClick={handleCopyTokenSnippet}>
                            <Copy size={15} /> Copy
                          </button>
                        </div>
                        <textarea
                          className="input"
                          readOnly
                          value={createdTokenSnippet}
                          rows={3}
                          style={{ fontFamily: 'var(--font-mono, monospace)', resize: 'vertical' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 0, color: 'var(--color-text-tertiary)', fontWeight: 'var(--weight-semibold)' }}>
                        Existing tokens
                      </div>
                      {isLoadingCredentials ? (
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Loading credentials...</div>
                      ) : credentials.length === 0 ? (
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>No service tokens yet.</div>
                      ) : (
                        credentials.map((credential) => {
                          const isActive = credential.is_active !== false && !credential.revoked_at;
                          return (
                            <div
                              key={credential.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                                gap: 10,
                                alignItems: 'center',
                                border: '1px solid var(--color-border)',
                                borderRadius: 8,
                                padding: 10,
                                background: 'var(--color-surface)',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Prefix</div>
                                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                                  {credential.key_prefix}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Expires</div>
                                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                                  {credential.expires_at ? formatCredentialDate(credential.expires_at) : 'No expiry'}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Last used</div>
                                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                                  {formatCredentialDate(credential.last_used_at)}
                                </div>
                              </div>
                              <button
                                type="button"
                                className={isActive ? 'btn btn-ghost' : 'btn btn-secondary'}
                                onClick={() => handleRevokeCredential(credential.id)}
                                disabled={!isActive || revokingCredentialId === credential.id}
                              >
                                <Trash2 size={15} /> {isActive ? (revokingCredentialId === credential.id ? 'Revoking...' : 'Revoke') : 'Revoked'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-primary)', fontWeight: 'var(--weight-semibold)' }}>
                <KeyRound size={16} /> Change Password
              </div>
              <PasswordField
                label="Current Password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                visibilityKey="current"
                autoComplete="current-password"
                visiblePasswords={visiblePasswords}
                onToggleVisibility={togglePasswordVisibility}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <PasswordField
                  label="New Password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  visibilityKey="next"
                  autoComplete="new-password"
                  visiblePasswords={visiblePasswords}
                  onToggleVisibility={togglePasswordVisibility}
                />
                <PasswordField
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  visibilityKey="confirm"
                  autoComplete="new-password"
                  visiblePasswords={visiblePasswords}
                  onToggleVisibility={togglePasswordVisibility}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              <Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default ProfileSettingsModal;
