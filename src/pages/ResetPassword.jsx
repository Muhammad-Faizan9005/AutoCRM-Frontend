import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(location.search).get('token') || '', [location.search]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token is missing.');
      return;
    }

    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch(
        '/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify({ token, password }),
        },
        { skipAuth: true, retryOn401: false }
      );
      setMessage(data?.message || 'Password reset successful.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err?.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', maxWidth: 380 }}
      >
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <img
              src="/brand/autocrm-lockup.svg"
              alt="AutoCRM"
              style={{ width: 180, height: 'auto', display: 'block' }}
            />
            <div style={{ width: '100%', height: 1, background: 'var(--color-border)', opacity: 0.6 }} />
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                marginBottom: 16,
                padding: 12,
                background: 'var(--color-danger-subtle)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-danger)',
              }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{
                marginBottom: 16,
                padding: 12,
                background: 'var(--color-success-subtle)',
                border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-success)',
              }}>
                {message}
              </div>
            )}

            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label className="label">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-tertiary)',
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-tertiary)',
                    display: 'flex',
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label className="label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-tertiary)',
                }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-tertiary)',
                    display: 'flex',
                    padding: 4,
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 16px', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)' }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Link
              to="/login"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-tertiary)',
                textDecoration: 'none',
              }}
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
