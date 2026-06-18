import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Eye, EyeOff, KeyRound, Save, Trash2, X } from 'lucide-react';
import { apiFetch } from '../api/client';
import { ThemeToggle } from './ThemeToggle';
import { toast } from '../utils/toast';

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
};

const MAX_AVATAR_BYTES = 2_000_000;

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
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
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
  const initializedUserId = useRef(null);

  useEffect(() => {
    if (initializedUserId.current === user?.id) return;
    initializedUserId.current = user?.id || null;
    setFullName(user?.full_name || '');
    setAvatarUrl(user?.avatar_url || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setVisiblePasswords({ current: false, next: false, confirm: false });
  }, [user?.avatar_url, user?.full_name, user?.id]);

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
    if (trimmedName.length < 2) {
      toast.error('Name must be at least 2 characters.');
      return;
    }
    if (newPassword || currentPassword || confirmPassword) {
      if (!currentPassword) {
        toast.error('Enter your current password to change it.');
        return;
      }
      if (newPassword.length < 6) {
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
    };
    if (newPassword) {
      payload.current_password = currentPassword;
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
        style={{ maxWidth: 560 }}
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
              <input className="input" value={user?.email || ''} disabled />
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
