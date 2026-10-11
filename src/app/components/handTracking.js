'use client';
import { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export default function HandTracker({ onHandMove }) {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => {
    async function initMediaPipe() {
      // 1. FIX: Fetch the exact required open-source vision WebAssembly assets from Google's CDN
      const vision = await FilesetResolver.forVisionTasks(
        "https://jsdelivr.net"
      );

      // 2. FIX: Initialize the Hand Tracker model using the full Google Storage asset address
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://googleapis.com",
          delegate: "GPU" // Utilizes the user's hardware graphics card for smooth frame rates
        },
        runningMode: "VIDEO",
        numHands: 1
      });

      // 3. Request webcam video stream permissions
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predictLoop);
        }
      }
    }

    // 4. Real-time vision deduction loop
    const predictLoop = () => {
      if (videoRef.current && landmarkerRef.current) {
        const now = performance.now();
        const results = landmarkerRef.current.detectForVideo(videoRef.current, now);

        // If a hand is visible in the webcam window frame
        if (results.landmarks && results.landmarks.length > 0) {
          const hand = results.landmarks[0];
          
          // Index Finger Tip (Landmark #8) & Thumb Tip (Landmark #4)
          const thumb = hand[4];
          const indexFinger = hand[8];

          // Compute geometric distance (3D Euclidean Distance) for Pinch Gestures
          const pinchDistance = Math.sqrt(
            Math.pow(thumb.x - indexFinger.x, 2) +
            Math.pow(thumb.y - indexFinger.y, 2) +
            Math.pow(thumb.z - indexFinger.z, 2)
          );

          // Pass structural tracking coordinates up to the Visionaire interactive canvas dashboard
          onHandMove({
            handX: indexFinger.x,        // Hand horizontal tracking location (0 to 1)
            handY: indexFinger.y,        // Hand vertical tracking location (0 to 1)
            pinchDistance: pinchDistance // Small number = fingers closed, large number = fingers wide open
          });
        }
      }
      requestRef.current = requestAnimationFrame(predictLoop);
    };

    initMediaPipe();

    // Clean up tracking loops and camera usage if component unmounts
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [onHandMove]);

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, width: 160, height: 120, borderRadius: '12px', overflow: 'hidden', border: '3px solid #3b82f6', zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
      <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(59, 130, 246, 0.85)', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        MediaPipe Live
      </div>
    </div>
  );
}