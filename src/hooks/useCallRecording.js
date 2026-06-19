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
  const recorderRef = useRef(null);
  const chunkIndexRef = useRef(0);
  const pendingUploadsRef = useRef([]);
  const failedUploadsRef = useRef([]);
  const onChunkRef = useRef(null);
  const audioContextRef = useRef(null);
  const destinationRef = useRef(null);
  const remoteSourcesRef = useRef([]);
  const attachedRemoteIdsRef = useRef(new Set());
  const localSourceRef = useRef(null);
  const monitorGainRef = useRef(null);

  const start = useCallback(async (localStream, options = {}) => {
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

    chunkIndexRef.current = 0;
    pendingUploadsRef.current = [];
    failedUploadsRef.current = [];
    onChunkRef.current = typeof options.onChunk === 'function' ? options.onChunk : null;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        const chunkIndex = chunkIndexRef.current;
        chunkIndexRef.current += 1;
        const uploadPromise = Promise.resolve(
          onChunkRef.current?.({
            blob: event.data,
            chunkIndex,
            mimeType: recorder.mimeType || mimeType || 'audio/webm',
          })
        ).catch((error) => {
          failedUploadsRef.current.push({ chunkIndex, error });
        });
        pendingUploadsRef.current.push(uploadPromise);
        uploadPromise.finally(() => {
          pendingUploadsRef.current = pendingUploadsRef.current.filter((pending) => pending !== uploadPromise);
        });
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

    recorder.start(options.timesliceMs || 8000);
    setIsRecording(true);
    setIsPaused(false);

    return mimeType || recorder.mimeType || 'audio/webm';
  }, []);

  const attachRemoteStream = useCallback((remoteStream) => {
    if (!audioContextRef.current || !destinationRef.current || !remoteStream) {
      return;
    }

    const streamKey = remoteStream.id || remoteStream.getAudioTracks().map((track) => track.id).join(':');
    if (attachedRemoteIdsRef.current.has(streamKey)) {
      return;
    }
    attachedRemoteIdsRef.current.add(streamKey);

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
      resolve({ mimeType: 'audio/webm', failedUploads: [] });
      return;
    }

    recorder.onstop = async () => {
      await Promise.allSettled(pendingUploadsRef.current);
      const failedUploads = [...failedUploadsRef.current];
      setIsRecording(false);
      setIsPaused(false);
      pendingUploadsRef.current = [];
      failedUploadsRef.current = [];
      onChunkRef.current = null;
      remoteSourcesRef.current.forEach((source) => source.disconnect());
      remoteSourcesRef.current = [];
      attachedRemoteIdsRef.current.clear();
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

      resolve({ mimeType: recorder.mimeType || 'audio/webm', failedUploads });
    };

    if (recorder.state === 'recording' || recorder.state === 'paused') {
      try {
        recorder.requestData();
      } catch {
        // requestData can throw if the recorder has already flushed.
      }
      recorder.stop();
    } else {
      resolve({ mimeType: recorder.mimeType || 'audio/webm', failedUploads: [...failedUploadsRef.current] });
    }
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
