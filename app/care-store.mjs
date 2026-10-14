import { readFile, lstat, open, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createCareJourneyState, validateCareJourneyState, transitionCareJourney } from './care-journey.mjs';

const MAX_BYTES = 128 * 1024;
function fail(code, message) { throw Object.assign(new Error(message), { code }); }

/** Private synthetic episode. It never replaces the original return queue. */
export async function createCareStore(directory) {
  const file = path.join(directory, 'care-demo-state.json');
  let current;
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES) fail('CARE_STORE_INVALID', 'Preserve the invalid journey file for review.');
    current = JSON.parse(await readFile(file, 'utf8'));
    validateCareJourneyState(current);
  } catch (error) {
    if (error.code === 'ENOENT') current = createCareJourneyState(new Date().toISOString());
    else fail('CARE_STORE_INVALID', 'The saved fictional journey could not be opened. It was not replaced.');
  }
  let queue = Promise.resolve();
  const snapshot = () => structuredClone(current);
  async function commit(next) {
    validateCareJourneyState(next);
    const bytes = JSON.stringify(next, null, 2) + '\n';
    if (Buffer.byteLength(bytes) > MAX_BYTES) fail('CARE_STORE_LIMIT', 'Export the fictional journey before recording more history.');
    const temporary = path.join(directory, '.care-' + randomUUID() + '.tmp');
    let handle;
    try {
      handle = await open(temporary, 'wx', 0o600);
      await handle.writeFile(bytes); await handle.sync(); await handle.close(); handle = null;
      await rename(temporary, file);
    } catch { fail('CARE_STORE_UNAVAILABLE', 'Could not save. The previous fictional journey remains active.'); }
    finally { if (handle) await handle.close().catch(() => {}); await unlink(temporary).catch(() => {}); }
    current = next;
    return snapshot();
  }
  function act(action, expectedRevision) {
    const operation = queue.then(() => commit(transitionCareJourney(current, action, { expectedRevision, now: new Date().toISOString() })));
    queue = operation.catch(() => {});
    return operation;
  }
  return { snapshot, act, flush: () => queue };
}
