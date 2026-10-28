'use client';

import {
  allSounds,
  soundsByInstrument,
  type Sound,
  type Instrument,
} from '@/constant/sound';
import useAudioEngine from '@/hooks/useAudioEngine';
import usePadInput from '@/hooks/usePadInput';
import useLoopTransport from '@/hooks/useLoopTransport';
import useProjects from '@/hooks/useProjects';
import { decodeShare, encodeShare } from '@/lib/share';
import { renderWav } from '@/lib/wav';
import { LOOP_BARS, type NoteEvent } from '@/lib/timeline';
import LoopEditor from './_components/LoopEditor';
import { contentFingerprint, type Project } from '@/lib/project';
import { rememberProject } from '@/lib/project-repository';
import { showTextStore } from '@/store/store';
import { cn } from '@/utils/cn';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PadBoard from './_components/PadBoard';
import PerformanceSettings from './_components/PerformanceSettings';
import TransportControls from './_components/TransportControls';
import ProjectLibrary from './_components/ProjectLibrary';

export default function Home() {
  const [instrument, setInstrument] = useState<Instrument>('Drum');
  const sounds = soundsByInstrument[instrument];
  const { engine, ready, error, setError, retry } = useAudioEngine(allSounds);
  const transport = useLoopTransport(engine);
  const { capture, replace } = transport;
  const library = useProjects();
  const [name, setName] = useState('새 루프');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);
  const [notification, setNotification] = useState('');
  const [undo, setUndo] = useState<NoteEvent[] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [incoming, setIncoming] = useState<Project | null>(null);
  const [bpm, setBpm] = useState(120);
  const [metronome, setMetronome] = useState(false);
  const [quantize, setQuantize] = useState(true);
  const running = transport.status !== 'idle' || exporting;
  const studioReady = ready && !library.loading && !library.busy;
  const fingerprint = useMemo(
    () =>
      contentFingerprint({
        name,
        instrument,
        bpm,
        quantize,
        metronome,
        events: transport.events,
      }),
    [name, instrument, bpm, quantize, metronome, transport.events],
  );
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
      setUndo(null);
      setShareUrl('');
    },
    [replace, releaseAll],
  );

  useEffect(() => {
    if (library.initialProject) applyProject(library.initialProject);
  }, [library.initialProject, applyProject]);

  useEffect(() => {
    const read = () => {
      const hash = window.location.hash;
      const shared = decodeShare(hash);
      setIncoming(shared);
      if (hash.startsWith('#loop=') && !shared)
        setNotification('공유 링크가 손상되었거나 너무 길어요.');
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

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
    setUndo(null);
    setShareUrl('');
  };

  const saveProject = async () => {
    if (running || !transport.events.length || library.busy) return;
    const now = Date.now();
    const saved = await library.save({
      version: 2,
      bars: LOOP_BARS,
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
    if (mode === instrument || running || library.busy) return;
    releaseAll();
    engine.current?.stopAll();
    setInstrument(mode);
  };

  const edit = (events: NoteEvent[]) => {
    if (running) return;
    setUndo(transport.events);
    replace(events);
    setShareUrl('');
  };

  const exportAudio = async () => {
    if (!engine.current || !transport.events.length || running) return;
    setExporting(true);
    try {
      const blob = await renderWav(
        engine.current,
        transport.events,
        bpm,
        volume,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'launchpad-loop.wav';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotification('4마디 WAV 파일을 내보냈어요.');
    } catch {
      setNotification('WAV 내보내기에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="studio">
      <header className="studio-heading">
        <h1>
          launchpad<span>.</span>
        </h1>
        <span className="studio-signature">by nijoow</span>
      </header>
      {incoming && (
        <section className="share-incoming">
          <p>
            공유받은 루프 · {incoming.events.length}개 음 · {incoming.bpm} BPM
          </p>
          <button
            type="button"
            className="save-button"
            disabled={running || library.loading || library.busy}
            onClick={() => {
              if (!canDiscard()) return;
              applyProject(incoming);
              setCurrentId(null);
              setCreatedAt(null);
              setSavedFingerprint(null);
              setIncoming(null);
              rememberProject(null);
              window.history.replaceState(
                null,
                '',
                window.location.pathname + window.location.search,
              );
              setNotification(
                '공유 루프를 열었어요. 저장하면 이 기기에 보관돼요.',
              );
            }}
          >
            공유 루프 열기
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setIncoming(null);
              window.history.replaceState(
                null,
                '',
                window.location.pathname + window.location.search,
              );
            }}
          >
            닫기
          </button>
        </section>
      )}
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
                  {mode} ·{' '}
                  {
                    transport.events.filter(event =>
                      soundsByInstrument[mode].some(
                        sound => sound.url === event.padId,
                      ),
                    ).length
                  }
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
          <button
            type="button"
            className="text-button"
            disabled={!ready || running}
            onClick={() => {
              void engine.current
                ?.resume()
                .then(() =>
                  setNotification('소리가 준비됐어요. 패드를 연주해 주세요.'),
                )
                .catch(() =>
                  setError('소리를 시작하지 못했어요. 다시 눌러 주세요.'),
                );
            }}
          >
            소리 시작 · 모바일에서 먼저 눌러 주세요
          </button>
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
          <p className="layer-note">
            Drum과 Piano를 겹쳐 연주해요. 녹음은 선택한 악기 레이어만 교체해요.
          </p>
        </section>
        <TransportControls
          state={transport}
          ready={studioReady && !exporting}
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
            setUndo(transport.events);
            setShareUrl('');
            transport.record({
              bpm,
              metronome,
              quantize,
              recordPadIds: sounds.map(sound => sound.url),
            });
          }}
          play={() => transport.play({ bpm, metronome, quantize })}
          stop={() => {
            input.releaseAll();
            transport.stop();
          }}
        />
        <section className="loop-tools" aria-label="루프 도구">
          <div className="tool-buttons">
            <button
              type="button"
              className="save-button"
              disabled={running || !undo}
              onClick={() => {
                if (undo) replace(undo);
                setUndo(null);
                setShareUrl('');
              }}
            >
              되돌리기
            </button>
            <button
              type="button"
              className="text-button"
              disabled={
                running ||
                !transport.events.some(event =>
                  sounds.some(sound => sound.url === event.padId),
                )
              }
              onClick={() =>
                edit(
                  transport.events.filter(
                    event => !sounds.some(sound => sound.url === event.padId),
                  ),
                )
              }
            >
              선택 레이어 비우기
            </button>
            <button
              type="button"
              className="save-button"
              disabled={running || !studioReady || !transport.events.length}
              onClick={() => void exportAudio()}
            >
              {exporting ? 'WAV 만드는 중' : 'WAV 내보내기'}
            </button>
            <button
              type="button"
              className="save-button"
              disabled={running || !transport.events.length}
              onClick={() => {
                try {
                  setShareUrl(
                    window.location.origin +
                      window.location.pathname +
                      encodeShare({
                        name,
                        instrument,
                        bpm,
                        quantize,
                        metronome,
                        events: transport.events,
                      }),
                  );
                  setNotification(
                    '공유 링크를 만들었어요. 아래 링크를 복사해 전달하세요.',
                  );
                } catch (error) {
                  setNotification(
                    error instanceof Error
                      ? error.message
                      : '링크를 만들지 못했어요.',
                  );
                }
              }}
            >
              공유 링크 만들기
            </button>
          </div>
          <p>
            WAV는 현재 볼륨으로 두 레이어를 담아요. 공유 링크에는 음표·템포만
            담으며 업로드하지 않아요. 링크를 가진 사람은 루프를 열 수 있어요.
          </p>
          {shareUrl && (
            <label>
              공유 링크
              <input
                aria-label="공유 링크"
                readOnly
                value={shareUrl}
                onFocus={e => e.target.select()}
              />
              <span>
                만든 시점의 루프예요. 편집 후에는 링크를 다시 만드세요.
              </span>
            </label>
          )}
          <LoopEditor
            sounds={sounds}
            instrument={instrument}
            events={transport.events}
            disabled={running || !studioReady}
            change={events => {
              try {
                edit(events);
              } catch {
                setNotification('더 이상 음을 추가할 수 없어요.');
              }
            }}
          />
        </section>
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
      <p role="status" className="studio-notification">
        {notification}
      </p>
    </main>
  );
}
