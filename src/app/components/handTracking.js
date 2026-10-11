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
        // STEP A: Request camera access IMMEDIATELY so the browser permission pop-up appears instantly
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

        // STEP B: Securely fetch the compiled vision WebAssembly assets from the CDN
        const vision = await FilesetResolver.forVisionTasks(
          "https://jsdelivr.net"
        );

        // STEP C: Initialize the machine learning framework locally on the GPU
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://googleapis.com",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        // Trigger the monitoring frame loop if the video stream mounted first
        if (videoRef.current?.readyState >= 3) {
          predictLoop();
        }

      } catch (err) {
        console.error("Visionaire tracking initialization error:", err);
      }
    }

    // Real-time tracking coordination logic
    const predictLoop = () => {
      if (videoRef.current && landmarkerRef.current) {
        const now = performance.now();
        const results = landmarkerRef.current.detectForVideo(videoRef.current, now);

        // If a skeleton tracking overlay maps onto an active hand stream
        if (results.landmarks && results.landmarks.length > 0) {
          // Extract the direct collection layout array 
          const hand = results.landmarks[0];
          
          if (hand && hand[4] && hand[8]) {
            const thumb = hand[4];         // Precise Thumb Tip tracking vector position
            const indexFinger = hand[8];   // Precise Index Finger Tip tracking vector position

            // Compute the real-time distance between your finger tips
            const pinchDistance = Math.sqrt(
              Math.pow(thumb.x - indexFinger.x, 2) +
              Math.pow(thumb.y - indexFinger.y, 2) +
              Math.pow(thumb.z - indexFinger.z, 2)
            );

            // Stream coordinates straight up to your master page controller hooks
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

    // Safely turn off stream connections and trackers if views shift
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
