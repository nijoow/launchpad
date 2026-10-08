import type { Project } from '@/lib/project';
import {
  lastProjectId,
  projectRepository,
  rememberProject,
} from '@/lib/project-repository';
import { useCallback, useEffect, useState } from 'react';

export default function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [initialProject, setInitialProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    projectRepository
      .list()
      .then(items => {
        if (cancelled) return;
        setProjects(items);
        setInitialProject(
          items.find(project => project.id === lastProjectId()) ?? null,
        );
      })
      .catch(() => {
        if (!cancelled)
          setError(
            '저장한 루프를 불러오지 못했어요. 브라우저의 저장 공간 설정을 확인해 주세요.',
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const retry = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProjects(await projectRepository.list());
    } catch {
      setError(
        '저장 공간에 접근하지 못했어요. 연주와 녹음은 계속 사용할 수 있어요.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (project: Project) => {
    setBusy(true);
    setError('');
    try {
      const saved = await projectRepository.save(project);
      setProjects(items =>
        [saved, ...items.filter(item => item.id !== saved.id)].sort(
          (a, b) => b.updatedAt - a.updatedAt,
        ),
      );
      rememberProject(saved.id);
      return saved;
    } catch {
      setError(
        '저장하지 못했어요. 녹음은 그대로 있어요. 저장 공간을 확인하고 다시 시도해 주세요.',
      );
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await projectRepository.remove(id);
      setProjects(items => items.filter(item => item.id !== id));
      if (lastProjectId() === id) rememberProject(null);
      return true;
    } catch {
      setError('삭제하지 못했어요. 다시 시도해 주세요.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    projects,
    initialProject,
    loading,
    busy,
    error,
    retry,
    save,
    remove,
  };
}
