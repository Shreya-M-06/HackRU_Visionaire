
'use client';

import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export default function HandTracker({ onHandMove, enabled = false }) {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const callbackRef = useRef(onHandMove);
  const [status, setStatus] = useState('Camera off');
  const [error, setError] = useState('');

  useEffect(() => {
    callbackRef.current = onHandMove;
  }, [onHandMove]);

  useEffect(() => {
    if (!enabled) {
      setStatus('Camera off');
      setError('');
      return;
    }

    let cancelled = false;
    let stream;
    let animationId;
    let landmarker;

    async function startCamera() {
      try {
        setError('');
        setStatus('Loading hand tracking…');

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access is not available in this browser.');
        }

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          landmarker.close();
          return;
        }

        const video = videoRef.current;
        if (!video) throw new Error('Camera preview could not be initialized.');

        video.srcObject = stream;
        await video.play();

        setStatus('Camera on — show your hand');

        function predict() {
          if (cancelled || !videoRef.current || !landmarkerRef.current) return;

          const currentVideo = videoRef.current;

          if (currentVideo.readyState >= 2) {
            const results = landmarkerRef.current.detectForVideo(
              currentVideo,
              performance.now()
            );

            if (results.landmarks?.length) {
              const hand = results.landmarks[0];
              const thumb = hand[4];
              const indexFinger = hand[8];

              const pinchDistance = Math.hypot(
                thumb.x - indexFinger.x,
                thumb.y - indexFinger.y,
                thumb.z - indexFinger.z
              );

              callbackRef.current?.({
                handX: 1 - indexFinger.x,
                handY: indexFinger.y,
                pinchDistance,
              });

              setStatus('Hand detected');
            } else {
              setStatus('Camera on — show your hand');
            }
          }

          animationId = requestAnimationFrame(predict);
        }

        predict();
      } catch (err) {
        console.error('Hand tracking error:', err);

        if (!cancelled) {
          setError(
            err.name === 'NotAllowedError'
              ? 'Camera permission was denied. Allow camera access in your browser settings.'
              : err.message || 'Could not start hand tracking.'
          );
          setStatus('Could not start camera');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (animationId) cancelAnimationFrame(animationId);
      stream?.getTracks().forEach((track) => track.stop());
      landmarker?.close();
      landmarkerRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        width: 200,
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 12,
        padding: 8,
        zIndex: 20,
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: 120,
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          borderRadius: 8,
          background: '#020617',
        }}
      />
      <p style={{ fontSize: 11, color: '#bae6fd', marginTop: 6 }}>
        {status}
      </p>
      {error && (
        <p style={{ fontSize: 11, color: '#fca5a5', marginTop: 4 }}>
          {error}
        </p>
      )}
    </div>
  );
}
