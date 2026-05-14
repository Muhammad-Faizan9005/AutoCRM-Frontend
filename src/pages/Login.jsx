import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch, setTokens } from '../api/client';
import { logger } from '../utils/logger';

export default function Login({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: email.trim(),
        password,
      };

      const data = await apiFetch(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        { skipAuth: true, retryOn401: false }
      );

      setTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
      onLogin(data.user);
      logger.info('auth.login.success');
    } catch (err) {
      logger.warn('auth.login.failed', { status: err?.status || 'unknown' });
      const message = err?.message || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLink = () => {
    alert('Email link login feature coming soon!');
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
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 52,
            height: 52,
            background: 'var(--color-accent)',
            borderRadius: 'var(--radius-lg)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-lg)',
            marginBottom: 12,
          }}>
            <span style={{
              color: 'var(--color-text-inverse)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
            }}>CRM</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--color-text-primary)',
          }}>
            AutoCRM
          </h1>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-tertiary)',
            marginTop: 4,
          }}>
            Sign in to your workspace
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleLogin}>

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

            {/* Email */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label className="label">Email or Username</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-tertiary)',
                }} />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label className="label">Password</label>
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
                  autoComplete="new-password"
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

            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <a href="#" style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-tertiary)',
                textDecoration: 'none',
              }}>
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 16px', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ position: 'relative', margin: '20px 0' }}>
            <hr className="separator" />
            <span style={{
              position: 'absolute',
              top: '-9px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--color-bg-surface)',
              padding: '0 8px',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
            }}>or</span>
          </div>

          <button
            onClick={handleEmailLink}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '10px 16px', fontSize: 'var(--text-base)' }}
          >
            Login with Email Link
          </button>
        </div>
      </motion.div>
    </div>
  );
}
