import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { useEffect, useRef } from 'react';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS: Record<string, number> = {
  chaos: 10000,
  cost: 12000,
  reveal: 16000,
  features: 14000,
  resolution: 8000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  chaos: Scene1,
  cost: Scene2,
  reveal: Scene3,
  features: Scene4,
  resolution: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <>
      <div
        className="w-full h-screen overflow-hidden relative"
        style={{ backgroundColor: 'var(--color-bg-light)' }}
      >
        {/* Persistent Background Layer */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-dark-tech.png)` }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: (sceneIndex === 1 || sceneIndex === 4) ? 1 : 0,
              scale: sceneIndex === 1 ? 1.05 : 1,
            }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-light-tech.png)` }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: (sceneIndex === 2 || sceneIndex === 3) ? 1 : 0,
              scale: sceneIndex === 3 ? 1.05 : 1,
            }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
        </div>

        {/* Persistent progress accent line */}
        <motion.div
          className="absolute top-0 left-0 w-full h-1 bg-[var(--color-primary)] origin-left z-50 pointer-events-none"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: [0.1, 0.3, 0.6, 0.8, 1][sceneIndex] }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />

        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </>
  );
}
