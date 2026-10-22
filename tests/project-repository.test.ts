import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IDBFactory, IDBDatabase } from 'fake-indexeddb';
import { ProjectRepository } from '../src/lib/project-repository';
import type { Project } from '../src/lib/project';

const project: Project = {
  version: 1,
  bars: 4,
  id: 'loop-1',
  name: '테스트 루프',
  instrument: 'Drum',
  bpm: 120,
  quantize: true,
  metronome: false,
  createdAt: 100,
  updatedAt: 200,
  events: [{ padId: '/audio/drum/Kick1.wav', beat: 0 }],
};

test('projects persist across connections, update by id, and can be deleted', async () => {
  const factory = new IDBFactory();
  const first = new ProjectRepository({ factory, name: 'roundtrip' });
  await first.save(project);
  await first.close();
  const second = new ProjectRepository({ factory, name: 'roundtrip' });
  assert.deepEqual(await second.list(), [project]);
  await second.save({ ...project, name: '수정한 루프', updatedAt: 300 });
  assert.equal((await second.list()).length, 1);
  assert.equal((await second.list())[0].name, '수정한 루프');
  await second.remove(project.id);
  assert.deepEqual(await second.list(), []);
  await second.close();
});

test('an aborted write reports failure and does not leave a partially saved loop', async () => {
  const repo = new ProjectRepository({
    factory: new IDBFactory(),
    name: 'abort',
  });
  await repo.list();
  const original = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (names, mode, options) {
    const transaction = original.call(this, names, mode, options);
    if (mode === 'readwrite') queueMicrotask(() => transaction.abort());
    return transaction;
  };
  try {
    await assert.rejects(repo.save(project));
  } finally {
    IDBDatabase.prototype.transaction = original;
  }
  assert.deepEqual(await repo.list(), []);
  await repo.close();
});

test('v1 and layered v2 coexist and restore across a fresh connection', async () => {
  const factory = new IDBFactory();
  const first = new ProjectRepository({ factory, name: 'layered-roundtrip' });
  const layered: Project = {
    ...project,
    id: 'layered',
    version: 2,
    events: [
      ...project.events,
      { padId: '/audio/piano/piano60.wav', beat: 1.25 },
    ],
  };
  await first.save(project);
  await first.save(layered);
  await first.close();
  const second = new ProjectRepository({ factory, name: 'layered-roundtrip' });
  const saved = await second.list();
  assert.deepEqual(
    saved.find(item => item.id === 'layered'),
    layered,
  );
  assert.deepEqual(
    saved.find(item => item.id === project.id),
    project,
  );
  await second.close();
});
