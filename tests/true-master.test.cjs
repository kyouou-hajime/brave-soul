// BRAVE SOUL — Tier3 TRUE MASTER regression checks
// Run: node --test tests/true-master.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadGame}=require('./helpers/load-game.cjs');
let html;
test.before(async()=>{html=await loadGame()});

function getTrueConditions() {
  const m = html.match(/const TRUE_COND\s*=\s*(\{[\s\S]*?\});\s*\/\/ ── パワプロ式/);
  assert.ok(m, 'TRUE_COND definition missing');
  return Function('"use strict"; return (' + m[1] + ')')();
}

test('剣豪のTRUE条件は特訓2・冒険2・休息1', () => {
  assert.deepEqual(getTrueConditions().kengo, {train:2, adventure:2, rest:1});
});
test('将軍のTRUE条件は特訓2・冒険1・休息2', () => {
  assert.deepEqual(getTrueConditions().shogun, {train:2, adventure:1, rest:2});
});
test('通常TRUE行動はそれぞれ合計5回', () => {
  for (const [job, cond] of Object.entries(getTrueConditions())) {
    assert.equal(Object.values(cond).reduce((a,b)=>a+b, 0), 5, job);
  }
});
test('遊戯師の専用条件は失敗後の勝利5回と熟練度99の両立', () => {
  assert.match(html, /_newCount\s*>=\s*5\s*&&\s*\(j\.yuugishi\s*\|\|\s*0\)\s*>=\s*99/);
  assert.match(html, /jobId\s*===\s*"yuugishi"[\s\S]{0,160}allInMissWin/);
});
test('通常TRUEは99到達後の進捗のみを数える', () => {
  assert.match(html, /const _countAdvTRUE[\s\S]{0,250}=== 99/);
});
