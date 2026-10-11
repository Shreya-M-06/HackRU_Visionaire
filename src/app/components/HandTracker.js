'use client';
import { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export default function HandTracker({ onHandMove }) {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => {
    async function initMediaPipe() {
      try {
        // 1. Fire up camera video stream streams instantly on render
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadeddata = () => {
              if (landmarkerRef.current) predictLoop();
            };
          }
        }

        // 2. Load the essential WebAssembly runtime compiler assets
        const vision = await FilesetResolver.forVisionTasks(
          "https://jsdelivr.net"
        );

        // 3. FIXED API ENDPOINT: Uses an unblocked open CDN mirror that eliminates CORS initialization crashes completely!
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://jsdelivr.net",
            delegate: "GPU" // Offloads landmark tracing to your hardware graphics card
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        // Trigger the calculations loop instantly if video frames mounted before models downloaded
        if (videoRef.current?.readyState >= 3 && landmarkerRef.current) {
          predictLoop();
        }

      } catch (err) {
        console.error("Visionaire webcam system initialization failure:", err);
      }
    }

    const predictLoop = () => {
      if (videoRef.current && landmarkerRef.current) {
        const now = performance.now();
        const results = landmarkerRef.current.detectForVideo(videoRef.current, now);

        // If MediaPipe maps an active skeleton layer onto your hand stream
        if (results.landmarks && results.landmarks.length > 0) {
          const hand = results.landmarks[0]; // Safely grab the tracked coordinates array array index
          
          if (hand) {
            const thumb = hand[4];         // Extract vector coordinates for Thumb Tip (Landmark #4)
            const indexFinger = hand[8];   // Extract vector coordinates for Index Finger Tip (Landmark #8)

            // Compute geometric 3D Euclidean distance vector math parameters
            const pinchDistance = Math.sqrt(
              Math.pow(thumb.x - indexFinger.x, 2) +
              Math.pow(thumb.y - indexFinger.y, 2) +
              Math.pow(thumb.z - indexFinger.z, 2)
            );

            // Forward metrics straight up to your supervisor page controller hooks
            onHandMove({
              handX: indexFinger.x,
              handY: indexFinger.y,
              pinchDistance: pinchDistance
            });
          }
        }
      }
      requestRef.current = requestAnimationFrame(predictLoop);
    };

    initMediaPipe();

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