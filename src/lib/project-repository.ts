import { parseProject, type Project } from './project';

export class ProjectRepository {
  private database: Promise<IDBDatabase> | null = null;
  constructor(private options: { factory?: IDBFactory; name?: string } = {}) {}

  private open() {
    if (!this.database) {
      this.database = new Promise<IDBDatabase>((resolve, reject) => {
        const factory = this.options.factory ?? window.indexedDB;
        if (!factory) {
          reject(
            new Error('이 브라우저에서는 기기 내 저장을 사용할 수 없어요.'),
          );
          return;
        }
        const request = factory.open(
          this.options.name ?? 'nijoow-launchpad',
          1,
        );
        let blocked = false;
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains('projects'))
            database.createObjectStore('projects', { keyPath: 'id' });
        };
        request.onerror = () =>
          reject(request.error ?? new Error('저장 공간을 열지 못했어요.'));
        request.onblocked = () => {
          blocked = true;
          reject(new Error('이 앱을 연 다른 탭을 닫고 다시 시도해 주세요.'));
        };
        request.onsuccess = () => {
          const database = request.result;
          if (blocked) {
            database.close();
            return;
          }
          database.onversionchange = () => {
            database.close();
            this.database = null;
          };
          resolve(database);
        };
      }).catch(error => {
        this.database = null;
        throw error;
      });
    }
    return this.database;
  }

  private async request<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ) {
    const database = await this.open();
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction('projects', mode);
      const request = operation(transaction.objectStore('projects'));
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      // Successful requests can still be rolled back: report success only after commit.
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () =>
        reject(
          transaction.error ??
            request.error ??
            new Error('저장 작업에 실패했어요.'),
        );
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('저장 작업이 취소됐어요.'));
    });
  }

  async list() {
    const records: unknown[] = await this.request('readonly', store =>
      store.getAll(),
    );
    return records
      .map(parseProject)
      .filter((project): project is Project => project !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async save(project: Project) {
    const valid = parseProject(project);
    if (!valid) throw new Error('저장할 루프 정보가 올바르지 않아요.');
    await this.request('readwrite', store => store.put(valid));
    return valid;
  }

  async remove(id: string) {
    await this.request('readwrite', store => store.delete(id));
  }

  async close() {
    if (this.database) (await this.database).close();
    this.database = null;
  }
}

export const projectRepository = new ProjectRepository();

export function rememberProject(id: string | null) {
  try {
    if (id) localStorage.setItem('nijoow-last-project', id);
    else localStorage.removeItem('nijoow-last-project');
  } catch {
    /* Project data is safe in IndexedDB even if this convenience setting fails. */
  }
}

export function lastProjectId() {
  try {
    return localStorage.getItem('nijoow-last-project');
  } catch {
    return null;
  }
}
