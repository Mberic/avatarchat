"use client";

import "../style.css";
import { useEffect, useRef, useState } from "react";
import dynamic from 'next/dynamic';
import { StreamrClient }  from "@streamr/sdk";
import * as dotenv from 'dotenv';
dotenv.config();

const VideoStream = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasSubRef = useRef(null);
  const contextRef = useRef(null);
  const contextSubRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [streamrClient, setStreamrClient] = useState(null);
  const [pubStreamId, setPubStreamId] = useState(null);
  const [subStreamId, setSubStreamId] = useState(null);

  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('Private key is missing in environment variables');
  }

  useEffect(() => {
    const initializeStreamr = async () => {
      try {
        // Import the web version specifically
        const client = new StreamrClient({
          auth: { privateKey },
          environment: "polygonAmoy",
        });
        setStreamrClient(client);
      } catch (error) {
        console.error('Error initializing Streamr:', error);
      }
    };
  
    initializeStreamr();
  }, []);

  function applySobelFilter(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const gray = new Uint8ClampedArray(width * height);

    for (let i = 0; i < gray.length; i++) {
      const r = imageData.data[i * 4];
      const g = imageData.data[i * 4 + 1];
      const b = imageData.data[i * 4 + 2];
      gray[i] = 0.3 * r + 0.59 * g + 0.11 * b;
    }

    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    const output = new Uint8ClampedArray(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelVal = gray[(y + ky) * width + (x + kx)];
            gx += pixelVal * sobelX[(ky + 1) * 3 + (kx + 1)];
            gy += pixelVal * sobelY[(ky + 1) * 3 + (kx + 1)];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        output[y * width + x] = magnitude > 128 ? 255 : 0;
      }
    }

    for (let i = 0; i < output.length; i++) {
      const value = output[i];
      imageData.data[i * 4] = value > 0 ? 139 : 0;
      imageData.data[i * 4 + 1] = value > 0 ? 117 : 0;
      imageData.data[i * 4 + 2] = 0;
      imageData.data[i * 4 + 3] = 255;
    }
  }

  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !contextRef.current) return;

    contextRef.current.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    const frame = contextRef.current.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    applySobelFilter(frame);
    contextRef.current.putImageData(frame, 0, 0);

    const base64Image = canvasRef.current.toDataURL("image/png").split(",")[1];

    if (streamrClient && pubStreamId) {
      try {
        await streamrClient.publish(pubStreamId, { video: base64Image });
      } catch (error) {
        console.error("Failed to publish frame:", error);
      }
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  };

  const startPublishing = () => {
    const pubInput = document.getElementById("pub-stream").value;
    if (pubInput !== "1" && pubInput !== "2") {
      alert("Please enter 1 or 2 for Pub Stream");
      return;
    }

    const streamId = `0x5dbef432d012c8d20993214f2c3765e9cf83d180/avatarchat-${pubInput}`;
    setPubStreamId(streamId);
    processFrame();
  };

  const startSubscribing = () => {
    const subInput = document.getElementById("sub-stream").value;
    if (subInput !== "1" && subInput !== "2") {
      alert("Please enter 1 or 2 for Sub Stream");
      return;
    }

    const streamId = `0x5dbef432d012c8d20993214f2c3765e9cf83d180/avatarchat-${subInput}`;
    setSubStreamId(streamId);

    if (streamrClient) {
      streamrClient.subscribe(streamId, (message) => {
        try {
          if (message.video && contextSubRef.current) {
            const img = new Image();
            img.onload = () => {
              contextSubRef.current.drawImage(
                img,
                0,
                0,
                canvasSubRef.current.width,
                canvasSubRef.current.height
              );
            };
            img.src = "data:image/png;base64," + message.video;
          }
        } catch (error) {
          console.error("Error processing subscribed message:", error);
        }
      });
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const canvasSub = canvasSubRef.current;

    if (!video || !canvas || !canvasSub) return;

    contextRef.current = canvas.getContext("2d", { willReadFrequently: true });
    contextSubRef.current = canvasSub.getContext("2d", { willReadFrequently: true });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch(console.error);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div>
      <div className="app-bar">
        <div className="id-section">
          <label htmlFor="pub-stream">Publish: </label>
          <input type="text" id="pub-stream" />
          <button onClick={startPublishing}>Enter</button>
        </div>
        <div className="id-section">
          <label htmlFor="sub-stream">Subscribe: </label>
          <input type="text" id="sub-stream" />
          <button onClick={startSubscribing}>Enter</button>
        </div>
      </div>
      
      <video ref={videoRef} autoPlay playsInline />
      
      <div className="container">
        <canvas ref={canvasRef} width="640" height="480" />
        <canvas ref={canvasSubRef} width="640" height="480" />
      </div>
    </div>
  );
};

// Export with dynamic import and SSR disabled
export default dynamic(() => Promise.resolve(VideoStream), {
  ssr: false
});