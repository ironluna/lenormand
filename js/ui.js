/* ============================================================
   界面与流程
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var E = window.Engine;

  var UI = {
    level: 1,
    stage: 1,
    collection: STARTING_COLLECTION.slice(),
    loadout: [],
    enemy: null,
    battle: null,
    timer: null,
    speed: 1,
    paused: false,
    maxCombo: 0,
    reward: [],
    gameOver: false,
    victory: false
  };

  function slotsCount() {
    return UI.level >= 9 ? 9 : UI.level >= 6 ? 7 : UI.level >= 3 ? 5 : 3;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function show(name) {
    document.querySelectorAll('.screen').forEach(function (el) { el.classList.remove('active'); });
    $('#screen-' + name).classList.add('active');
  }

  /* ---------------- 卡牌 HTML ---------------- */
  function cardHTML(card, opts) {
    opts = opts || {};
    return '<div class="card' + (opts.equipped ? ' equipped' : '') + '" data-role="' + card.role + '" data-id="' + card.id + '">' +
      (opts.answer ? '<div class="answer-dot" title="能解本关词条"></div>' : '') +
      '<div class="cnum">NO.' + String(card.id).padStart(2, '0') + '</div>' +
      '<div class="cname">' + esc(card.name) + '</div>' +
      '<div class="cdesc">' + esc(card.desc) + '</div>' +
      '<div class="cfoot"><span class="ccd">CD ' + card.cd + '</span><span class="crole">' + card.role + '</span></div>' +
      '</div>';
  }

  function modHTML(m) {
    var pips = '';
    for (var i = 0; i < 5; i++) pips += '<span class="pip' + (i < m.threat ? ' on' : '') + '"></span>';
    return '<div class="mod">' +
      '<div class="mod-top"><span class="mod-name">' + esc(m.name) + '</span>' +
      '<span class="pips">' + pips + '</span>' +
      '<span class="mod-threat">威胁 ' + m.threat + '</span></div>' +
      '<div class="mod-desc">' + esc(m.desc) + '</div>' +
      '</div>';
  }

  /* ---------------- 构筑页 ---------------- */
  function enterBuild() {
    UI.enemy = E.generateEnemy(UI.stage, UI.collection);
    var n = slotsCount();
    UI.loadout = UI.loadout.slice(0, n);
    while (UI.loadout.length < n) UI.loadout.push(null);
    renderBuild();
    show('build');
  }

  function answerSet() {
    var set = {};
    (UI.enemy ? UI.enemy.mods : []).forEach(function (id) {
      MOD_BY_ID[id].answers.forEach(function (a) { set[a] = true; });
    });
    return set;
  }

  function renderBuild() {
    $('#build-stage').textContent = UI.stage;
    $('#build-level').textContent = UI.level;
    var n = slotsCount();
    var filled = UI.loadout.filter(Boolean).length;
    $('#build-slotcount').textContent = filled + '/' + n;

    var e = UI.enemy;
    var mods = e.mods.map(function (id) { return MOD_BY_ID[id]; });
    var ans = answerSet();
    var threatSum = mods.reduce(function (a, m) { return a + m.threat; }, 0);
    var answerCount = UI.collection.filter(function (id) { return ans[id]; }).length;
    $('#build-enemy').innerHTML =
      '<div class="enemy-head">' +
        '<div class="build-sprite"><canvas id="build-enemy-sprite" width="16" height="16"></canvas></div>' +
        '<div class="enemy-head-info">' +
          '<div class="enemy-name-row">' +
            '<span class="enemy-name">' + esc(e.name) + '</span>' +
            (e.isBoss ? '<span class="enemy-boss">首领</span>' : '') +
          '</div>' +
          '<div class="enemy-proto">' + esc(e.protoDesc) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="enemy-stats">' +
        '<div class="enemy-stat">生命<b>' + e.maxHp + '</b></div>' +
        '<div class="enemy-stat">攻击<b>' + e.atk + '</b></div>' +
        '<div class="enemy-stat">威胁预算<b>' + e.budget + '</b></div>' +
      '</div>' +
      '<div class="panel-title">词条 · 题面</div>' +
      '<div class="mod-list">' + mods.map(modHTML).join('') + '</div>' +
      '<div class="threat-box">' +
        '<div>词条总威胁 <b>' + threatSum + '</b> / 预算 <b>' + e.budget + '</b></div>' +
        '<div>牌库里能应对的牌 <b>' + answerCount + '</b> 张 ' +
          (answerCount > 0 ? '<span class="ok">✓</span>' : '<span class="no">✗</span>') + '</div>' +
        '<div class="legend">金点标记 = 能解本关词条的牌</div>' +
      '</div>';

    drawPixelSprite(document.getElementById('build-enemy-sprite'), SPRITES[e.protoId]);

    // 槽位
    var slotsHTML = '';
    for (var i = 0; i < n; i++) {
      var id = UI.loadout[i];
      if (id) slotsHTML += '<div class="slot filled" data-slot="' + i + '">' + cardHTML(CARD_BY_ID[id]) + '</div>';
      else slotsHTML += '<div class="slot" data-slot="' + i + '">+ 空槽</div>';
    }
    $('#build-slots').innerHTML = slotsHTML;

    // 牌库
    var sorted = UI.collection.slice().sort(function (a, b) {
      var ra = CARD_BY_ID[a].role, rb = CARD_BY_ID[b].role;
      if (ra !== rb) return '产续花吃'.indexOf(ra) - '产续花吃'.indexOf(rb);
      return a - b;
    });
    $('#build-collection').innerHTML = sorted.map(function (cid) {
      return cardHTML(CARD_BY_ID[cid], {
        equipped: UI.loadout.indexOf(cid) >= 0,
        answer: !!ans[cid]
      });
    }).join('');
    $('#build-collcount').textContent = '(' + UI.collection.length + ')';

    $('#btn-fight').disabled = filled === 0;
  }

  function equipCard(id) {
    var idx = UI.loadout.indexOf(id);
    if (idx >= 0) { UI.loadout[idx] = null; renderBuild(); return; }
    var empty = UI.loadout.indexOf(null);
    if (empty < 0) {
      var btn = $('#btn-fight');
      btn.textContent = '槽 位 已 满';
      setTimeout(function () { btn.textContent = '开 打'; }, 700);
      return;
    }
    UI.loadout[empty] = id;
    renderBuild();
  }

  /* ---------------- 战斗 ---------------- */
  function startFight() {
    var loadout = UI.loadout.filter(Boolean);
    if (!loadout.length) return;
    UI.battle = E.newBattle({ loadout: loadout, level: UI.level, stage: UI.stage, enemy: UI.enemy });
    UI.maxCombo = 0;
    UI.paused = false;
    $('#btn-pause').textContent = '暂停';
    drawPixelSprite(document.getElementById('enemy-sprite'), SPRITES[UI.enemy.protoId]);
    show('battle');
    renderBattle(true);
    startTimer();
  }

  function startTimer() {
    stopTimer();
    UI.timer = setInterval(tick, Math.round(760 / UI.speed));
  }
  function stopTimer() {
    if (UI.timer) { clearInterval(UI.timer); UI.timer = null; }
  }

  function tick() {
    var b = UI.battle;
    if (!b || b.over || UI.paused) return;
    E.stepRound(b);
    UI.maxCombo = Math.max(UI.maxCombo, b.combo);
    renderBattle(false);
    if (b.over) {
      stopTimer();
      setTimeout(showResult, 850);
    }
  }

  function renderBattle(first) {
    var b = UI.battle;
    if (!b) return;

    $('#b-enemy-name').textContent = b.enemy.protoName || b.enemy.name;
    $('#b-enemy-boss').hidden = !b.enemy.isBoss;
    var ehpPct = Math.max(0, b.enemy.hp) / b.enemy.maxHp * 100;
    $('#b-enemy-hp').style.width = ehpPct + '%';
    $('#b-enemy-hptext').textContent = Math.max(0, Math.round(b.enemy.hp)) + ' / ' + b.enemy.maxHp +
      (b.enemy.shield > 0 ? '  ◆' + Math.round(b.enemy.shield) : '');

    $('#b-enemy-mods').innerHTML = b.enemy.mods.map(function (id) {
      var m = MOD_BY_ID[id];
      var disabled = b.enemy.disabled[id] && b.round <= b.enemy.disabled[id];
      return '<span class="mod-chip' + (disabled ? ' disabled' : '') + '">' + esc(m.name) + ' · ' + m.threat + '</span>';
    }).join('');

    var phpPct = Math.max(0, b.player.hp) / b.player.maxHp * 100;
    $('#b-player-hp').style.width = phpPct + '%';
    $('#b-player-hptext').textContent = Math.max(0, Math.round(b.player.hp)) + ' / ' + b.player.maxHp;
    $('#b-player-shield').textContent = b.player.shield > 0 ? '◆ 护盾 ' + Math.round(b.player.shield) : '';

    $('#b-combo').textContent = b.combo;
    $('#b-combo').classList.toggle('bump', b.combo >= 9);
    $('#b-tiers').innerHTML = COMBO_TIERS.map(function (t) {
      return '<div class="tier' + (b.combo >= t.n ? ' on' : '') + '" title="' + esc(t.desc) + '">' +
        '<span class="tn">' + t.n + '</span>' + esc(t.name) + '</div>';
    }).join('');

    $('#b-round').textContent = '第 ' + b.round + ' 回合';

    // 槽位
    var slotsHTML = '';
    for (var i = 0; i < b.player.slots.length; i++) {
      var sl = b.player.slots[i];
      var c = CARD_BY_ID[sl.id];
      var firing = b.firedThisRound && b.firedThisRound.indexOf(i) >= 0;
      var sealed = false;
      for (var k = 0; k < b.player.sealed.length; k++) {
        if (b.player.sealed[k].slot === i && b.round <= b.player.sealed[k].until) sealed = true;
      }
      slotsHTML += '<div class="bcard' + (firing ? ' firing' : '') + (sl.cd <= 0 ? ' ready' : '') + '" data-role="' + c.role + '">' +
        '<div class="bname">' + esc(c.name) + '</div>' +
        '<div class="bcd">' + (sealed ? '封' : 'CD ' + sl.cd) + '</div>' +
        ((sl.cd > 0 || sealed) ? '<div class="mask">' + (sealed ? '×' : sl.cd) + '</div>' : '') +
        '</div>';
    }
    $('#b-slots').innerHTML = slotsHTML;

    // 日志
    var logEl = $('#b-log');
    var lines = b.log.slice(-70).map(function (l) {
      var cls = l.cls ? ' ' + l.cls.split(' ').map(function (x) { return 'l-' + x; }).join(' ') : '';
      return '<div class="' + cls.trim() + '">' + esc(l.text) + '</div>';
    }).join('');
    logEl.innerHTML = lines;
    logEl.scrollTop = logEl.scrollHeight;

    if (!first) spawnFx(b);
  }

  function floatTo(container, text, cls) {
    if (!container) return;
    var olds = container.querySelectorAll('.float-dmg');
    for (var i = 0; i < olds.length; i++) olds[i].remove();
    var d = document.createElement('div');
    d.className = 'float-dmg ' + (cls || '');
    d.textContent = text;
    container.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 1000);
  }

  function spawnFx(b) {
    var fx = b.fxRound;
    if (!fx) return;
    if (fx.dmgEnemy > 0) {
      floatTo($('.enemy-board'), '-' + Math.round(fx.dmgEnemy), 'float-side');
      var frame = $('#b-sprite-frame');
      if (frame) {
        frame.classList.remove('hit');
        void frame.offsetWidth;
        frame.classList.add('hit');
      }
    }
    if (fx.dmgPlayer > 0) floatTo($('.player-hprow'), '-' + Math.round(fx.dmgPlayer), 'float-bar');
    if (fx.heal > 0) floatTo($('.player-hprow'), '+' + Math.round(fx.heal), 'float-heal float-bar');
    if (fx.tier) floatTo($('.combo-panel'), 'TIER ' + fx.tier, 'float-tier');
    if (fx.heavy) {
      var board = $('.enemy-board');
      board.classList.remove('shake');
      void board.offsetWidth;
      board.classList.add('shake');
    }
  }

  /* ---------------- 结算 ---------------- */
  function grantCards(n) {
    var owned = {};
    UI.collection.forEach(function (id) { owned[id] = true; });
    var pool = CARDS.map(function (c) { return c.id; }).filter(function (id) { return !owned[id]; });
    var got = [];
    for (var i = 0; i < n && pool.length; i++) {
      var k = Math.floor(Math.random() * pool.length);
      got.push(pool[k]);
      pool.splice(k, 1);
    }
    UI.collection = UI.collection.concat(got);
    return got;
  }

  function showResult() {
    var b = UI.battle;
    if (!b) return;
    var win = b.winner === 'player';
    UI.reward = [];

    if (win) {
      UI.stage++;
      UI.level = Math.min(9, UI.stage);
      UI.reward = grantCards(2);
      if (UI.stage > CONFIG.totalStages) UI.victory = true;
    } else {
      UI.gameOver = true;
    }

    var title = win ? '胜 利' : '败 北';
    if (UI.victory) title = '通 关';
    $('#result-title').textContent = title;
    $('#result-title').className = 'result-title ' + (win ? 'win' : 'lose');
    $('#result-sub').textContent = win
      ? (UI.victory ? '你读完了这一局。' : '下一关的对手已经在等你了。')
      : '构筑被对面拆了。换一套再来。';

    $('#result-stats').innerHTML =
      '<div class="result-stat">回合<b>' + b.round + '</b></div>' +
      '<div class="result-stat">最高连段<b>' + UI.maxCombo + '</b></div>' +
      '<div class="result-stat">剩余生命<b>' + Math.max(0, Math.round(b.player.hp)) + '</b></div>' +
      '<div class="result-stat">剩余敌人<b>' + Math.max(0, Math.round(b.enemy.hp)) + '</b></div>';

    if (UI.reward.length) {
      $('#reward-label').textContent = '获得新牌';
      $('#reward-row').innerHTML = UI.reward.map(function (id) {
        return cardHTML(CARD_BY_ID[id]);
      }).join('');
    } else {
      $('#reward-label').textContent = '';
      $('#reward-row').innerHTML = '';
    }

    $('#btn-continue').textContent = (UI.gameOver || UI.victory) ? '再 来 一 局' : '继 续';
    show('result');
  }

  function resetRun() {
    UI.level = 1;
    UI.stage = 1;
    UI.collection = STARTING_COLLECTION.slice();
    UI.loadout = [];
    UI.battle = null;
    UI.reward = [];
    UI.gameOver = false;
    UI.victory = false;
    UI.maxCombo = 0;
    enterBuild();
  }

  /* ---------------- 事件 ---------------- */
  $('#btn-start').addEventListener('click', resetRun);

  $('#btn-fight').addEventListener('click', startFight);

  $('#build-collection').addEventListener('click', function (ev) {
    var el = ev.target.closest('.card');
    if (!el) return;
    equipCard(parseInt(el.dataset.id, 10));
  });

  $('#build-slots').addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-slot]');
    if (!el) return;
    var i = parseInt(el.dataset.slot, 10);
    if (UI.loadout[i]) { UI.loadout[i] = null; renderBuild(); }
  });

  $('#btn-pause').addEventListener('click', function () {
    UI.paused = !UI.paused;
    this.textContent = UI.paused ? '继续' : '暂停';
  });

  $('#btn-speed').addEventListener('click', function () {
    UI.speed = UI.speed === 1 ? 2 : UI.speed === 2 ? 4 : 1;
    this.textContent = UI.speed + '×';
    if (UI.battle && !UI.battle.over) startTimer();
  });

  $('#btn-quit').addEventListener('click', function () {
    stopTimer();
    UI.battle = null;
    enterBuild();
  });

  $('#btn-continue').addEventListener('click', function () {
    if (UI.gameOver || UI.victory) resetRun();
    else enterBuild();
  });

  // 首次进入停在标题页；点「开始一局」才进入构筑
  // 调试入口：?auto=build / ?auto=battle / ?auto=result
  (function debugAuto() {
    var mode = new URLSearchParams(location.search).get('auto');
    if (!mode) return;
    enterBuild();
    if (mode !== 'battle' && mode !== 'result') return;

    var pref = [7, 10, 11, 1, 5, 15, 24, 39, 4];
    var picks = pref.filter(function (id) { return UI.collection.indexOf(id) >= 0; });
    for (var i = 0; i < slotsCount(); i++) UI.loadout[i] = picks[i] || null;
    renderBuild();

    if (mode === 'battle') { startFight(); return; }
    startFight();
    E.runToEnd(UI.battle, 200);
    UI.maxCombo = Math.max(UI.maxCombo, UI.battle.combo);
    stopTimer();
    showResult();
  })();
})();
