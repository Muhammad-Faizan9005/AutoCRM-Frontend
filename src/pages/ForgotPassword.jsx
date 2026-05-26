import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim() }),
        },
        { skipAuth: true, retryOn401: false }
      );
      setMessage(data?.message || 'If the email exists, a reset link has been sent.');
    } catch (err) {
      setError(err?.message || 'Unable to send reset link.');
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
              <label className="label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-tertiary)',
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 16px', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)' }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
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
