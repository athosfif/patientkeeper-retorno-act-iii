import test from 'node:test';
import assert from 'node:assert/strict';
import { THEME_KEY, resolveTheme, readTheme, saveTheme } from '../theme.mjs';
test('explicit appearance wins over the operating system, with a validated system fallback', () => {
  assert.equal(resolveTheme('light',true),'light');
  assert.equal(resolveTheme('dark',false),'dark');
  for (const invalid of [undefined,null,'garbage','<script>']) {
    assert.equal(resolveTheme(invalid,true),'dark');
    assert.equal(resolveTheme(invalid,false),'light');
  }
});
test('denied preference storage still produces a usable appearance', () => {
  const denied={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
  assert.equal(readTheme(denied,true),'dark');
  assert.equal(saveTheme('dark',denied),'dark');
  assert.equal(readTheme(null,false),'light');
});
test('appearance persistence uses its own key and only valid themes', () => {
  const writes=[],storage={setItem:(...pair)=>writes.push(pair),getItem:key=>key===THEME_KEY ? 'dark' : null};
  assert.equal(readTheme(storage,false),'dark');
  saveTheme('light',storage);saveTheme('invalid',storage);
  assert.deepEqual(writes,[[THEME_KEY,'light'],[THEME_KEY,'light']]);
});
