/* 开发用：无 DOM 的战斗模拟器，用来验证引擎与配平 */
const D = require('../js/data.js');
const E = require('../js/engine.js');

function fmt(n) { return Math.round(n * 100) / 100; }

function autoBuild(collection, slots) {
  // 粗策略：先塞一张毒（续），再塞高伤（花），其余按 CD 从短到长
  const byId = id => D.CARD_BY_ID[id];
  const pool = collection.slice();
  const picked = [];
  const take = pred => {
    const i = pool.findIndex(pred);
    if (i >= 0) { picked.push(pool[i]); pool.splice(i, 1); }
  };
  take(id => byId(id).id === 7 || byId(id).id === 5);
  take(id => byId(id).role === '花');
  take(id => byId(id).role === '产');
  pool.sort((a, b) => byId(a).cd - byId(b).cd);
  while (picked.length < slots && pool.length) picked.push(pool.shift());
  return picked.slice(0, slots);
}

function runStage(stage, level, collection, trials) {
  let wins = 0, rounds = [], maxCombo = 0, losses = [];
  for (let t = 0; t < trials; t++) {
    const enemy = E.generateEnemy(stage, collection);
    const slots = level >= 9 ? 9 : level >= 6 ? 7 : level >= 3 ? 5 : 3;
    const loadout = autoBuild(collection, slots);
    const s = E.newBattle({ loadout, level, stage, enemy });
    E.runToEnd(s, 200);
    if (s.winner === 'player') wins++;
    else losses.push(enemy.mods.join('+'));
    rounds.push(s.round);
    maxCombo = Math.max(maxCombo, s.combo);
  }
  return {
    stage, level,
    winRate: fmt(wins / trials),
    avgRounds: fmt(rounds.reduce((a, b) => a + b, 0) / rounds.length),
    maxRounds: Math.max(...rounds),
    maxCombo,
    lossMods: losses.slice(0, 5)
  };
}

let collection = D.STARTING_COLLECTION.slice();
const rows = [];
for (let stage = 1; stage <= 9; stage++) {
  const level = Math.min(stage, 9);
  const r = runStage(stage, level, collection, 40);
  rows.push(r);
  // 模拟胜利奖励：每关加两张
  for (let k = 0; k < 2; k++) {
    const rest = D.CARDS.map(c => c.id).filter(id => collection.indexOf(id) < 0);
    if (rest.length) collection.push(rest[Math.floor(Math.random() * rest.length)]);
  }
}
console.table(rows);

// 单场详细日志
console.log('\n--- 样例战斗（第 5 关）---');
const enemy5 = E.generateEnemy(5, D.STARTING_COLLECTION);
const s5 = E.newBattle({ loadout: autoBuild(D.STARTING_COLLECTION, 5), level: 5, stage: 5, enemy: enemy5 });
E.runToEnd(s5, 200);
console.log('敌人:', enemy5.name, 'HP', enemy5.maxHp, 'ATK', enemy5.atk, '词条', enemy5.mods);
console.log('结果:', s5.winner, '回合', s5.round, '玩家HP', Math.round(s5.player.hp), '敌人HP', Math.round(s5.enemy.hp));
console.log(s5.log.slice(-40).map(l => `  ${l.text}`).join('\n'));
