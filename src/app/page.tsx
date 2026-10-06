'use client';

import {
  drumSounds,
  pianoSounds,
  type Sound,
  type Instrument,
} from '@/constant/sound';
import useAudioEngine from '@/hooks/useAudioEngine';
import usePadInput from '@/hooks/usePadInput';
import useLoopTransport from '@/hooks/useLoopTransport';
import useProjects from '@/hooks/useProjects';
import { contentFingerprint, type Project } from '@/lib/project';
import { rememberProject } from '@/lib/project-repository';
import { showTextStore } from '@/store/store';
import { cn } from '@/utils/cn';
import { useCallback, useEffect, useState } from 'react';
import PadBoard from './_components/PadBoard';
import PerformanceSettings from './_components/PerformanceSettings';
import TransportControls from './_components/TransportControls';
import ProjectLibrary from './_components/ProjectLibrary';

export default function Home() {
  const [instrument, setInstrument] = useState<Instrument>('Drum');
  const sounds = instrument === 'Piano' ? pianoSounds : drumSounds;
  const { engine, ready, error, setError, retry } = useAudioEngine(sounds);
  const transport = useLoopTransport(engine);
  const { capture, replace } = transport;
  const library = useProjects();
  const [name, setName] = useState('새 루프');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);
  const [notification, setNotification] = useState('');
  const [bpm, setBpm] = useState(120);
  const [metronome, setMetronome] = useState(false);
  const [quantize, setQuantize] = useState(true);
  const running = transport.status !== 'idle';
  const studioReady = ready && !library.loading && !library.busy;
  const fingerprint = contentFingerprint({
    name,
    instrument,
    bpm,
    quantize,
    metronome,
    events: transport.events,
  });
  const dirty =
    (currentId !== null || transport.events.length > 0) &&
    fingerprint !== savedFingerprint;
  const showPitch = showTextStore(state => state.showPitch);
  const showKeyboard = showTextStore(state => state.showKeyboard);
  const volume = showTextStore(state => state.volume);
  useEffect(() => {
    engine.current?.setVolume(volume);
  }, [engine, volume]);
  const play = useCallback(
    (sound: Sound) => {
      const audio = engine.current;
      if (!audio || !ready) return;
      capture(sound.url);
      void audio
        .trigger(sound.url)
        .catch(() => setError('소리를 시작하지 못했어요. 다시 시도해 주세요.'));
    },
    [engine, ready, setError, capture],
  );
  const input = usePadInput(sounds, studioReady, play);
  const { releaseAll } = input;

  const applyProject = useCallback(
    (project: Project) => {
      releaseAll();
      replace(project.events);
      setInstrument(project.instrument);
      setName(project.name);
      setBpm(project.bpm);
      setQuantize(project.quantize);
      setMetronome(project.metronome);
      setCurrentId(project.id);
      setCreatedAt(project.createdAt);
      setSavedFingerprint(contentFingerprint(project));
      setNotification('');
    },
    [replace, releaseAll],
  );

  useEffect(() => {
    if (library.initialProject) applyProject(library.initialProject);
  }, [library.initialProject, applyProject]);

  useEffect(() => {
    if (!dirty || !transport.events.length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, transport.events.length]);

  const canDiscard = () =>
    !dirty ||
    !transport.events.length ||
    window.confirm(
      '저장하지 않은 녹음이 있어요. 현재 루프를 비우고 계속할까요?',
    );

  const newProject = (mode = instrument) => {
    if (running || library.busy || !canDiscard()) return;
    replace([]);
    releaseAll();
    setInstrument(mode);
    setName('새 루프');
    setCurrentId(null);
    setCreatedAt(null);
    setSavedFingerprint(null);
    setNotification('');
    rememberProject(null);
  };

  const saveProject = async () => {
    if (running || !transport.events.length || library.busy) return;
    const now = Date.now();
    const saved = await library.save({
      version: 1,
      bars: 4,
      id: currentId ?? crypto.randomUUID(),
      name: name.trim() || '이름 없는 루프',
      instrument,
      bpm,
      quantize,
      metronome,
      events: transport.events,
      createdAt: createdAt ?? now,
      updatedAt: Math.max(now, createdAt ?? now),
    });
    if (!saved) return;
    setName(saved.name);
    setCurrentId(saved.id);
    setCreatedAt(saved.createdAt);
    setSavedFingerprint(contentFingerprint(saved));
    setNotification('루프를 이 기기에 저장했어요.');
  };

  const openProject = (project: Project) => {
    if (running || library.busy || !canDiscard()) return;
    applyProject(project);
    rememberProject(project.id);
    setNotification(`${project.name} 루프를 불러왔어요.`);
  };

  const removeProject = async (project: Project) => {
    if (
      running ||
      library.busy ||
      !window.confirm(`“${project.name}” 루프를 이 기기에서 삭제할까요?`)
    )
      return;
    if (!(await library.remove(project.id))) return;
    if (currentId === project.id) {
      setCurrentId(null);
      setCreatedAt(null);
      setSavedFingerprint(null);
    }
    setNotification('저장한 루프를 삭제했어요.');
  };

  const changeInstrument = (mode: Instrument) => {
    if (mode !== instrument) newProject(mode);
  };

  return (
    <main className="studio">
      <header className="studio-heading">
        <h1>
          launchpad<span>.</span>
        </h1>
        <span className="studio-signature">by nijoow</span>
      </header>
      <div className="instrument">
        <div className="project-toolbar">
          <div className="project-title">
            <label className="sr-only" htmlFor="project-name">
              루프 이름
            </label>
            <input
              id="project-name"
              maxLength={60}
              value={name}
              disabled={running || library.busy || library.loading}
              onChange={event => {
                setName(event.target.value);
                setNotification('');
              }}
            />
            <span className="project-save-state">
              {library.busy
                ? '저장 중'
                : dirty
                  ? '변경됨'
                  : currentId
                    ? '저장됨'
                    : '4마디 루프'}
            </span>
          </div>
          <div className="project-actions">
            <button
              type="button"
              disabled={running || library.busy || library.loading}
              onClick={() => newProject()}
              className="text-button"
            >
              새 루프
            </button>
            <button
              type="button"
              disabled={
                !studioReady || running || !transport.events.length || !dirty
              }
              onClick={() => {
                void saveProject();
              }}
              className="save-button"
            >
              저장
            </button>
          </div>
        </div>
        <section className="performance">
          <div className="performance-heading">
            <div
              className="instrument-tabs"
              role="group"
              aria-label="악기 선택"
            >
              {(['Drum', 'Piano'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={instrument === mode}
                  onClick={() => changeInstrument(mode)}
                  disabled={running || library.busy || library.loading}
                  className={cn(
                    'instrument-tab',
                    instrument === mode && 'selected',
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p role="status" className="audio-status">
              <span className={cn('status-light', ready && 'ready')} />
              {error || (ready ? 'Ready' : '불러오는 중')}
            </p>
          </div>
          {error && (
            <button type="button" onClick={retry} className="text-button">
              다시 시도
            </button>
          )}
          <PadBoard
            instrument={instrument}
            ready={studioReady}
            active={input.active}
            playing={transport.playing}
            showPitch={showPitch}
            showKeyboard={showKeyboard}
            press={input.press}
            release={input.release}
          />
          <PerformanceSettings />
        </section>
        <TransportControls
          state={transport}
          ready={studioReady}
          error={transport.error}
          bpm={bpm}
          setBpm={setBpm}
          metronome={metronome}
          setMetronome={setMetronome}
          quantize={quantize}
          setQuantize={setQuantize}
          record={() => {
            input.releaseAll();
            setNotification('');
            transport.record({ bpm, metronome, quantize });
          }}
          play={() => transport.play({ bpm, metronome, quantize })}
          stop={() => {
            input.releaseAll();
            transport.stop();
          }}
        />
        <ProjectLibrary
          projects={library.projects}
          currentId={currentId}
          disabled={running || library.busy}
          loading={library.loading}
          error={library.error}
          open={openProject}
          remove={project => {
            void removeProject(project);
          }}
          retry={() => {
            void library.retry();
          }}
        />
      </div>
      <footer className="studio-footer">
        <span>키보드 또는 터치로 연주</span>
        <span>녹음 전 4박 카운트인</span>
      </footer>
      <p role="status" className="sr-only">
        {notification}
      </p>
    </main>
  );
}
