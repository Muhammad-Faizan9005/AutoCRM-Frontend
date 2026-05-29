import { useCallback, useRef, useState } from 'react';

const pickMimeType = () => {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

export const useCallRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const chunksRef = useRef([]);
  const recorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const destinationRef = useRef(null);
  const remoteSourcesRef = useRef([]);
  const localSourceRef = useRef(null);
  const monitorGainRef = useRef(null);

  const start = useCallback(async (localStream) => {
    if (!localStream) return null;
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('Recording is not supported in this browser.');
    }

    const audioContext = new AudioContext();
    await audioContext.resume();
    const destination = audioContext.createMediaStreamDestination();

    const localSource = audioContext.createMediaStreamSource(localStream);
    localSource.connect(destination);
    localSourceRef.current = localSource;

    // Keep the audio graph alive without audible output.
    const monitorGain = audioContext.createGain();
    monitorGain.gain.value = 0;
    localSource.connect(monitorGain);
    monitorGain.connect(audioContext.destination);
    monitorGainRef.current = monitorGain;

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);

    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onpause = () => {
      setIsPaused(true);
    };

    recorder.onresume = () => {
      setIsPaused(false);
    };

    recorderRef.current = recorder;
    audioContextRef.current = audioContext;
    destinationRef.current = destination;

    recorder.start(10000);
    setIsRecording(true);
    setIsPaused(false);

    return mimeType || recorder.mimeType || 'audio/webm';
  }, []);

  const attachRemoteStream = useCallback((remoteStream) => {
    if (!audioContextRef.current || !destinationRef.current || !remoteStream) {
      return;
    }

    const source = audioContextRef.current.createMediaStreamSource(remoteStream);
    source.connect(destinationRef.current);
    if (monitorGainRef.current) {
      source.connect(monitorGainRef.current);
    }
    remoteSourcesRef.current.push(source);
  }, []);

  const stop = useCallback(() => new Promise((resolve) => {
    const recorder = recorderRef.current;
    if (!recorder) {
      resolve({ blob: null, mimeType: 'audio/webm' });
      return;
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      setIsRecording(false);
      setIsPaused(false);
      chunksRef.current = [];
      remoteSourcesRef.current.forEach((source) => source.disconnect());
      remoteSourcesRef.current = [];
      if (localSourceRef.current) {
        localSourceRef.current.disconnect();
        localSourceRef.current = null;
      }
      if (monitorGainRef.current) {
        monitorGainRef.current.disconnect();
        monitorGainRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      destinationRef.current = null;
      recorderRef.current = null;

      resolve({ blob, mimeType: recorder.mimeType || 'audio/webm' });
    };

    recorder.stop();
  }), []);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.pause();
  }, []);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    recorder.resume();
  }, []);

  return {
    isRecording,
    isPaused,
    start,
    stop,
    pause,
    resume,
    attachRemoteStream,
  };
};
