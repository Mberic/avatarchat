"use client";
import dynamic from 'next/dynamic';

const VideoStream = dynamic(() => import('./components/VideoStream'), {
  ssr: false,
});

export default function Home() {
  return (
    <main>
      <VideoStream />
    </main>
  );
}