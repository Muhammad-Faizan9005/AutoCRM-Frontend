import { useCallback, useRef, useState } from 'react';

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
];

const buildWsUrl = (roomId, token) => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const wsBase = apiBase.replace('https://', 'wss://').replace('http://', 'ws://');
  const search = new URLSearchParams({ token });
  return `${wsBase}/api/calls/ws/calls/${roomId}?${search.toString()}`;
};

export const useCallSession = () => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);

  const peerRef = useRef(null);
  const wsRef = useRef(null);
  const startingRef = useRef(false);
  const callerRef = useRef(false);
  const localStreamRef = useRef(null);

  const cleanup = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.close();
      peerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'Call ended');
      } catch (err) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    const streamToStop = localStreamRef.current || localStream;
    if (streamToStop) {
      streamToStop.getTracks().forEach((track) => track.stop());
    }
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setRecordingActive(false);
    setStatus('ended');
  }, [localStream]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const next = !muted;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [localStream, muted]);

  const start = useCallback(async ({ roomId, token, isCaller }) => {
    if (startingRef.current || status === 'connecting' || status === 'active' || wsRef.current) {
      return;
    }
    startingRef.current = true;
    callerRef.current = Boolean(isCaller);
    setError('');
    setStatus('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      setLocalStream(stream);
      localStreamRef.current = stream;

      const peer = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
      peerRef.current = peer;

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.ontrack = (event) => {
        const [remote] = event.streams;
        if (remote) {
          setRemoteStream(remote);
          setStatus('active');
        }
      };

      peer.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ice', candidate: event.candidate }));
        }
      };

      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        if (state === 'failed' || state === 'disconnected') {
          setError('Connection lost.');
          cleanup();
        }
      };

      const ws = new WebSocket(buildWsUrl(roomId, token));
      wsRef.current = ws;

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data || '{}');
        if (message.type === 'recording') {
          setRecordingActive(Boolean(message.active));
          return;
        }
        if (message.type === 'ready' && callerRef.current) {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: 'offer', sdp: offer }));
        }
        if (message.type === 'offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
        }
        if (message.type === 'answer') {
          await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
        }
        if (message.type === 'ice' && message.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
        if (message.type === 'end') {
          cleanup();
        }
      };

      ws.onopen = () => {};

      ws.onerror = () => {
        setError('Unable to connect to signaling server.');
      };

      ws.onclose = (event) => {
        if (event?.code === 4401) {
          setError('Call link is invalid or expired.');
        } else if (event?.code === 4403) {
          setError('Call already has two participants.');
        } else if (event?.code === 1011) {
          setError('Server error while connecting to call.');
        } else if (event?.code === 1006) {
          setError('Signaling connection failed.');
        }

        if (status !== 'ended') {
          cleanup();
        }
      };
    } catch (err) {
      setError(err?.message || 'Microphone access denied.');
      setStatus('error');
    } finally {
      startingRef.current = false;
    }
  }, [cleanup, status]);

  const end = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
    }
    cleanup();
  }, [cleanup]);

  const sendSignal = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return {
    status,
    error,
    localStream,
    remoteStream,
    muted,
    recordingActive,
    start,
    end,
    toggleMute,
    sendSignal,
  };
};
