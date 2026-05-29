import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Phone, PhoneOff } from 'lucide-react';
import { useCallSession } from '../hooks/useCallSession';
import { PageTransition } from '../components/PageTransition';

const useQuery = () => new URLSearchParams(useLocation().search);

const CallJoin = () => {
  const query = useQuery();
  const roomId = query.get('room') || '';
  const token = query.get('token') || '';
  const [started, setStarted] = useState(false);
  const [timer, setTimer] = useState(0);
  const startedRef = useRef(false);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [callEnded, setCallEnded] = useState(false);

  const {
    status,
    error,
    start,
    end,
    muted,
    toggleMute,
    localStream,
    remoteStream,
    recordingActive,
  } = useCallSession();

  const canStart = useMemo(() => roomId && token, [roomId, token]);
  const controlsEnabled = useMemo(() => Boolean(roomId && token), [roomId, token]);

  useEffect(() => {
    if (canStart && !started && !startedRef.current) {
      startedRef.current = true;
      start({ roomId, token, isCaller: false });
      setStarted(true);
    }
  }, [canStart, roomId, token, start, started]);


  useEffect(() => {
    if (status === 'active') {
      const interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
    setTimer(0);
    return undefined;
  }, [status]);

  useEffect(() => {
    if (status === 'ended') {
      setCallEnded(true);
    }
  }, [status]);

  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
      localAudioRef.current.muted = true;
      localAudioRef.current.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  const formattedTimer = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`;

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 560, borderRadius: 20, border: '1px solid var(--color-border)', padding: 24, background: 'var(--color-bg-surface)', boxShadow: 'var(--shadow-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 600 }}>AutoCRM Call</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>{formattedTimer}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={18} color="var(--color-accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>AutoCRM Call</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{status === 'active' ? 'Connected' : 'Connecting...'}</div>
            </div>
          </div>

          {recordingActive && (
            <div style={{ padding: 10, borderRadius: 8, background: 'var(--color-warning-subtle)', color: 'var(--color-warning)', fontSize: 13, marginBottom: 12 }}>
              Recording is active
            </div>
          )}

          {!canStart && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', fontSize: 13 }}>
              Missing room or token. Please use the invite link again.
            </div>
          )}

          {error && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={toggleMute} disabled={!controlsEnabled}>
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                end();
                setCallEnded(true);
              }}
              disabled={!controlsEnabled}
            >
              <PhoneOff size={14} /> End call
            </button>
          </div>
          {callEnded && (
            <div style={{ marginTop: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Call has ended. You may close this tab now.
            </div>
          )}
          <audio ref={localAudioRef} autoPlay playsInline style={{ display: 'none' }} />
          <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
        </div>
      </div>
    </PageTransition>
  );
};

export default CallJoin;
