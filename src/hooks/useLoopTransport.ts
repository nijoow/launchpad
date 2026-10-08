import type { AudioEngine } from '@/lib/audio-engine';
import {
  idleSnapshot,
  LoopTransport,
  type TransportOptions,
} from '@/lib/loop-transport';
import type { NoteEvent } from '@/lib/timeline';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

export default function useLoopTransport(
  engine: RefObject<AudioEngine | null>,
) {
  const controller = useRef<LoopTransport | null>(null);
  const [snapshot, setSnapshot] = useState(idleSnapshot);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!engine.current) return;
    const transport = new LoopTransport(engine.current, setSnapshot);
    controller.current = transport;
    const hide = () => {
      if (document.hidden)
        transport.stop('다른 화면으로 이동해 연주를 중지했어요.');
    };
    const blur = () => transport.stop();
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('blur', blur);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('blur', blur);
      controller.current = null;
      transport.dispose();
    };
  }, [engine]);

  const record = useCallback((options: TransportOptions) => {
    setError('');
    void controller.current
      ?.startRecording(options)
      .catch(() => setError('녹음을 시작하지 못했어요. 다시 눌러 주세요.'));
  }, []);
  const play = useCallback((options: TransportOptions) => {
    setError('');
    void controller.current
      ?.startPlayback(options)
      .catch(() => setError('재생을 시작하지 못했어요. 다시 눌러 주세요.'));
  }, []);
  const stop = useCallback(() => {
    controller.current?.stop();
    setError('');
  }, []);
  const replace = useCallback((events: NoteEvent[]) => {
    controller.current?.replaceEvents(events);
    setError('');
  }, []);
  const capture = useCallback(
    (padId: string) => controller.current?.capture(padId),
    [],
  );
  return { ...snapshot, error, record, play, stop, replace, capture };
}
