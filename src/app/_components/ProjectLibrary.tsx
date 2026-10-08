import type { Project } from '@/lib/project';
import { cn } from '@/utils/cn';

interface Props {
  projects: Project[];
  currentId: string | null;
  disabled: boolean;
  loading: boolean;
  error: string;
  open: (project: Project) => void;
  remove: (project: Project) => void;
  retry: () => void;
}

export default function ProjectLibrary({
  projects,
  currentId,
  disabled,
  loading,
  error,
  open,
  remove,
  retry,
}: Props) {
  return (
    <details className="library" open={error ? true : undefined}>
      <summary className="library-toggle">
        <span>
          저장한 루프 <span className="library-count">{projects.length}</span>
        </span>
        <span className="library-chevron" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <aside className="library-content" aria-label="저장한 루프">
        <p className="library-storage-note">
          이 브라우저에 저장 · 다른 기기와 동기화되지 않음
        </p>
        {loading ? (
          <p role="status" className="library-empty">
            불러오는 중…
          </p>
        ) : error ? (
          <div>
            <p role="alert" className="library-error">
              {error}
            </p>
            <button
              type="button"
              onClick={retry}
              disabled={disabled}
              className="text-button"
            >
              다시 불러오기
            </button>
          </div>
        ) : !projects.length ? (
          <p className="library-empty">저장한 루프가 없습니다.</p>
        ) : null}
        <ul className="library-list">
          {projects.map(project => (
            <li
              key={project.id}
              className={cn(
                'library-row',
                project.id === currentId && 'current',
              )}
            >
              <button
                type="button"
                aria-label={`불러오기 ${project.name}`}
                disabled={disabled}
                onClick={() => open(project)}
                className="library-open"
              >
                <span className="library-name">{project.name}</span>
                <span className="library-meta">
                  {project.instrument} · {project.bpm} BPM ·{' '}
                  {project.events.length}개 음
                </span>
              </button>
              <time
                dateTime={new Date(project.updatedAt).toISOString()}
                className="library-date"
              >
                {new Intl.DateTimeFormat('ko-KR', {
                  month: 'numeric',
                  day: 'numeric',
                }).format(project.updatedAt)}
              </time>
              <button
                type="button"
                aria-label={`삭제 ${project.name}`}
                onClick={() => remove(project)}
                disabled={disabled}
                className="text-button library-delete"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </details>
  );
}
