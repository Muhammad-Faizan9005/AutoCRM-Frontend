import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';

const INITIAL_FORM = {
  full_name: '',
  password: '',
  confirm: '',
};

const AcceptInvite = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [invite, setInvite] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      setError('Invite token is missing.');
      setLoading(false);
      return () => {};
    }

    const loadInvite = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch(`/api/invites/validate?token=${encodeURIComponent(token)}`);
        if (active) {
          setInvite(data);
        }
      } catch (err) {
        if (active) {
          setError(err?.data?.detail || 'Invite is invalid or expired.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadInvite();
    return () => {
      active = false;
    };
  }, [token]);

  const submit = async () => {
    if (!invite) return;
    const fullName = form.full_name.trim();
    if (fullName.length < 2) {
      setError('Full name must have at least 2 characters.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({
          token,
          full_name: fullName,
          password: form.password,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err?.data?.detail || 'Failed to accept invite.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'var(--color-bg-base)',
    }}>
      <div className="card" style={{ maxWidth: 520, width: '100%', padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-text-tertiary)' }}>
            Invitation
          </div>
          <h1 className="page-title" style={{ fontSize: 'var(--text-2xl)', marginTop: 6 }}>
            Accept your invite
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 6 }}>
            Complete your profile to activate your account.
          </p>
        </div>

        {loading && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
            Checking your invite...
          </div>
        )}

        {!loading && error && (
          <div style={{ marginTop: 12, padding: 10, background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}

        {!loading && invite && !success && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Email</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{invite.email}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Role</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{invite.role}</div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label className="label">Full name</label>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Create a password"
                />
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input
                  type="password"
                  className="input"
                  value={form.confirm}
                  onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder="Re-enter your password"
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Activate account'}
            </button>
          </div>
        )}

        {!loading && success && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Your account is active. You can now sign in.
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Go to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
