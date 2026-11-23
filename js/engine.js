/* ============================================================
   战斗引擎（纯逻辑，无 DOM，可在 Node 里跑模拟）
   回合制 1v1 自动战斗 + 连段（命中计数）
   ============================================================ */
(function (root, factory) {
  var D = (typeof require !== 'undefined' && typeof module !== 'undefined')
    ? require('./data.js')
    : {
        CONFIG: root.CONFIG, CARDS: root.CARDS, CARD_BY_ID: root.CARD_BY_ID,
        MODIFIERS: root.MODIFIERS, MOD_BY_ID: root.MOD_BY_ID, EXCLUSIONS: root.EXCLUSIONS,
        PROTOTYPES: root.PROTOTYPES, COMBO_TIERS: root.COMBO_TIERS
      };
  var api = factory(root, D);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Engine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, D) {

  var CONFIG = D.CONFIG, CARDS = D.CARDS, CARD_BY_ID = D.CARD_BY_ID;
  var MODIFIERS = D.MODIFIERS, MOD_BY_ID = D.MOD_BY_ID, EXCLUSIONS = D.EXCLUSIONS;
  var PROTOTYPES = D.PROTOTYPES, COMBO_TIERS = D.COMBO_TIERS;

  /* ---------- 小工具 ---------- */
  function rnd() { return Math.random(); }
  function chance(p) { return rnd() < p; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function addLog(s, text, cls) {
    s.log.push({ r: s.round, text: text, cls: cls || '' });
    if (s.log.length > 240) s.log.shift();
  }

  /* ---------- 词条状态 ---------- */
  function hasMod(s, id) {
    if (!s.enemy.mods || s.enemy.mods.indexOf(id) < 0) return false;
    var until = s.enemy.disabled[id];
    if (until && s.round <= until) return false;
    return true;
  }
  function disableMods(s, count, rounds) {
    var pool = s.enemy.mods.filter(function (id) {
      return !(s.enemy.disabled[id] && s.round <= s.enemy.disabled[id]);
    });
    shuffle(pool);
    var n = Math.min(count, pool.length);
    for (var i = 0; i < n; i++) {
      s.enemy.disabled[pool[i]] = s.round + rounds;
      addLog(s, '  香炉：词条「' + MOD_BY_ID[pool[i]].name + '」失效 ' + rounds + ' 回合', 'good');
    }
  }

  /* ---------- 连段 ---------- */
  function addHit(s, n) {
    n = n || 1;
    var before = s.combo;
    var gain = n;
    if (s.combo >= 5) gain += n;           // 连环：每次命中额外 +1
    s.combo = clamp(s.combo + gain, 0, s.comboCap);
    s.hitsThisRound += n;
    if (hasMod(s, 'plunder') && !s.plunderThisRound) {
      s.plunderThisRound = true;
      s.combo = Math.max(0, s.combo - 3);
      addLog(s, '掠夺：连段 −3', 'bad');
    }
    for (var i = 0; i < COMBO_TIERS.length; i++) {
      var t = COMBO_TIERS[i];
      if (before < t.n && s.combo >= t.n) {
        addLog(s, '★ 连段 ' + t.n + ' · ' + t.name + ' —— ' + t.desc, 'tier');
        s.fxRound.tier = t.n;
      }
    }
  }

  /* ---------- 护盾 / 治疗 ---------- */
  function addShield(s, amount, rounds) {
    var amt = hasMod(s, 'erode') ? amount * 0.5 : amount;
    amt = Math.round(amt);
    s.player.shield += amt;
    s.player.shieldUntil = Math.max(s.player.shieldUntil, s.round + rounds - 1);
    s.fxRound.shield += amt;
    addLog(s, '  获得 ' + amt + ' 护盾', 'good');
  }

  function healPlayer(s, amount) {
    if (s.over) return;
    var amt = amount * s.player.healMult;
    if (hasMod(s, 'thorns') && chance(0.5)) {
      addLog(s, '  荆棘：治疗被夺走', 'bad');
      healEnemy(s, amt);
      return;
    }
    var before = s.player.hp;
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + amt);
    var real = Math.round(s.player.hp - before);
    if (real > 0) { s.fxRound.heal += real; addLog(s, '  回复 ' + real + ' 生命', 'good'); }
  }

  function healEnemy(s, amount) {
    if (s.round < s.enemy.healBlockUntil) return;
    var amt = amount;
    if (hasMod(s, 'thorns')) amt *= 1;
    var before = s.enemy.hp;
    s.enemy.hp = Math.min(s.enemy.maxHp, s.enemy.hp + amt);
    var real = Math.round(s.enemy.hp - before);
    if (real > 0) addLog(s, '  敌人回复 ' + real + ' 生命', 'bad');
  }

  function addEnemyDot(s, dmg, dur) {
    s.enemy.dots.push({ dmg: dmg, until: s.round + dur - 1 });
    addLog(s, '  施加 ' + dmg + '/回合的毒，' + dur + ' 回合', 'good');
  }
  function addPlayerDot(s, dmg, dur) {
    s.player.dots.push({ dmg: dmg, until: s.round + dur });
  }

  /* ---------- 伤害 ---------- */
  function hitEnemy(s, amount, opts) {
    opts = opts || {};
    if (s.over) return 0;
    var dmg = amount;
    if (!opts.noBonus) {
      dmg *= (1 + s.player.dmgBonus);
      if (s.combo >= 3) dmg *= (1 + CONFIG.tierDamageBonus);   // 起势
    }
    if (!opts.isDot && s.enemy.dodgeEvery && s.round % s.enemy.dodgeEvery === 0 && !s.enemy.dodgedThisRound) {
      s.enemy.dodgedThisRound = true;
      addLog(s, '  游魂闪避！', 'dim');
      return 0;
    }
    if (!opts.isDot && !opts.ignoreImmune && s.enemy.immune) {
      addLog(s, '  铁壁：免疫', 'dim');
      return 0;
    }
    if (!opts.isDot && hasMod(s, 'scale')) dmg = Math.max(5, dmg - 20);
    dmg = Math.round(dmg);
    if (!opts.ignoreShield && s.enemy.shield > 0) {
      var absorbed = Math.min(s.enemy.shield, dmg);
      s.enemy.shield -= absorbed;
      dmg -= absorbed;
      if (absorbed > 0) addLog(s, '  护盾吸收 ' + absorbed, 'dim');
    }
    if (dmg > 0) {
      s.enemy.hp -= dmg;
      s.dmgDealtThisRound += dmg;
      s.fxRound.dmgEnemy += dmg;
      if (s.player.lifesteal > 0) healPlayer(s, dmg * s.player.lifesteal);
      if (s.player.healPerHit > 0) healPlayer(s, s.player.healPerHit);
    }
    addHit(s, opts.hits || 1);
    if (!opts.isDot && !opts.noReflect && hasMod(s, 'reflect') && dmg > 30) {
      addLog(s, '  反伤：反弹 ' + (dmg - 30), 'bad');
      enemyHitPlayer(s, dmg - 30, { pure: true });
    }
    checkEnd(s);
    return dmg;
  }

  function enemyHitPlayer(s, amount, opts) {
    opts = opts || {};
    if (s.over) return;
    var dmg = Math.round(amount * (opts.pure ? 1 : s.player.dmgTakenMult));
    if (s.player.shield > 0) {
      var absorbed = Math.min(s.player.shield, dmg);
      s.player.shield -= absorbed;
      dmg -= absorbed;
    }
    if (dmg > 0) {
      s.player.hp -= dmg;
      s.fxRound.dmgPlayer += dmg;
      if (s.player.comboOnHurt > 0 && !opts.fromDot) addHit(s, s.player.comboOnHurt);
      if (s.player.reflect > 0 && !opts.noReflect) {
        hitEnemy(s, dmg * s.player.reflect, { noBonus: true, noReflect: true });
      }
    }
    checkEnd(s);
  }

  /* ---------- 卡牌触发 ---------- */
  function isSealed(s, idx) {
    for (var i = 0; i < s.player.sealed.length; i++) {
      var x = s.player.sealed[i];
      if (x.slot === idx && s.round <= x.until) return true;
    }
    return false;
  }

  function readyLongest(s, excludeIdx) {
    var best = -1, bestCd = -1;
    for (var i = 0; i < s.player.slots.length; i++) {
      if (i === excludeIdx) continue;
      var sl = s.player.slots[i];
      if (sl.cd > bestCd) { bestCd = sl.cd; best = i; }
    }
    if (best >= 0) s.player.slots[best].cd = 0;
    return best;
  }

  function longestBaseCd(s, excludeIdx) {
    var best = -1, bestCd = -1;
    for (var i = 0; i < s.player.slots.length; i++) {
      if (i === excludeIdx) continue;
      var c = CARD_BY_ID[s.player.slots[i].id];
      if (c && c.cd > bestCd) { bestCd = c.cd; best = i; }
    }
    return best;
  }

  function randomOther(s, excludeIdx) {
    var pool = [];
    for (var i = 0; i < s.player.slots.length; i++) if (i !== excludeIdx) pool.push(i);
    return pool.length ? pick(pool) : -1;
  }

  function fireSlot(s, idx, opts) {
    opts = opts || {};
    if (s.over) return;
    var sl = s.player.slots[idx];
    if (!sl) return;
    if (isSealed(s, idx)) { addLog(s, '  槽位被封印', 'dim'); return; }
    var card = CARD_BY_ID[sl.id];
    if (!card) return;
    if (s.triggerDepth > 6) return;
    s.triggerDepth++;
    if (!opts.extra) sl.cd = card.cd;
    if (s.firedThisRound.indexOf(idx) < 0) s.firedThisRound.push(idx);
    addLog(s, (opts.extra ? '↳ ' : '▸ ') + card.name, opts.extra ? 'card sub' : 'card');
    if (hasMod(s, 'echo')) s.enemy.heavyIn = Math.max(1, s.enemy.heavyIn - 1);
    var before = s.dmgDealtThisRound;
    cardEffect(s, card, idx);
    if (s.player.extraHit > 0 && !opts.extra) {
      var dealt = s.dmgDealtThisRound - before;
      if (dealt > 0.5) {
        addLog(s, '  男人：额外命中 ' + Math.round(dealt * 0.5), 'dim');
        hitEnemy(s, dealt * 0.5, { noBonus: true, noReflect: true });
      }
    }
    s.triggerDepth--;
  }

  function cardEffect(s, card, idx) {
    var i, t;
    switch (card.id) {
      case 1: // 骑手
        hitEnemy(s, 20);
        i = (idx + 1) % s.player.slots.length;
        if (s.player.slots[i]) s.player.slots[i].cd = Math.max(0, s.player.slots[i].cd - 1);
        break;
      case 2: // 三叶草
        if (chance(0.3)) {
          t = longestBaseCd(s, idx);
          if (t >= 0) { addLog(s, '  三叶草：好运！', 'good'); fireSlot(s, t, { extra: true }); }
        } else addLog(s, '  三叶草：没中', 'dim');
        break;
      case 3: // 船
        s.player.timers.push({ at: s.round + 3, type: 'ship' });
        addLog(s, '  3 回合后到港', 'dim');
        break;
      case 4: addShield(s, 100, 3); break;
      case 5: addEnemyDot(s, 8, 8); break;
      case 6: // 云
        s.enemy.heavyIn += 2;
        if (s.combo >= 5) { s.enemy.silentRounds = 1; addLog(s, '  云：敌人被沉默', 'good'); }
        break;
      case 7: addEnemyDot(s, 10, 5); break;
      case 8: s.enemy.heavyIn += 2; break;
      case 9: healPlayer(s, s.player.maxHp * (s.combo >= 9 ? 0.4 : 0.15)); break;
      case 10: // 镰刀
        if (s.enemy.hp <= s.enemy.maxHp * 0.3) {
          addLog(s, '  镰刀：斩杀！', 'good');
          hitEnemy(s, s.enemy.hp + s.enemy.shield + 1, { ignoreShield: true, ignoreImmune: true, noReflect: true });
        } else hitEnemy(s, 150);
        break;
      case 11:
        for (i = 0; i < 3; i++) hitEnemy(s, 8);
        break;
      case 12:
        s.player.auras.push({ type: 'bird', dmg: 8, until: s.round + 4 });
        break;
      case 13:
        t = readyLongest(s, idx);
        if (t >= 0) addLog(s, '  孩子：就绪 ' + CARD_BY_ID[s.player.slots[t].id].name, 'good');
        break;
      case 14: hitEnemy(s, s.combo >= 7 ? 120 : 60, { ignoreShield: true }); break;
      case 15: hitEnemy(s, 120); addShield(s, 50, 3); break;
      case 16:
        s.player.auras.push({ type: 'star', heal: 8, combo: 2, until: s.round + 4 });
        break;
      case 17: // 鹳
        if (s.player.slots.length > 1) {
          var a = s.player.slots[0], b = s.player.slots[s.player.slots.length - 1];
          s.player.slots[0] = b; s.player.slots[s.player.slots.length - 1] = a;
          addLog(s, '  鹳：首尾交换', 'good');
          fireSlot(s, 0, { extra: true });
          fireSlot(s, s.player.slots.length - 1, { extra: true });
        }
        break;
      case 18:
        s.player.auras.push({ type: 'dog', dmg: 15, until: s.round + 6 });
        break;
      case 19:
        addShield(s, 60, 3);
        s.player.buffs.push({ type: 'reflect', value: 0.3, until: s.round + 3 });
        break;
      case 20:
        s.player.auras.push({ type: 'garden', heal: 10, dmg: 10, until: s.round + 5 });
        break;
      case 21: s.enemy.heavyIn += 2; break;
      case 22:
        t = randomOther(s, idx);
        if (t >= 0) { addLog(s, '  十字路口：选了一条路', 'good'); fireSlot(s, t, { extra: true }); }
        break;
      case 23: s.enemy.healBlockUntil = s.round + 4; addLog(s, '  敌人治疗被封锁', 'good'); break;
      case 24:
        healPlayer(s, s.player.maxHp * 0.25);
        s.player.buffs.push({ type: 'lifesteal', value: 0.3, until: s.round + 3 });
        break;
      case 25: s.player.ringRound = s.round; addLog(s, '  戒指：伤害将转为护盾', 'dim'); break;
      case 26:
        s.player.dmgBonus += 0.05;
        addLog(s, '  书：伤害 +5%（累计 +' + Math.round(s.player.dmgBonus * 100) + '%）', 'good');
        break;
      case 27:
        s.player.timers.push({ at: s.round + 2, type: 'letter' });
        addLog(s, '  信：2 回合后送达', 'dim');
        break;
      case 28: s.player.extraHit = 1; break;
      case 29: s.player.buffs.push({ type: 'healMult', value: 0.5, until: s.round + 4 }); break;
      case 30:
        s.player.dots = [];
        healPlayer(s, s.player.maxHp * 0.15);
        addLog(s, '  百合：净化自身', 'good');
        break;
      case 31: // 太阳
        var dmgSun = s.combo * 20;
        addLog(s, '  太阳：燃烧 ' + s.combo + ' 点连段', 'good');
        s.combo = 0;
        if (dmgSun > 0) hitEnemy(s, dmgSun, { noBonus: true });
        break;
      case 32: s.enemy.silentRounds = 1; addLog(s, '  月亮：敌人沉睡', 'good'); break;
      case 33:
        t = readyLongest(s, idx);
        if (t >= 0) {
          addLog(s, '  钥匙：解锁 ' + CARD_BY_ID[s.player.slots[t].id].name, 'good');
          fireSlot(s, t, { extra: true });
          fireSlot(s, t, { extra: true });
        }
        break;
      case 34: s.player.buffs.push({ type: 'healPerHit', value: 2, until: s.round + 5 }); break;
      case 35:
        s.player.noDecayUntil = s.round + (s.combo >= 10 ? 5 : 3);
        addLog(s, '  锚：连段不再衰减', 'good');
        break;
      case 36:
        s.player.buffs.push({ type: 'dmgTaken', value: 1.2, until: s.round + 3 });
        s.player.buffs.push({ type: 'comboOnHurt', value: 3, until: s.round + 3 });
        break;
      case 37: hitEnemy(s, 100, { ignoreImmune: true }); break;
      case 38: disableMods(s, s.combo >= 7 ? 2 : 1, 3); break;
      case 39:
        s.player.auras.push({ type: 'regen', pct: 0.5 / 3, until: s.round + 3 });
        addLog(s, '  床：开始休息', 'good');
        break;
      case 40:
        s.combo = clamp(s.combo * 2, 0, s.comboCap);
        addLog(s, '  市场：连段翻倍 → ' + s.combo, 'good');
        break;
    }
  }

  /* ---------- 每回合 ---------- */
  function processTimers(s) {
    var due = s.player.timers.filter(function (x) { return x.at <= s.round; });
    s.player.timers = s.player.timers.filter(function (x) { return x.at > s.round; });
    for (var i = 0; i < due.length; i++) {
      var x = due[i];
      if (x.type === 'ship') {
        var d = s.combo >= 7 ? 200 : 100;
        addLog(s, '  船到港：' + d + ' 伤害', 'good');
        hitEnemy(s, d, { ignoreImmune: true });
      } else if (x.type === 'letter') {
        var t = longestBaseCd(s, -1);
        if (t >= 0) { addLog(s, '  信到了：额外触发', 'good'); fireSlot(s, t, { extra: true }); }
      }
    }
  }

  function tickDots(s) {
    var i;
    for (i = 0; i < s.enemy.dots.length; i++) {
      var d = s.enemy.dots[i];
      if (s.round <= d.until) hitEnemy(s, d.dmg, { isDot: true, noBonus: true });
    }
    s.enemy.dots = s.enemy.dots.filter(function (d) { return s.round <= d.until; });

    for (i = 0; i < s.player.dots.length; i++) {
      var p = s.player.dots[i];
      if (s.round <= p.until) enemyHitPlayer(s, p.dmg, { fromDot: true, noReflect: true });
    }
    s.player.dots = s.player.dots.filter(function (p) { return s.round <= p.until; });
  }

  function tickAuras(s) {
    for (var i = 0; i < s.player.auras.length; i++) {
      var a = s.player.auras[i];
      if (s.round > a.until) continue;
      if (a.type === 'bird') { hitEnemy(s, a.dmg); hitEnemy(s, a.dmg); }
      else if (a.type === 'dog') hitEnemy(s, a.dmg);
      else if (a.type === 'garden') { healPlayer(s, a.heal); hitEnemy(s, a.dmg); }
      else if (a.type === 'star') { healPlayer(s, a.heal); addHit(s, a.combo); }
      else if (a.type === 'regen') healPlayer(s, s.player.maxHp * a.pct);
    }
    s.player.auras = s.player.auras.filter(function (a) { return s.round <= a.until; });
  }

  function recalcBuffs(s) {
    s.player.lifesteal = 0;
    s.player.healPerHit = 0;
    s.player.healMult = 1;
    s.player.dmgTakenMult = 1;
    s.player.comboOnHurt = 0;
    s.player.reflect = 0;
    for (var i = 0; i < s.player.buffs.length; i++) {
      var b = s.player.buffs[i];
      if (s.round > b.until) continue;
      if (b.type === 'lifesteal') s.player.lifesteal += b.value;
      else if (b.type === 'healPerHit') s.player.healPerHit += b.value;
      else if (b.type === 'healMult') s.player.healMult += b.value;
      else if (b.type === 'dmgTaken') s.player.dmgTakenMult *= b.value;
      else if (b.type === 'comboOnHurt') s.player.comboOnHurt += b.value;
      else if (b.type === 'reflect') s.player.reflect += b.value;
    }
    s.player.buffs = s.player.buffs.filter(function (b) { return s.round <= b.until; });
  }

  function enemyTurn(s) {
    if (s.enemy.silentRounds > 0) {
      s.enemy.silentRounds--;
      addLog(s, '  敌人无法行动', 'dim');
      return;
    }
    s.enemy.heavyIn--;
    var heavy = false, mult = 1;
    if (s.enemy.heavyIn <= 0) {
      heavy = true; mult = CONFIG.heavyMult; s.enemy.heavyIn = CONFIG.heavyEvery;
    }
    var atk = s.enemy.atk * s.enemy.accum * mult;
    if (hasMod(s, 'rage') && s.enemy.hp < s.enemy.maxHp * 0.3) atk *= 2;
    if (hasMod(s, 'execute') && s.player.hp < s.player.maxHp * 0.3) atk *= 2;
    atk = Math.round(atk);
    var n = s.enemy.attacks || 1;
    addLog(s, '⚔ 敌人' + (heavy ? '重击' : '攻击') + ' ' + atk + (n > 1 ? ' ×' + n : ''), heavy ? 'bad' : '');
    for (var i = 0; i < n; i++) enemyHitPlayer(s, atk);
    if (hasMod(s, 'poisonfang')) addPlayerDot(s, 5, 99);
    if (s.enemy.poison) addPlayerDot(s, s.enemy.poison, 99);
    if (heavy) s.fxRound.heavy = true;
  }

  function cleanup(s) {
    if (s.round > s.player.shieldUntil) s.player.shield = 0;
    s.player.buffs = s.player.buffs.filter(function (b) { return s.round <= b.until; });
    s.player.auras = s.player.auras.filter(function (a) { return s.round <= a.until; });
    s.player.sealed = s.player.sealed.filter(function (x) { return s.round <= x.until; });
    if (s.player.ringRound === s.round && s.dmgDealtThisRound > 0) {
      addShield(s, s.dmgDealtThisRound * 0.3, 2);
    }
    if (s.enemy.shield > 0 && s.round % 3 === 0) { /* 敌方护盾缓慢消失 */ }
  }

  function checkEnd(s) {
    if (s.over) return;
    if (s.enemy.hp <= 0) {
      if (hasMod(s, 'reborn') && !s.enemy.revived) {
        s.enemy.revived = true;
        s.enemy.hp = Math.round(s.enemy.maxHp * 0.3);
        addLog(s, '✖ 转生：敌人又站了起来！', 'bad');
        return;
      }
      s.over = true; s.winner = 'player';
      return;
    }
    if (s.player.hp <= 0) {
      s.player.hp = 0; s.over = true; s.winner = 'enemy';
    }
  }

  /* ---------- 回合主循环 ---------- */
  function stepRound(s) {
    if (s.over) return s;
    s.round++;
    s.hitsThisRound = 0;
    s.dmgDealtThisRound = 0;
    s.firedThisRound = [];
    s.plunderThisRound = false;
    s.player.extraHit = 0;
    s.player.ringRound = -1;
    s.enemy.immune = false;
    s.enemy.dodgedThisRound = false;
    s.fxRound = { dmgEnemy: 0, dmgPlayer: 0, heal: 0, shield: 0, tier: 0, heavy: false };

    addLog(s, '── 第 ' + s.round + ' 回合 ──', 'round');

    // 0. 连段 7 档：共鸣
    if (s.combo >= 7) {
      for (var q = 0; q < s.player.slots.length; q++) {
        if (s.player.slots[q].cd > 0) s.player.slots[q].cd--;
      }
    }

    recalcBuffs(s);

    // 1. 词条回合开始
    var mods = s.enemy.mods.slice();
    for (var m = 0; m < mods.length; m++) {
      var id = mods[m];
      if (!hasMod(s, id)) continue;
      var h = MOD_HOOKS[id];
      if (h && h.roundStart) { h.roundStart(s); if (s.over) return s; }
    }

    // 2. 延迟事件
    processTimers(s);
    if (s.over) return s;

    // 3. 玩家出牌
    for (var i = 0; i < s.player.slots.length; i++) {
      if (isSealed(s, i)) continue;
      if (s.player.slots[i].cd <= 0) fireSlot(s, i);
      if (s.over) return s;
    }

    // 4. 连段 9 档：命定（额外触发一张，但会消耗它的冷却）
    if (s.combo >= 9) {
      var cand = [];
      for (var z = 0; z < s.player.slots.length; z++) {
        if (s.player.slots[z].cd > 0) cand.push(z);
      }
      if (!cand.length) for (var z2 = 0; z2 < s.player.slots.length; z2++) cand.push(z2);
      var li = pick(cand);
      if (li !== undefined) {
        addLog(s, '命定：额外触发 ' + CARD_BY_ID[s.player.slots[li].id].name, 'tier');
        fireSlot(s, li, { extra: true });
        s.player.slots[li].cd = CARD_BY_ID[s.player.slots[li].id].cd;
      }
      if (s.over) return s;
    }

    // 5. 持续伤害 + 光环
    tickDots(s);
    if (s.over) return s;
    tickAuras(s);
    if (s.over) return s;

    // 6. 连段衰减
    if (s.hitsThisRound === 0 && s.round > s.player.noDecayUntil && s.combo > 0) {
      s.combo = Math.max(0, s.combo - CONFIG.comboDecay);
      addLog(s, '连段衰减 −' + CONFIG.comboDecay, 'dim');
    }

    // 7. 敌人行动
    enemyTurn(s);
    if (s.over) return s;

    // 8. 冷却
    for (var k = 0; k < s.player.slots.length; k++) {
      var sl = s.player.slots[k];
      if (sl.cd > 0) sl.cd--;
    }

    // 9. 收尾
    cleanup(s);
    checkEnd(s);
    return s;
  }

  /* ---------- 词条钩子 ---------- */
  var MOD_HOOKS = {
    ironwall: {
      roundStart: function (s) {
        if (s.round % 3 === 0 && hasMod(s, 'ironwall')) {
          s.enemy.immune = true;
          addLog(s, '铁壁：本回合免疫', 'dim');
        }
      }
    },
    regen: {
      roundStart: function (s) {
        if (hasMod(s, 'regen')) healEnemy(s, s.enemy.maxHp * 0.05);
      }
    },
    cleanse: {
      roundStart: function (s) {
        if (hasMod(s, 'cleanse') && s.round % 3 === 0 && s.enemy.dots.length) {
          s.enemy.dots = [];
          addLog(s, '净化：毒被清除', 'bad');
        }
      }
    },
    heavyatk: {
      roundStart: function (s) {
        if (hasMod(s, 'heavyatk')) enemyHitPlayer(s, 40, { pure: true });
      }
    },
    stack: {
      roundStart: function (s) {
        if (hasMod(s, 'stack')) s.enemy.accum *= 1.1;
      }
    },
    seal: {
      roundStart: function (s) {
        if (hasMod(s, 'seal') && s.round % 5 === 0) {
          var idx = Math.floor(rnd() * s.player.slots.length);
          s.player.sealed.push({ slot: idx, until: s.round + 2 });
          addLog(s, '封槽：第 ' + (idx + 1) + ' 格被封印', 'bad');
        }
      }
    },
    draincombo: {
      roundStart: function (s) {
        if (hasMod(s, 'draincombo') && s.round % 2 === 0) {
          s.combo = Math.max(0, s.combo - 3);
          addLog(s, '吸连：连段 −3', 'bad');
        }
      }
    },
    delay: {
      roundStart: function (s) {
        if (hasMod(s, 'delay') && s.round % 4 === 0) {
          for (var i = 0; i < s.player.slots.length; i++) s.player.slots[i].cd += 1;
          addLog(s, '拖延：所有牌 CD +1', 'bad');
        }
      }
    },
    timestop: {
      roundStart: function (s) {
        if (hasMod(s, 'timestop') && s.round % 7 === 0) {
          s.combo = 0;
          for (var i = 0; i < s.player.slots.length; i++) {
            s.player.slots[i].cd = CARD_BY_ID[s.player.slots[i].id].cd;
          }
          addLog(s, '时停：连段归零，所有牌进入冷却', 'bad');
        }
      }
    },
    hunger: {
      roundStart: function (s) {
        if (hasMod(s, 'hunger')) enemyHitPlayer(s, s.player.maxHp * 0.05, { pure: true });
      }
    },
    silence: {
      roundStart: function (s) {
        if (hasMod(s, 'silence') && s.round % 5 === 0) {
          var idx = Math.floor(rnd() * s.player.slots.length);
          s.player.sealed.push({ slot: idx, until: s.round + 1 });
          addLog(s, '沉默：第 ' + (idx + 1) + ' 格本回合不触发', 'bad');
        }
      }
    },
    sacrifice: {
      roundStart: function (s) {
        if (hasMod(s, 'sacrifice')) {
          s.enemy.hp -= s.enemy.maxHp * 0.03;
          checkEnd(s);
        }
      }
    }
  };

  /* ---------- 战斗初始化 ---------- */
  function newBattle(opts) {
    var enemy = opts.enemy;
    var maxHp = CONFIG.playerHp + (opts.level - 1) * CONFIG.playerHpPerLevel;
    var s = {
      round: 0,
      stage: opts.stage,
      level: opts.level,
      combo: 0,
      comboCap: CONFIG.comboCap,
      log: [],
      over: false,
      winner: null,
      hitsThisRound: 0,
      dmgDealtThisRound: 0,
      triggerDepth: 0,
      fxRound: { dmgEnemy: 0, dmgPlayer: 0, heal: 0, shield: 0, tier: 0, heavy: false },
      player: {
        name: '你',
        hp: maxHp, maxHp: maxHp,
        shield: 0, shieldUntil: 0,
        dots: [], auras: [], buffs: [], timers: [], sealed: [],
        dmgBonus: 0, lifesteal: 0, healPerHit: 0, healMult: 1,
        dmgTakenMult: 1, comboOnHurt: 0, reflect: 0,
        extraHit: 0, noDecayUntil: 0, ringRound: -1,
        slots: opts.loadout.map(function (id, i) { return { id: id, cd: Math.min(i, 4) }; })
      },
      enemy: {
        name: enemy.name,
        protoName: enemy.protoName,
        isBoss: !!enemy.isBoss,
        protoId: enemy.protoId,
        mods: enemy.mods.slice(),
        maxHp: enemy.maxHp,
        hp: enemy.maxHp,
        atk: enemy.atk,
        attacks: enemy.attacks || 1,
        poison: enemy.poison || 0,
        dodgeEvery: enemy.dodgeEvery || 0,
        shield: enemy.startShield || 0,
        dots: [], disabled: {},
        immune: false, heavyIn: CONFIG.heavyEvery, silentRounds: 0,
        accum: 1, revived: false, healBlockUntil: 0
      }
    };
    if (hasMod(s, 'curse')) {
      var n = s.player.slots.filter(function (x) { return CARD_BY_ID[x.id].role === '花'; }).length;
      s.enemy.atk *= (1 + 0.1 * n);
      if (n > 0) addLog(s, '诅咒：你带了 ' + n + ' 张「花」牌，敌人伤害 +' + (n * 10) + '%', 'bad');
    }
    if (hasMod(s, 'sacrifice')) {
      s.comboCap = Math.max(5, s.comboCap - 10);
      addLog(s, '献祭：你的连段上限 −10', 'bad');
    }
    if (hasMod(s, 'mirror')) {
      var low = -1, lowCd = 99;
      for (var i = 0; i < s.player.slots.length; i++) {
        var c = CARD_BY_ID[s.player.slots[i].id];
        if (c.cd < lowCd) { lowCd = c.cd; low = i; }
      }
      s.enemy.atk *= 1.3;
      addLog(s, '镜影：敌人复制了你的「' + (low >= 0 ? CARD_BY_ID[s.player.slots[low].id].name : '?') + '」，攻击 +30%', 'bad');
    }
    addLog(s, '战斗开始：' + s.enemy.name, 'round');
    return s;
  }

  /* ---------- 敌人生成 ---------- */
  function isExcluded(a, b) {
    for (var i = 0; i < EXCLUSIONS.length; i++) {
      var p = EXCLUSIONS[i];
      if ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)) return true;
    }
    return false;
  }

  function generateEnemy(stage, collection) {
    var isBoss = stage % 3 === 0;
    var count = stage < 5 ? 1 : 2;
    var budget = (stage <= 4 ? 3 : 5) + (isBoss ? 1 : 0);
    var chosen = [];
    for (var attempt = 0; attempt < 300; attempt++) {
      var pool = shuffle(MODIFIERS.slice());
      var sel = [], sum = 0;
      for (var i = 0; i < pool.length && sel.length < count; i++) {
        var m = pool[i];
        if (!m.answers.some(function (id) { return collection.indexOf(id) >= 0; })) continue;
        var bad = sel.some(function (x) { return isExcluded(x.id, m.id); });
        if (bad) continue;
        if (sum + m.threat > budget) continue;
        sel.push(m); sum += m.threat;
      }
      if (sel.length === count) { chosen = sel; break; }
      if (attempt > 200 && sel.length > 0) { chosen = sel; break; }
    }
    if (!chosen.length) chosen = [MODIFIERS[0]];

    var proto = pick(PROTOTYPES);
    var hp = Math.round((CONFIG.enemyBaseHp + stage * CONFIG.enemyHpPerStage) * proto.hpMul * (isBoss ? 1.25 : 1));
    var atk = (CONFIG.enemyBaseAtk + stage * CONFIG.enemyAtkPerStage) * proto.atkMul * (isBoss ? 1.12 : 1);
    atk = Math.round(atk * 10) / 10;

    return {
      name: proto.name + (isBoss ? ' · 首领' : ''),
      protoName: proto.name,
      protoId: proto.id,
      protoDesc: proto.desc,
      isBoss: isBoss,
      mods: chosen.map(function (m) { return m.id; }),
      maxHp: hp,
      atk: atk,
      attacks: proto.attacks || 1,
      poison: proto.poison || 0,
      dodgeEvery: proto.dodgeEvery || 0,
      startShield: proto.startShieldPct ? Math.round(hp * proto.startShieldPct) : 0,
      budget: budget
    };
  }

  function runToEnd(s, maxRounds) {
    maxRounds = maxRounds || 300;
    while (!s.over && s.round < maxRounds) stepRound(s);
    return s;
  }

  return {
    newBattle: newBattle,
    stepRound: stepRound,
    runToEnd: runToEnd,
    generateEnemy: generateEnemy,
    hasMod: hasMod
  };
});
