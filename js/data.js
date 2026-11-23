/* ============================================================
   雷诺曼 × 大阿尔卡纳 · 数据表
   测试版：所有数值均为占位，优先验证结构
   ============================================================ */

var CONFIG = {
  playerHp: 400,
  playerHpPerLevel: 12,
  comboCap: 40,
  comboDecay: 2,
  tierDamageBonus: 0.15,
  enemyBaseHp: 300,
  enemyHpPerStage: 118,
  enemyBaseAtk: 10,
  enemyAtkPerStage: 2.95,
  heavyEvery: 3,
  heavyMult: 2.2,
  totalStages: 9
};

/* ---------------- 40 张雷诺曼 ---------------- */
var CARDS = [
  { id: 1,  name: '骑手',    role: '产', cd: 2, desc: '造成20伤害，下一张牌CD-1' },
  { id: 2,  name: '三叶草',  role: '产', cd: 3, desc: '30%概率触发CD最长的牌' },
  { id: 3,  name: '船',      role: '吃', cd: 6, desc: '3回合后100伤害；届时连段≥7则200' },
  { id: 4,  name: '房子',    role: '续', cd: 4, desc: '获得100护盾，持续3回合' },
  { id: 5,  name: '树',      role: '续', cd: 4, desc: '施加8/回合的毒，持续8回合' },
  { id: 6,  name: '云',      role: '吃', cd: 4, desc: '敌人重击延迟2回合；连段≥5则沉默它' },
  { id: 7,  name: '蛇',      role: '续', cd: 2, desc: '施加10/回合的毒，持续5回合' },
  { id: 8,  name: '棺材',    role: '续', cd: 5, desc: '敌人重击延迟2回合' },
  { id: 9,  name: '花束',    role: '吃', cd: 4, desc: '回复15%最大生命；连段≥9则40%' },
  { id: 10, name: '镰刀',    role: '花', cd: 5, desc: '150伤害；目标<30%生命时直接斩杀' },
  { id: 11, name: '鞭子',    role: '产', cd: 2, desc: '造成3段各8伤害' },
  { id: 12, name: '鸟',      role: '产', cd: 5, desc: '召唤2只鸟，每回合各8伤害，4回合' },
  { id: 13, name: '孩子',    role: '产', cd: 4, desc: '使CD最长的一张牌立即就绪' },
  { id: 14, name: '狐狸',    role: '吃', cd: 5, desc: '60伤害，无视护盾；连段≥7则120' },
  { id: 15, name: '熊',      role: '花', cd: 5, desc: '造成120伤害并获得50护盾' },
  { id: 16, name: '星星',    role: '续', cd: 6, desc: '每回合回复8并+2连段，4回合' },
  { id: 17, name: '鹳',      role: '产', cd: 5, desc: '交换首尾两张牌，并各触发一次' },
  { id: 18, name: '狗',      role: '续', cd: 5, desc: '召唤狗，每回合15伤害，6回合' },
  { id: 19, name: '塔',      role: '续', cd: 5, desc: '获得60护盾并反弹30%伤害，3回合' },
  { id: 20, name: '花园',    role: '续', cd: 5, desc: '每回合回复10并造成10伤害，5回合' },
  { id: 21, name: '山',      role: '续', cd: 4, desc: '敌人重击延迟2回合' },
  { id: 22, name: '十字路口', role: '产', cd: 3, desc: '随机触发另外一张牌' },
  { id: 23, name: '老鼠',    role: '续', cd: 4, desc: '敌人受到的治疗-50%，4回合' },
  { id: 24, name: '心',      role: '续', cd: 5, desc: '回复25%最大生命，获得30%吸血，3回合' },
  { id: 25, name: '戒指',    role: '花', cd: 5, desc: '本回合造成伤害的30%转化为护盾' },
  { id: 26, name: '书',      role: '吃', cd: 6, desc: '永久+5%伤害，可叠加' },
  { id: 27, name: '信',      role: '产', cd: 4, desc: '2回合后额外触发一张随机牌' },
  { id: 28, name: '男人',    role: '产', cd: 4, desc: '本回合每张伤害牌额外造成50%伤害' },
  { id: 29, name: '女人',    role: '续', cd: 4, desc: '治疗量+50%，持续4回合' },
  { id: 30, name: '百合',    role: '续', cd: 5, desc: '清除自身负面并回复15%最大生命' },
  { id: 31, name: '太阳',    role: '花', cd: 6, desc: '消耗全部连段，每点造成20伤害' },
  { id: 32, name: '月亮',    role: '续', cd: 7, desc: '敌人1回合无法行动' },
  { id: 33, name: '钥匙',    role: '产', cd: 6, desc: '使CD最长的牌就绪，并立即触发两次' },
  { id: 34, name: '鱼',      role: '续', cd: 4, desc: '每次命中回复2生命，持续5回合' },
  { id: 35, name: '锚',      role: '吃', cd: 5, desc: '连段不衰减3回合；连段≥10则5回合' },
  { id: 36, name: '十字',    role: '吃', cd: 5, desc: '受到伤害+20%，但每次受伤+3连段，3回合' },
  { id: 37, name: '灵体',    role: '花', cd: 6, desc: '无视免疫，造成100伤害' },
  { id: 38, name: '香炉',    role: '吃', cd: 5, desc: '敌人词条失效3回合；连段≥7则失效2条' },
  { id: 39, name: '床',      role: '续', cd: 6, desc: '3回合内回复50%当前最大生命' },
  { id: 40, name: '市场',    role: '花', cd: 8, desc: '连段翻倍（不超过上限）' }
];

var CARD_BY_ID = {};
for (var _i = 0; _i < CARDS.length; _i++) CARD_BY_ID[CARDS[_i].id] = CARDS[_i];

/* ---------------- 敌人词条 ---------------- */
var MODIFIERS = [
  { id: 'ironwall',   name: '铁壁', threat: 3, desc: '每 3 回合免疫 1 回合（DOT 照跳）',        answers: [7, 5, 37, 3] },
  { id: 'regen',      name: '再生', threat: 3, desc: '每回合回复 5% 最大生命',                    answers: [23, 10, 31, 15] },
  { id: 'scale',      name: '鳞甲', threat: 2, desc: '每次受到的直接伤害 −20（最低 5）',           answers: [10, 15, 31] },
  { id: 'reflect',    name: '反伤', threat: 2, desc: '单次伤害超过 30 的部分全额反弹',              answers: [11, 12, 34] },
  { id: 'cleanse',    name: '净化', threat: 3, desc: '每 3 回合清空自身 DOT',                      answers: [37, 3, 10] },
  { id: 'heavyatk',   name: '高攻', threat: 3, desc: '每回合额外造成 40 固定伤害',                  answers: [4, 19, 39, 24] },
  { id: 'rage',       name: '狂暴', threat: 2, desc: '血量低于 30% 时伤害翻倍',                     answers: [10, 32, 8] },
  { id: 'stack',      name: '累积', threat: 4, desc: '每回合伤害 +10%，可叠加',                     answers: [39, 24, 10] },
  { id: 'poisonfang', name: '毒牙', threat: 2, desc: '每次攻击附带 5 层毒',                         answers: [30, 24, 20] },
  { id: 'execute',    name: '处决', threat: 3, desc: '你血量低于 30% 时受到双倍伤害',               answers: [39, 24, 4] },
  { id: 'seal',       name: '封槽', threat: 4, desc: '每 5 回合封印你一个随机槽位 2 回合',          answers: [1, 11, 7] },
  { id: 'draincombo', name: '吸连', threat: 3, desc: '每 2 回合你的连段 −3',                        answers: [35, 16, 7] },
  { id: 'delay',      name: '拖延', threat: 2, desc: '每 4 回合你所有牌 CD +1',                     answers: [1, 13, 33] },
  { id: 'plunder',    name: '掠夺', threat: 3, desc: '每回合第一次命中时，你的连段 −3',              answers: [11, 12, 16] },
  { id: 'timestop',   name: '时停', threat: 5, desc: '每 7 回合连段归零，且你所有牌进入冷却',        answers: [7, 5, 37] },
  { id: 'reborn',     name: '转生', threat: 4, desc: '死亡时以 30% 生命复活一次',                   answers: [10, 31, 37] },
  { id: 'thorns',     name: '荆棘', threat: 3, desc: '你的治疗有 50% 概率转为治疗敌人',              answers: [4, 19, 39] },
  { id: 'hunger',     name: '饥饿', threat: 3, desc: '每回合吸取你 5% 最大生命',                    answers: [39, 24, 20, 34] },
  { id: 'curse',      name: '诅咒', threat: 3, desc: '你每带一张「花」类牌，敌人伤害 +10%',          answers: [10, 15, 11] },
  { id: 'echo',       name: '回响', threat: 3, desc: '你每触发一张牌，敌人重击提前 1 回合',          answers: [10, 15, 3] },
  { id: 'erode',      name: '磨蚀', threat: 2, desc: '你的护盾效果 −50%',                           answers: [39, 24, 20] },
  { id: 'mirror',     name: '镜影', threat: 4, desc: '开场复制你 CD 最短的牌：敌人攻击 +30%',       answers: [4, 19, 39, 24] },
  { id: 'silence',    name: '沉默', threat: 2, desc: '每 5 回合你随机一张牌本回合不触发',            answers: [11, 1, 7] },
  { id: 'sacrifice',  name: '献祭', threat: 2, desc: '敌人每回合损失 3% 生命，但你的连段上限 −10',   answers: [10, 31, 15] }
];

var MOD_BY_ID = {};
for (var _m = 0; _m < MODIFIERS.length; _m++) MOD_BY_ID[MODIFIERS[_m].id] = MODIFIERS[_m];

/* 互斥：答案方向冲突，不能同场 */
var EXCLUSIONS = [
  ['ironwall', 'scale'],
  ['reflect', 'scale'],
  ['timestop', 'draincombo'],
  ['seal', 'silence'],
  ['thorns', 'regen'],
  ['reborn', 'regen']
];

/* ---------------- 敌人原型 ---------------- */
var PROTOTYPES = [
  { id: 'colossus', name: '巨像',   hpMul: 1.5, atkMul: 0.7, attacks: 1, desc: '高血低攻' },
  { id: 'witch',    name: '巫师',   hpMul: 0.8, atkMul: 1.3, attacks: 1, poison: 4, desc: '低血高攻，攻击附带弱毒' },
  { id: 'wolf',     name: '狼',     hpMul: 1.0, atkMul: 0.8, attacks: 2, desc: '每回合攻击 2 次' },
  { id: 'warden',   name: '守塔人', hpMul: 1.2, atkMul: 1.0, attacks: 1, startShieldPct: 0.2, desc: '开局自带 20% 最大生命护盾' },
  { id: 'wraith',   name: '游魂',   hpMul: 0.9, atkMul: 1.0, attacks: 1, dodgeEvery: 5, desc: '每 5 回合闪避一次直接伤害（DOT 不受影响）' }
];

/* ---------------- 连段分档 ---------------- */
var COMBO_TIERS = [
  { n: 3, name: '起势', desc: '造成伤害 +15%' },
  { n: 5, name: '连环', desc: '每次命中额外 +1 连段' },
  { n: 7, name: '共鸣', desc: '回合开始时所有牌 CD −1' },
  { n: 9, name: '命定', desc: '每回合额外触发一张牌（消耗其冷却）' }
];

/* ---------------- 初始卡池 ---------------- */
var STARTING_COLLECTION = [1, 2, 7, 5, 11, 10, 4, 24, 39, 31, 19, 15, 23, 37];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG: CONFIG, CARDS: CARDS, CARD_BY_ID: CARD_BY_ID,
    MODIFIERS: MODIFIERS, MOD_BY_ID: MOD_BY_ID, EXCLUSIONS: EXCLUSIONS,
    PROTOTYPES: PROTOTYPES, COMBO_TIERS: COMBO_TIERS,
    STARTING_COLLECTION: STARTING_COLLECTION
  };
}
