import {
  db,
  ref,
  set,
  update,
  get,
  onValue,
  remove,
  ensureFirebaseReady,
} from "./firebase.js";
import { skills, characters, commonSkillIds } from "./data.js";
import { BATTLE_MODULE } from "./battle.js";
import { ONLINE_MODULE } from "./online.js";
import { UI_MODULE } from "./ui.js";
import { getLang, setLang, t, tx, applyLanguage } from "./i18n.js";

void BATTLE_MODULE;
void ONLINE_MODULE;
void UI_MODULE;


let currentMode = null;
let currentRoomCode = null;
let mySide = null;
let partySelection = [];
let selectedSkillLoadouts = {};
let singlePartyState = null;
let latestOnlineBattle = null;
let pendingPartyAction = null;
let partyBusy = false;
const ULTIMATE_READY_GAUGE = 4;
const ULTIMATE_SKILL_ID = "__ultimate__";

const recommendedParties = [
  {
    label: "초보 추천 조합",
    description: "공격/방어/회복/원거리 딜이 모두 있는 안정 조합",
    members: ["검사", "탱커", "성직자", "궁수"],
    loadouts: {
      검사: ["basic", "slash", "guard", "double_slash"],
      탱커: ["basic", "shield_bash", "fortress", "taunt"],
      성직자: ["basic", "priest_heal", "blessing", "barrier"],
      궁수: ["basic", "pierce_arrow", "focus_aim", "ankle_shot"],
    },
  },
  {
    label: "극딜 조합",
    description: "높은 피해로 빠르게 승부를 보는 고위험 조합",
    members: ["광전사", "마법사", "궁수", "도적"],
    loadouts: {
      광전사: ["basic", "berserk_axe", "blood_slash", "battle_cry"],
      마법사: ["basic", "fireball", "ice", "lightning"],
      궁수: ["basic", "pierce_arrow", "rapid_shot", "focus_aim"],
      도적: ["basic", "poison", "weak", "ambush"],
    },
  },
  {
    label: "독살 조합",
    description: "독과 약점 공격, 디버프로 상대를 압박하는 조합",
    members: ["도적", "주술사", "탱커", "성직자"],
    loadouts: {
      도적: ["basic", "poison", "weak", "ambush"],
      주술사: ["basic", "curse", "poison_mist", "dark_orb"],
      탱커: ["basic", "taunt", "fortress", "shield_bash"],
      성직자: ["basic", "priest_heal", "blessing", "barrier"],
    },
  },
  {
    label: "철벽 버티기 조합",
    description: "방어와 회복으로 버티면서 안정적으로 싸우는 조합",
    members: ["탱커", "성직자", "검사", "궁수"],
    loadouts: {
      탱커: ["basic", "fortress", "taunt", "shield_bash"],
      성직자: ["basic", "priest_heal", "blessing", "barrier"],
      검사: ["basic", "guard", "halfmoon", "double_slash"],
      궁수: ["basic", "pierce_arrow", "ankle_shot", "focus_aim"],
    },
  },
  {
    label: "궁극기 러시 조합",
    description: "마력 보조와 안정적인 전열로 궁극기 회전을 노리는 조합",
    members: ["마법사", "검사", "성직자", "주술사"],
    loadouts: {
      마법사: ["basic", "fireball", "ice", "lightning"],
      검사: ["basic", "slash", "halfmoon", "double_slash"],
      성직자: ["basic", "priest_heal", "blessing", "barrier"],
      주술사: ["basic", "curse", "poison_mist", "dark_orb"],
    },
  },
  {
    label: "견제 조합",
    description: "공격 감소와 독, 견제 기술로 상대 화력을 낮추는 조합",
    members: ["궁수", "주술사", "탱커", "마법사"],
    loadouts: {
      궁수: ["basic", "ankle_shot", "pierce_arrow", "focus_aim"],
      주술사: ["basic", "curse", "poison_mist", "dark_orb"],
      탱커: ["basic", "taunt", "shield_bash", "fortress"],
      마법사: ["basic", "ice", "lightning", "fireball"],
    },
  },
  {
    label: "예능 조합",
    description: "몸은 약하지만 상태이상과 폭딜을 노리는 재미용 조합",
    members: ["광전사", "도적", "주술사", "마법사"],
    loadouts: {
      광전사: ["basic", "berserk_axe", "rage", "battle_cry"],
      도적: ["basic", "poison", "smoke", "ambush"],
      주술사: ["basic", "curse", "poison_mist", "dark_orb"],
      마법사: ["basic", "fireball", "lightning", "heal"],
    },
  },
];

const modeSelect = document.getElementById("modeSelect");
      const lobby = document.getElementById("lobby");
      const waiting = document.getElementById("waiting");
      const selectCharacter = document.getElementById("selectCharacter");
      const partyBattle = document.getElementById("partyBattle");

      const onlineModeBtn = document.getElementById("onlineModeBtn");
      const singleModeBtn = document.getElementById("singleModeBtn");
      const createRoomBtn = document.getElementById("createRoomBtn");
      const joinRoomBtn = document.getElementById("joinRoomBtn");
      const roomInput = document.getElementById("roomInput");
      const backToModeBtn = document.getElementById("backToModeBtn");

      const roomCodeView = document.getElementById("roomCodeView");
      const selectTopLabel = document.getElementById("selectTopLabel");
      const selectRoomCodeView = document.getElementById("selectRoomCodeView");
      const selectTitle = document.getElementById("selectTitle");
      const waitingText = document.getElementById("waitingText");
      const copyCodeBtn = document.getElementById("copyCodeBtn");
      const waitingBackBtn = document.getElementById("waitingBackBtn");
      const myRoleText = document.getElementById("myRoleText");
      const characterList = document.getElementById("characterList");
      const recommendButtons = document.getElementById("recommendButtons");
      const selectBackBtn = document.getElementById("selectBackBtn");

      const leftPartyTitle = document.getElementById("leftPartyTitle");
      const rightPartyTitle = document.getElementById("rightPartyTitle");
      const leftMainList = document.getElementById("leftMainList");
      const leftSubList = document.getElementById("leftSubList");
      const rightMainList = document.getElementById("rightMainList");
      const rightSubList = document.getElementById("rightSubList");
      const partyTurnText = document.getElementById("partyTurnText");
      const partyActionButtons = document.getElementById("partyActionButtons");
      const partyLog = document.getElementById("partyLog");
      const partyResetBtn = document.getElementById("partyResetBtn");
      const partyLeaveBtn = document.getElementById("partyLeaveBtn");

      function showScreen(name) {
        modeSelect.classList.add("hidden");
        lobby.classList.add("hidden");
        waiting.classList.add("hidden");
        selectCharacter.classList.add("hidden");
        partyBattle.classList.add("hidden");

        if (name === "mode") modeSelect.classList.remove("hidden");
        if (name === "lobby") lobby.classList.remove("hidden");
        if (name === "waiting") waiting.classList.remove("hidden");
        if (name === "select") selectCharacter.classList.remove("hidden");
        if (name === "partyBattle") partyBattle.classList.remove("hidden");

        refreshLocalizedUI();
      }

      function makeRoomCode() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 4; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
      }

      function getDefaultLoadout(charName) {
        const c = characters[charName];
        return ["basic", ...((c?.skillIds || []).slice(0, 3))];
      }

      function getAvailableSkillsForCharacter(charName) {
        const c = characters[charName];
        return [...new Set(["basic", ...(commonSkillIds || []), ...(c?.skillIds || [])])];
      }

      function sanitizeLoadout(charName, loadout) {
        if (!Array.isArray(loadout) || loadout.length !== 4) return null;
        const available = new Set(getAvailableSkillsForCharacter(charName));
        const unique = new Set(loadout);
        if (unique.size !== 4) return null;
        if (!loadout.every((skillId) => available.has(skillId))) return null;
        return [...loadout];
      }

      function getRecommendedPartyLoadout(preset, charName) {
        const presetLoadout = sanitizeLoadout(charName, preset?.loadouts?.[charName]);
        if (presetLoadout) return presetLoadout;

        const characterRecommended = sanitizeLoadout(
          charName,
          characters[charName]?.recommendedSkillIds,
        );
        if (characterRecommended) return characterRecommended;

        return getDefaultLoadout(charName);
      }

      function makePlayerFromCharacter(charName, loadout = null) {
        const c = characters[charName];

        return {
          selected: true,
          character: c.name,
          hp: c.hp,
          maxHp: c.hp,
          atk: c.atk,
          def: c.def,
          passiveName: c.passiveName,
          passiveDesc: c.passiveDesc,
          skillIds: loadout || getDefaultLoadout(charName),
          turnCount: 0,
          guardRate: 0,
          evasion: false,
          atkBuff: 0,
          atkDebuff: 0,
          poison: 0,
          ultimateGauge: 0,
        };
      }

      function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
      }

      function alive(unit) {
        return unit && unit.hp > 0;
      }

      function getSkillListForPlayer(player) {
        return player.skillIds || ["basic"];
      }
      function getSubSkillForPlayer(player) {
        return characters[player?.character]?.subSkill || null;
      }

      function canUseUltimate(player) {
        return (player?.ultimateGauge || 0) >= ULTIMATE_READY_GAUGE;
      }
      function getUltimateSkill(player) {
        const ultimate = characters[player?.character]?.ultimate;
        return (
          ultimate || {
            name: "한계 돌파",
            desc: "적 메인 1명에게 위력 35 피해",
            type: "attack",
            power: 35,
            target: "enemySingle",
          }
        );
      }

      function clampUltimateGauge(gauge) {
        return Math.min(ULTIMATE_READY_GAUGE, gauge || 0);
      }

      function increaseUltimateGauge(player) {
        player.ultimateGauge = Math.min(
          ULTIMATE_READY_GAUGE,
          (player.ultimateGauge || 0) + 1,
        );
      }

      function isTargetSkill(skill) {
        return [
          "attack",
          "attackBuff",
          "attackDebuff",
          "poisonAttack",
          "weakAttack",
          "lifestealAttack",
          "shieldBreakAttack",
          "executeAttack",
        ].includes(skill.type);
      }

      function getTeam(state, side) {
        return state.teams[side];
      }

      function getEnemySide(state, side) {
        return state.sides.find((s) => s !== side);
      }

      function sideLabel(side) {
        if (side === "player") return t("party.player");
        if (side === "ai") return t("party.ai");
        if (side === "p1") return t("party.p1");
        if (side === "p2") return t("party.p2");
        return side;
      }

      function getStateText(player) {
        const list = [];

        if (player.guardRate > 0) list.push(tx("방어"));
        if (player.evasion) list.push(tx("연막"));
        if (player.atkBuff > 0) list.push(`${tx("공격강화")} +${player.atkBuff}`);
        if (player.atkDebuff > 0) list.push(`${tx("공격감소")} -${player.atkDebuff}`);
        if (player.poison > 0) list.push(`${tx("독")} ${player.poison}`);
        list.push(
          `${tx("궁극기 게이지")} ${clampUltimateGauge(player.ultimateGauge)}/${ULTIMATE_READY_GAUGE}`,
        );

        return list.length ? list.join(" / ") : tx("상태 없음");
      }

      function createBattleState(
        leftSide,
        rightSide,
        leftParty,
        rightParty,
        log,
      ) {
        return {
          sides: [leftSide, rightSide],
          turnIndex: 0,
          round: 1,
          winner: "",
          teams: {
            [leftSide]: leftParty,
            [rightSide]: rightParty,
          },
          log,
        };
      }

      function getTurnInfo(state) {
        const [a, b] = state.sides;

        const order = [
          { side: a, slot: 0 },
          { side: b, slot: 0 },
          { side: a, slot: 1 },
          { side: b, slot: 1 },
        ];

        return order[state.turnIndex];
      }

      function applyDamageCore(
        attacker,
        defender,
        basePower,
        extra = {},
        logs = [],
        attackerLabel = "",
        defenderLabel = "",
      ) {
        if (!alive(defender)) {
          return { hit: false, damage: 0 };
        }

        if (defender.evasion) {
          defender.evasion = false;

          if (Math.random() < 0.4) {
            logs.push(
              `${defenderLabel} ${tx(defender.character)}이 연막으로 공격을 회피했다!`,
            );
            return { hit: false, damage: 0 };
          }
        }

        if (defender.character === "도적" && Math.random() < 0.15) {
          logs.push(
            `${defenderLabel} ${tx(defender.character)}의 패시브 [그림자 걸음] 발동!`,
          );
          logs.push("공격을 회피했다!");
          return { hit: false, damage: 0 };
        }

        let damage =
          basePower +
          attacker.atk -
          defender.def +
          Math.floor(Math.random() * 5);

        if (extra.bonusIfPoison && defender.poison > 0) {
          damage += extra.bonusIfPoison;
          logs.push("독 상태의 약점을 찔렀다!");
        }

        if (attacker.atkBuff > 0) {
          damage += attacker.atkBuff;
          logs.push(`${attackerLabel} ${attacker.character}의 공격 강화 효과!`);
          attacker.atkBuff = 0;
        }

        if (attacker.atkDebuff > 0) {
          damage -= attacker.atkDebuff;
          logs.push(
            `${attackerLabel} ${attacker.character}은 공격 감소 상태다!`,
          );
          attacker.atkDebuff = 0;
        }

        if (attacker.character === "검사" && Math.random() < 0.2) {
          damage += 8;
          logs.push(`${attacker.character}의 패시브 [검의 호흡] 발동!`);
        }

        if (attacker.character === "마법사" && attacker.turnCount % 3 === 0) {
          damage += 10;
          logs.push(`${attacker.character}의 패시브 [마력 순환] 발동!`);
        }

        if (
          attacker.character === "광전사" &&
          attacker.hp <= attacker.maxHp * 0.5
        ) {
          damage += 10;
          logs.push(`${attacker.character}의 패시브 [피의 갈망] 발동!`);
        }

        if (attacker.character === "궁수" && Math.random() < 0.15) {
          damage += 10;
          logs.push(`${attacker.character}의 패시브 [매의 눈] 발동!`);
        }

        if (
          attacker.character === "주술사" &&
          (defender.poison > 0 || defender.atkDebuff > 0)
        ) {
          damage += 8;
          logs.push(`${attacker.character}의 패시브 [저주의 낙인] 발동!`);
        }

        if (
          defender.character === "탱커" &&
          defender.hp <= defender.maxHp * 0.4
        ) {
          damage = Math.floor(damage * 0.8);
          logs.push(`${tx(defender.character)}의 패시브 [불굴의 육체] 발동!`);
        }

        if (defender.guardRate > 0) {
          damage = Math.floor(damage * (1 - defender.guardRate));
          defender.guardRate = 0;
          logs.push(
            `${defenderLabel} ${tx(defender.character)}이 방어로 피해를 줄였다!`,
          );
        }

        damage = Math.max(1, damage);
        defender.hp = Math.max(0, defender.hp - damage);
        increaseUltimateGauge(defender);

        return { hit: true, damage };
      }

      function applyPoisonStart(state, side, slot) {
        const actor = getTeam(state, side)[slot];
        let log = "";

        if (actor && actor.poison > 0) {
          actor.poison -= 1;
          actor.hp = Math.max(0, actor.hp - 5);
          log += `${sideLabel(side)} ${tx(actor.character)}은 독으로 5 피해를 받았다!\n`;
        }

        return log;
      }

      function autoPromote(team, logs = []) {
        for (let slot = 0; slot < 2; slot++) {
          if (!alive(team[slot])) {
            const subIndex = [2, 3].find((i) => alive(team[i]));

            if (subIndex !== undefined) {
              const fallen = team[slot]?.character || tx("빈 자리");
              const incoming = team[subIndex].character;

              [team[slot], team[subIndex]] = [team[subIndex], team[slot]];
              logs.push(`${tx(fallen)} 대신 ${tx(incoming)}이 메인으로 출전!`);
            }
          }
        }
      }

      function autoPromoteAll(state, logs = []) {
        state.sides.forEach((side) => autoPromote(state.teams[side], logs));
      }

      function checkWinner(state) {
        const aliveSides = state.sides.filter((side) =>
          state.teams[side].some(alive),
        );

        if (aliveSides.length === 1) {
          state.winner = aliveSides[0];
        }

        return state.winner;
      }

      function advanceTurn(state) {
        const logs = [];
        autoPromoteAll(state, logs);

        if (checkWinner(state)) {
          if (logs.length) {
            state.log += "\n" + logs.join("\n");
          }
          return;
        }

        let attempts = 0;

        do {
          state.turnIndex = (state.turnIndex + 1) % 4;

          if (state.turnIndex === 0) {
            state.round += 1;
          }

          attempts += 1;

          const info = getTurnInfo(state);
          const actor = getTeam(state, info.side)[info.slot];

          if (alive(actor)) {
            break;
          }
        } while (attempts < 8);

        if (logs.length) {
          state.log += "\n" + logs.join("\n");
        }
      }

      function processPartySkill(
        oldState,
        skillId,
        targetSide = null,
        targetSlot = null,
      ) {
        const state = clone(oldState);
        const info = getTurnInfo(state);
        const actor = getTeam(state, info.side)[info.slot];
        const usingUltimate = skillId === ULTIMATE_SKILL_ID;
        const skill = usingUltimate
          ? { id: ULTIMATE_SKILL_ID, ...getUltimateSkill(actor) }
          : skills[skillId] || skills.basic;
        let log = applyPoisonStart(state, info.side, info.slot);

        if (!alive(actor)) {
          log += `${sideLabel(info.side)} ${actor?.character || tx("빈 자리")}이 쓰러져 행동할 수 없습니다.`;
          state.log = log;
          advanceTurn(state);
          return state;
        }

        if (usingUltimate && !canUseUltimate(actor)) {
          state.log = `${sideLabel(info.side)} ${tx(actor.character)}의 궁극기 게이지가 부족합니다.`;
          return state;
        }

        actor.turnCount = (actor.turnCount || 0) + 1;
        increaseUltimateGauge(actor);
        log += `${sideLabel(info.side)} 메인${info.slot + 1} ${tx(actor.character)}의 [${tx(skill.name)}]!\n`;

        if (skill.type === "guard") {
          actor.guardRate = skill.guardRate;
          log += `다음 피해 ${Math.round((skill.guardRate || 0) * 100)}% 감소`;
        } else if (skill.type === "heal") {
          let healAmount = skill.heal;

          if (actor.character === "성직자") {
            healAmount = Math.floor(healAmount * 1.2);
            log += `${tx(actor.character)}의 패시브 [성스러운 가호] 발동!\n`;
          }

          const before = actor.hp;
          actor.hp = Math.min(actor.maxHp, actor.hp + healAmount);
          log += `${tx(actor.character)} HP ${actor.hp - before} 회복`;
        } else if (skill.type === "evasion") {
          actor.evasion = true;
          log += "다음 공격을 회피할 준비를 했다!";
        } else if (skill.type === "teamGuard") {
          [0, 1].forEach((slot) => {
            const ally = getTeam(state, info.side)[slot];
            if (alive(ally)) ally.guardRate = Math.max(ally.guardRate || 0, skill.guardRate || 0);
          });
          log += "아군 메인 전원이 피해 감소 효과를 얻었다!";
        } else if (skill.type === "teamHeal") {
          let totalHeal = 0;
          [0, 1].forEach((slot) => {
            const ally = getTeam(state, info.side)[slot];
            if (!alive(ally)) return;
            const before = ally.hp;
            ally.hp = Math.min(ally.maxHp, ally.hp + (skill.heal || 0));
            totalHeal += ally.hp - before;
          });
          log += `아군 메인 전원의 HP를 총 ${totalHeal} 회복했다!`;
        } else if (skill.type === "cleanse") {
          actor.poison = 0;
          actor.atkDebuff = 0;
          log += "나쁜 상태를 정화했다!";
        } else if (skill.target === "enemyAllMain") {
          const enemySide = getEnemySide(state, info.side);
          const hitLogs = [];
          [0, 1].forEach((slot) => {
            const defender = getTeam(state, enemySide)[slot];
            const result = applyDamageCore(
              actor, defender, skill.power, { bonusIfPoison: skill.bonusIfPoison }, hitLogs, sideLabel(info.side), sideLabel(enemySide),
            );
            if (result.hit) {
              log += `${sideLabel(enemySide)} 메인${slot + 1} ${tx(defender.character)}에게 ${result.damage} 데미지!\n`;
            }
          });
          if (hitLogs.length) log += hitLogs.join("\n");
        } else {
          const defender = getTeam(state, targetSide)[targetSlot];
          const logs = [];
          const executeThreshold = Math.floor((defender.maxHp || 0) * 0.35);
          const executeTriggered = skill.type === "executeAttack" && defender.hp <= executeThreshold;
          const basePower = (skill.power || 0) + (executeTriggered ? (skill.executeBonus || 0) : 0);
          const result = applyDamageCore(
            actor,
            defender,
            basePower,
            { bonusIfPoison: skill.bonusIfPoison },
            logs,
            sideLabel(info.side),
            sideLabel(targetSide),
          );

          if (logs.length) {
            log += logs.join("\n") + "\n";
          }

          if (result.hit) {
            log += `${sideLabel(targetSide)} 메인${targetSlot + 1} ${tx(defender.character)}에게 ${result.damage} 데미지!`;

            if (skill.type === "attackBuff") {
              actor.atkBuff += skill.buff;
              log += `\n${tx(actor.character)}의 다음 공격 피해 +${skill.buff || 0}`;
            }

            if (skill.type === "attackDebuff") {
              defender.atkDebuff += skill.debuff;
              log += `\n${sideLabel(targetSide)} ${tx(defender.character)}의 다음 공격 피해 -${skill.debuff || 0}`;
            }

            if (skill.type === "poisonAttack") {
              defender.poison = 3;
              log += `\n${sideLabel(targetSide)} ${tx(defender.character)}이 독 상태가 되었다! (${defender.poison}턴)`;
            }
            if (skill.type === "poisonDebuffAttack") {
              defender.atkDebuff += skill.debuff || 0;
              defender.poison = skill.poison || 0;
              log += `\n${sideLabel(targetSide)} ${tx(defender.character)}의 다음 공격 피해 -${skill.debuff || 0}`;
              log += `\n${sideLabel(targetSide)} ${tx(defender.character)}이 독 상태가 되었다! (${defender.poison}턴)`;
            }
            if (skill.type === "selfHarmAttack") {
              actor.hp = Math.max(0, actor.hp - (skill.selfDamage || 0));
              log += `\n${tx(actor.character)}도 ${skill.selfDamage || 0}의 반동 피해를 받았다!`;
            }
            if (skill.type === "lifestealAttack") {
              const beforeHp = actor.hp;
              actor.hp = Math.min(actor.maxHp, actor.hp + (skill.heal || 0));
              log += `\nHP를 ${actor.hp - beforeHp} 회복했다!`;
            }
            if (skill.type === "shieldBreakAttack") {
              defender.guardRate = 0;
              log += "\n방어 태세를 무너뜨렸다!";
            }
            if (executeTriggered) {
              log += "\n약해진 대상을 처형했다!";
            }
          }
        }

        if (usingUltimate) {
          actor.ultimateGauge = 0;
          log += "\n궁극기 게이지가 0으로 초기화되었다!";
        }

        state.log = log;
        autoPromoteAll(state);

        if (checkWinner(state)) {
          state.log += `\n${sideLabel(state.winner)} ${tx("승리")}!`;
        } else {
          advanceTurn(state);
        }

        return state;
      }

      function processPartyRotate(oldState, subIndex) {
        const state = clone(oldState);
        const info = getTurnInfo(state);
        const team = getTeam(state, info.side);
        const actor = team[info.slot];
        const sub = team[subIndex];
        let log = applyPoisonStart(state, info.side, info.slot);

        if (!alive(actor)) {
          log += `${actor?.character || tx("빈 자리")}이 쓰러져 로테이션할 수 없습니다.`;
        } else if (!alive(sub)) {
          log += `${sub?.character || tx("빈 자리")}은 쓰러져 로테이션할 수 없습니다.`;
        } else {
          [team[info.slot], team[subIndex]] = [team[subIndex], team[info.slot]];
          increaseUltimateGauge(team[subIndex]);
          log += `로테이션! ${sideLabel(info.side)} 메인${info.slot + 1} ${tx(actor.character)} ↔ 서브${subIndex - 1} ${tx(sub.character)}`;
        }

        state.log = log;
        advanceTurn(state);

        return state;
      }

      function processPartySubSkill(oldState, subIndex, targetSide, targetSlot) {
        const state = clone(oldState);
        const info = getTurnInfo(state);
        const team = getTeam(state, info.side);
        const actor = team[info.slot];
        const sub = team[subIndex];
        const subSkill = getSubSkillForPlayer(sub);
        let log = applyPoisonStart(state, info.side, info.slot);

        if (!alive(actor)) {
          log += `${actor?.character || tx("빈 자리")}이 쓰러져 행동할 수 없습니다.`;
        } else if (!alive(sub)) {
          log += `${sub?.character || tx("빈 자리")}은 쓰러져 서브스킬을 사용할 수 없습니다.`;
        } else if (!subSkill) {
          log += `${sub?.character || tx("빈 자리")}의 서브스킬이 없습니다.`;
        } else {
          const target = state.teams[targetSide]?.[targetSlot];
          if (!alive(target)) {
            log += `대상이 전투불능이라 서브스킬을 사용할 수 없습니다.`;
          } else {
            log += `[서브스킬] 서브${subIndex - 1} ${tx(sub.character)}의 ${subSkill.name} 발동!`;
            if (subSkill.type === "allyAtkBuff") {
              target.atkBuff += subSkill.buff || 0;
              log += `\n${sideLabel(targetSide)} 메인${targetSlot + 1} ${tx(target.character)}의 다음 공격 피해가 ${subSkill.buff || 0} 증가했다!`;
            } else if (subSkill.type === "allyUltimateGauge") {
              increaseUltimateGauge(target);
              log += `\n${sideLabel(targetSide)} 메인${targetSlot + 1} ${tx(target.character)}의 궁극기 게이지가 1 증가했다!`;
            } else if (subSkill.type === "enemyDamage") {
              target.hp = Math.max(0, target.hp - (subSkill.damage || 0));
              log += `\n${sideLabel(targetSide)} 메인${targetSlot + 1} ${tx(target.character)}에게 ${subSkill.damage || 0} 피해를 주었다!`;
            } else if (subSkill.type === "allyGuard") {
              target.guardRate = Math.max(target.guardRate || 0, subSkill.guardRate || 0);
              log += `\n${sideLabel(targetSide)} 메인${targetSlot + 1} ${tx(target.character)} 다음 피해 ${Math.round((subSkill.guardRate || 0) * 100)}% 감소`;
            } else if (subSkill.type === "allyAtkBuffSelfHarm") {
              target.atkBuff += subSkill.buff || 0;
              sub.hp = Math.max(0, sub.hp - (subSkill.selfDamage || 0));
              log += `\n${sideLabel(targetSide)} 메인${targetSlot + 1} ${tx(target.character)}의 다음 공격 피해가 ${subSkill.buff || 0} 증가했다!`;
              log += `\n서브${subIndex - 1} ${tx(sub.character)}는 HP ${subSkill.selfDamage || 0} 감소했다!`;
            } else if (subSkill.type === "allyHeal") {
              const healAmount = subSkill.heal || 0;
              const beforeHp = target.hp;
              target.hp = Math.min(target.maxHp, target.hp + healAmount);
              log += `\n${tx(target.character)} HP ${target.hp - beforeHp} 회복`;
            } else if (subSkill.type === "enemyAtkDebuff") {
              target.atkDebuff += subSkill.debuff || 0;
              log += `\n${sideLabel(targetSide)} 메인${targetSlot + 1} ${tx(target.character)}의 다음 공격 피해 -${subSkill.debuff || 0}`;
            }
          }
        }

        state.log = log;
        autoPromoteAll(state);
        if (checkWinner(state)) {
          state.log += `\n${sideLabel(state.winner)} ${tx("승리")}!`;
        } else {
          advanceTurn(state);
        }
        return state;
      }

      function renderCharacterList() {
        characterList.innerHTML = "";

        Object.values(characters).forEach((c) => {
          const div = document.createElement("div");
          div.className = "character-card";

          const skillNames = c.skillIds
            .map((id) => `${tx(skills[id].name)} - ${tx(skills[id].powerText)}`)
            .join("<br>");
          const recommendedSkillText = (c.recommendedSkillIds || [])
            .map((id) => tx(skills[id]?.name || id))
            .join(" / ");
          const ultimateText = c.ultimate
            ? `${tx(c.ultimate.name)} - ${tx(c.ultimate.desc)}`
            : "한계 돌파 - 적 메인 1명에게 위력 35 피해";

          const selected = partySelection.includes(c.name);
          const buttonText = selected
            ? tx("선택됨")
            : `파티에 추가 (${partySelection.length}/4)`;

          div.innerHTML = `
          <div class="character-name">${tx(c.name)}</div>
          <div class="character-info">
            HP ${c.hp} / 공격 ${c.atk} / 방어 ${c.def}<br>
            <span class="passive">${t("ui.passive")}: ${tx(c.passiveName)}</span><br>
            ${tx(c.passiveDesc)}<br>
            역할: ${tx(c.roleText || "역할 미정")}<br>
            추천 세팅:<br>${recommendedSkillText || "추천 세팅 없음"}<br>
            ${t("ui.skill")}:<br>${skillNames}
            <br>${t("ui.ultimate")}:<br>${ultimateText}
          </div>
          <button class="green" ${selected ? "disabled" : ""}>${buttonText}</button>
        `;

          div
            .querySelector("button")
            .addEventListener("click", () => selectPartyCharacter(c.name));
          characterList.appendChild(div);
        });

        renderSelectedPartyPreview();
      }


      function updatePartySelectionStatus() {
        if (currentMode === "single") {
          selectRoomCodeView.textContent = `${partySelection.length}/4`;
        }

        myRoleText.textContent = partySelection.length
          ? `선택됨: ${partySelection.map(tx).join(" / ")}`
          : currentMode === "single"
            ? t("select.orderGuideSingle")
            : t("select.orderGuide");
      }

      function removeSelectedPartyMember(charName) {
        if (!charName || !partySelection.includes(charName)) return;

        partySelection = partySelection.filter((name) => name !== charName);
        delete selectedSkillLoadouts[charName];

        updatePartySelectionStatus();
        renderCharacterList();
        renderSingleStartButton();
        renderOnlineSubmitButton();
      }

      function resetPartySelection() {
        partySelection = [];
        selectedSkillLoadouts = {};

        updatePartySelectionStatus();

        renderCharacterList();
        renderSingleStartButton();
        renderOnlineSubmitButton();
      }

      function applyRecommendedSkillSet(charName) {
        const recommended = characters[charName]?.recommendedSkillIds || [];
        if (recommended.length !== 4) {
          alert("추천 세팅은 스킬 4개여야 합니다.");
          return;
        }
        selectedSkillLoadouts[charName] = [...recommended];
        renderCharacterList();
        renderSingleStartButton();
        renderOnlineSubmitButton();
      }

      function renderSelectedPartyPreview() {
        const existing = document.getElementById("selectedPartyPreview");
        if (existing) existing.remove();

        if (!selectCharacter || selectCharacter.classList.contains("hidden")) return;

        const roles = ["메인1", "메인2", "서브1", "서브2"];
        const preview = document.createElement("div");
        preview.id = "selectedPartyPreview";
        preview.className = "selected-party-preview";

        const lines = roles.map((role, index) => {
          const selectedName = partySelection[index];
          if (!selectedName) return `<div>${role}: 미선택</div>`;
          const loadout =
            selectedSkillLoadouts[selectedName] || getDefaultLoadout(selectedName);
          const skillListItems = loadout
            .map((skillId) => `<li>${tx(skills[skillId]?.name || skillId)}</li>` )
            .join("");
          const recommended = characters[selectedName]?.recommendedSkillIds || [];
          const canApplyRecommended = recommended.length === 4;
          const recommendedButtonHtml = canApplyRecommended
            ? `<button type="button" class="secondary apply-recommended-skills-btn" data-char="${selectedName}">
              추천 세팅 적용
            </button>`
            : "";
          return `<div class="selected-member-preview" data-char="${selectedName}">
            <div>${role}: ${tx(selectedName)}</div>
            <div class="equipped-skills"><div>${t("ui.equipped")}:</div><ul>${skillListItems}</ul></div>
            <div class="selected-member-actions">
              <button type="button" class="green skill-edit-btn" data-char="${selectedName}">${t("ui.changeSkill")}</button>
              ${recommendedButtonHtml}
              <button type="button" class="danger remove-party-member-btn" data-char="${selectedName}">취소</button>
            </div>
            <div class="skill-editor" data-char="${selectedName}"></div>
          </div>`;
        });

        const resetButtonHtml =
          partySelection.length > 0
            ? `<button type="button" class="secondary" id="partySelectionResetBtn">파티 초기화</button>`
            : "";

        preview.innerHTML = `
          <div><strong>선택 파티</strong></div>
          ${resetButtonHtml}
          ${lines.join("")}
        `;

        characterList.insertAdjacentElement("beforebegin", preview);

        const resetButton = preview.querySelector("#partySelectionResetBtn");
        if (resetButton) {
          resetButton.addEventListener("click", () => {
            resetPartySelection();
          });
        }

        preview.querySelectorAll(".skill-edit-btn").forEach((button) => {
          button.addEventListener("click", () => {
            const charName = button.dataset.char;
            if (!charName) return;
            renderSkillEditor(charName);
          });
        });

        preview.querySelectorAll(".apply-recommended-skills-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            applyRecommendedSkillSet(btn.dataset.char);
          });
        });

        preview.querySelectorAll(".remove-party-member-btn").forEach((button) => {
          button.addEventListener("click", () => {
            removeSelectedPartyMember(button.dataset.char);
          });
        });
      }

      function renderSkillEditor(charName) {
        const preview = document.getElementById("selectedPartyPreview");
        if (!preview) return;
        preview.querySelectorAll(".skill-editor").forEach((node) => {
          if (node.dataset.char !== charName) node.innerHTML = "";
        });
        const editor = preview.querySelector(`.skill-editor[data-char="${charName}"]`);
        if (!editor) return;

        const available = getAvailableSkillsForCharacter(charName);
        const current =
          selectedSkillLoadouts[charName] || getDefaultLoadout(charName);
        const selectedSet = new Set(current);
        const commonIdsSet = new Set(commonSkillIds || []);
        const characterSkillIds = characters[charName]?.skillIds || [];
        const characterSkillIdSet = new Set(characterSkillIds);
        const commonSkills = available.filter(
          (skillId) => skillId === "basic" || commonIdsSet.has(skillId),
        );
        const exclusiveSkills = available.filter(
          (skillId) => characterSkillIdSet.has(skillId) && !commonIdsSet.has(skillId),
        );

        const makeSkillOptionCard = (skillId) => {
          const skill = skills[skillId];
          const checked = selectedSet.has(skillId) ? "checked" : "";
          return `<label class="skill-option-card ${checked ? "selected-skill-option" : ""}">
            <input type="checkbox" value="${skillId}" ${checked}>
            <div class="skill-option-meta">
              <div class="skill-option-name">${tx(skill?.name || skillId)}</div>
              <div class="skill-option-power">${tx(skill?.powerText || "")}</div>
              <div class="skill-option-desc">${tx(skill?.desc || "")}</div>
            </div>
          </label>`;
        };

        editor.innerHTML = `
          <div class="skill-editor-panel">
            <div>${t("ui.changeSkill")} - ${tx(charName)}</div>
            <div class="equipped-skills">
              <div>장착 중:</div>
              <div>${current.map((skillId) => tx(skills[skillId]?.name || skillId)).join(" / ")}</div>
            </div>
            <div class="skill-select-count"></div>
            <div class="skill-section">
              <div class="skill-section-title">공용 스킬</div>
              <div class="skill-options">${commonSkills.map(makeSkillOptionCard).join("")}</div>
            </div>
            <div class="skill-section">
              <div class="skill-section-title">캐릭터 전용 스킬</div>
              <div class="skill-options">${exclusiveSkills.map(makeSkillOptionCard).join("")}</div>
            </div>
            <div class="skill-select-error" style="color:#ff6b6b;margin-top:6px;"></div>
            <button type="button" class="green apply-skill-btn">${t("common.apply")}</button>
            <button type="button" class="gray cancel-skill-btn">${t("common.cancel")}</button>
          </div>
        `;

        const errorNode = editor.querySelector(".skill-select-error");
        const countNode = editor.querySelector(".skill-select-count");
        const applyButton = editor.querySelector(".apply-skill-btn");
        const checkboxes = Array.from(editor.querySelectorAll('input[type="checkbox"]'));
        const updateSelectionState = () => {
          const selectedCount = checkboxes.filter((cb) => cb.checked).length;
          countNode.textContent = `선택됨 ${selectedCount}/4`;
          errorNode.textContent = selectedCount === 4 ? "" : t("ui.needFourSkills");
          if (applyButton) applyButton.disabled = selectedCount !== 4;
          checkboxes.forEach((cb) => {
            cb.closest(".skill-option-card")?.classList.toggle("selected-skill-option", cb.checked);
          });
          return selectedCount;
        };
        updateSelectionState();
        checkboxes.forEach((cb) => cb.addEventListener("change", updateSelectionState));

        applyButton?.addEventListener("click", () => {
          const selected = checkboxes
            .filter((cb) => cb.checked)
            .map((cb) => cb.value);
          if (selected.length !== 4) {
            errorNode.textContent = t("ui.needFourSkills");
            return;
          }
          selectedSkillLoadouts[charName] = selected;
          renderCharacterList();
          renderSingleStartButton();
          renderOnlineSubmitButton();
        });
        editor.querySelector(".cancel-skill-btn")?.addEventListener("click", () => {
          editor.innerHTML = "";
        });
      }

      function renderSingleStartButton() {
        const existing = document.getElementById("singleStartBattleBtn");
        if (existing) existing.remove();

        if (currentMode !== "single") return;
        if (partySelection.length !== 4) return;

        const btn = document.createElement("button");
        btn.id = "singleStartBattleBtn";
        btn.className = "green";
        btn.type = "button";
        btn.textContent = t("ui.startBattle");
        btn.addEventListener("click", () => {
          startSinglePartyBattle(partySelection);
        });

        characterList.insertAdjacentElement("beforebegin", btn);
      }

      function renderOnlineSubmitButton() {
        const existing = document.getElementById("onlineSubmitPartyBtn");
        if (existing) existing.remove();

        if (currentMode !== "online") return;
        if (partySelection.length !== 4) return;
        if (!currentRoomCode || !mySide) return;

        const btn = document.createElement("button");
        btn.id = "onlineSubmitPartyBtn";
        btn.className = "green";
        btn.type = "button";
        btn.textContent = t("ui.confirmParty");
        btn.addEventListener("click", () => {
          submitOnlinePartySelection();
        });

        characterList.insertAdjacentElement("beforebegin", btn);
      }

      async function submitOnlinePartySelection() {
        if (currentMode !== "online") return;
        if (partySelection.length !== 4) return;
        if (!currentRoomCode || !mySide) return;

        const party = partySelection.map((charName) =>
          makePlayerFromCharacter(
            charName,
            selectedSkillLoadouts[charName] || getDefaultLoadout(charName),
          ),
        );
        const updates = {};

        updates[`state/${mySide}Party`] = party;
        updates["state/log"] = `${sideLabel(mySide)} 파티 선택 완료!`;
        updates["updatedAt"] = Date.now();

        await update(ref(db, "rooms/" + currentRoomCode), updates);

        roomCodeView.textContent = currentRoomCode;
        waitingText.textContent = t("waiting.opponentSelecting");
        showScreen("waiting");
      }


      function renderRecommendedButtons() {
        recommendButtons.innerHTML = "";

        recommendedParties.forEach((preset) => {
          const button = document.createElement("button");
          button.className = "recommend-btn";
          button.type = "button";
          const membersText = preset.members.map(tx).join(" / ");
          button.innerHTML = `<strong>${tx(preset.label)}</strong><br>${tx(preset.description)}<br>${membersText}`;
          button.addEventListener("click", () => {
            applyRecommendedParty(preset);
          });
          recommendButtons.appendChild(button);
        });
      }

      async function applyRecommendedParty(preset) {
        if (!preset || !Array.isArray(preset.members)) return;
        const members = preset.members;
        partySelection = [...members];
        selectedSkillLoadouts = {};
        members.forEach((charName) => {
          selectedSkillLoadouts[charName] = getRecommendedPartyLoadout(preset, charName);
        });

        updatePartySelectionStatus();
        renderCharacterList();
        renderSingleStartButton();
        renderOnlineSubmitButton();
      }

      async function ensureOnlineAvailable() {
        await ensureFirebaseReady();

        if (!db || !ref || !get || !set || !update || !onValue || !remove) {
          alert("온라인 모드를 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
          return false;
        }

        return true;
      }

      async function openOnlineMode() {
        if (!(await ensureOnlineAvailable())) return;

        currentMode = "online";
        currentRoomCode = null;
        mySide = null;
        partySelection = [];
        selectedSkillLoadouts = {};
        latestOnlineBattle = null;
        roomInput.value = "";
        showScreen("lobby");
      }

      function openSingleMode() {
        currentMode = "single";
        currentRoomCode = null;
        mySide = "player";
        partySelection = [];
        selectedSkillLoadouts = {};
        singlePartyState = null;
        pendingPartyAction = null;
        partyBusy = false;

        selectTopLabel.textContent = t("select.party");
        selectRoomCodeView.textContent = "0/4";
        selectTitle.textContent = t("select.party4");
        myRoleText.textContent =
          t("select.orderGuideSingle");

        renderCharacterList();
        renderSingleStartButton();
        showScreen("select");
      }

      function initialOnlineRoomState() {
        return {
          players: {
            p1: true,
            p2: false,
          },
          state: {
            started: false,
            p1Party: [],
            p2Party: [],
            battle: null,
            log: "방이 생성되었습니다.\n1P는 파티 4명을 선택하세요.",
          },
          updatedAt: Date.now(),
        };
      }

      async function createRoom() {
        if (!(await ensureOnlineAvailable())) return;

        currentMode = "online";

        let code = makeRoomCode();
        let roomRef = ref(db, "rooms/" + code);
        let snapshot = await get(roomRef);

        while (snapshot.exists()) {
          code = makeRoomCode();
          roomRef = ref(db, "rooms/" + code);
          snapshot = await get(roomRef);
        }

        await set(roomRef, initialOnlineRoomState());

        currentRoomCode = code;
        mySide = "p1";
        partySelection = [];
        selectedSkillLoadouts = {};

        roomCodeView.textContent = code;
        selectTopLabel.textContent = t("lobby.code");
        selectRoomCodeView.textContent = code;
        selectTitle.textContent = t("select.p1Party4");
        myRoleText.textContent =
          t("select.orderGuide");

        renderCharacterList();
        renderSingleStartButton();
        showScreen("select");
        listenRoom(code);
      }

      async function joinRoom() {
        const code = roomInput.value.trim().toUpperCase();

        if (code.toLowerCase() === "jpn") {
          setLang("ja");
          refreshLocalizedUI();
          alert(t("lang.switchedJa"));
          roomInput.value = "";
          return;
        }

        if (code.toLowerCase() === "kor") {
          setLang("ko");
          refreshLocalizedUI();
          alert(t("lang.switchedKo"));
          roomInput.value = "";
          return;
        }

        if (code.length !== 4) {
          alert(t("roomCodeLengthError"));
          return;
        }

        if (!(await ensureOnlineAvailable())) return;

        currentMode = "online";

        const roomRef = ref(db, "rooms/" + code);
        const snapshot = await get(roomRef);

        if (!snapshot.exists()) {
          alert("존재하지 않는 방입니다.");
          return;
        }

        const room = snapshot.val();

        if (room.players && room.players.p2) {
          alert("이미 가득 찬 방입니다.");
          return;
        }

        await update(roomRef, {
          "players/p2": true,
          "state/p2Party": [],
          "state/started": false,
          "state/battle": null,
          "state/log": "2P가 참가했습니다.\n각자 파티 4명을 선택하세요.",
          updatedAt: Date.now(),
        });

        currentRoomCode = code;
        mySide = "p2";
        partySelection = [];
        selectedSkillLoadouts = {};

        selectTopLabel.textContent = t("lobby.code");
        selectRoomCodeView.textContent = code;
        selectTitle.textContent = t("select.p2Party4");
        myRoleText.textContent =
          t("select.orderGuide");

        renderCharacterList();
        renderSingleStartButton();
        showScreen("select");
        listenRoom(code);
      }

      async function selectPartyCharacter(charName) {
        if (partySelection.includes(charName)) return;
        if (partySelection.length >= 4) return;

        partySelection.push(charName);
        selectedSkillLoadouts[charName] =
          selectedSkillLoadouts[charName] || getDefaultLoadout(charName);

        updatePartySelectionStatus();
        renderCharacterList();
        renderSingleStartButton();
        renderOnlineSubmitButton();
      }

      function pickRandomParty() {
        const names = Object.keys(characters);
        const copy = [...names];
        const result = [];

        while (result.length < 4 && copy.length) {
          const i = Math.floor(Math.random() * copy.length);
          result.push(copy.splice(i, 1)[0]);
        }

        return result;
      }

      function startSinglePartyBattle(playerNames) {
        const aiNames = pickRandomParty();

        singlePartyState = createBattleState(
          "player",
          "ai",
          playerNames.map((name) =>
            makePlayerFromCharacter(
              name,
              selectedSkillLoadouts[name] || getDefaultLoadout(name),
            ),
          ),
          aiNames.map((name) => makePlayerFromCharacter(name, getDefaultLoadout(name))),
          `싱글 4인 파티 배틀 시작!\n플레이어: ${playerNames.join(" / ")}\nAI: ${aiNames.join(" / ")}\n1라운드 시작!`,
        );

        pendingPartyAction = null;
        partyBusy = false;

        renderPartyBattle();
        triggerAiIfNeeded();
      }

      function listenRoom(code) {
        const roomRef = ref(db, "rooms/" + code);

        onValue(roomRef, async (snapshot) => {
          if (currentMode !== "online") return;

          if (!snapshot.exists()) {
            alert("방이 삭제되었습니다.");
            location.reload();
            return;
          }

          const room = snapshot.val();
          const startedNow = await tryStartOnlineBattle(room);

          if (startedNow) {
            return;
          }

          renderOnlineRoom(room);
        });
      }

      async function tryStartOnlineBattle(room) {
        if (!currentRoomCode || mySide !== "p1") return false;

        const state = room.state;

        if (!state || state.started) return false;

        if (
          (state.p1Party || []).length === 4 &&
          (state.p2Party || []).length === 4
        ) {
          const battleLog = [
            "온라인 4인 파티 배틀 시작!",
            "1P와 2P의 전투가 시작되었습니다.",
            "1라운드 - 1P 메인1부터 행동합니다.",
          ].join(String.fromCharCode(10));

          const battle = createBattleState(
            "p1",
            "p2",
            state.p1Party,
            state.p2Party,
            battleLog,
          );

          await update(ref(db, "rooms/" + currentRoomCode), {
            "state/started": true,
            "state/battle": battle,
            "state/log": "전투 시작!",
            updatedAt: Date.now(),
          });

          return true;
        }

        return false;
      }

      function renderOnlineRoom(room) {
        const state = room.state;

        if (!state) return;

        if (!state[`${mySide}Party`] || state[`${mySide}Party`].length < 4) {
          return;
        }

        if (!state.started || !state.battle) {
          roomCodeView.textContent = currentRoomCode;
          waitingText.textContent = t("waiting.opponentSelecting");
          showScreen("waiting");
          return;
        }

        latestOnlineBattle = state.battle;
        renderPartyBattle();
      }

      function getCurrentBattleState() {
        return currentMode === "single" ? singlePartyState : latestOnlineBattle;
      }

      function renderUnit(unit, active = false) {
        if (!unit) {
          return `<div class="unit-row dead"><div class="unit-name">빈 자리</div></div>`;
        }

        const isDead = !alive(unit);
        const hpPercent =
          unit.maxHp > 0 ? Math.max(0, (unit.hp / unit.maxHp) * 100) : 0;
        const classes = ["unit-row"];

        if (active && !isDead) classes.push("active");
        if (isDead) classes.push("dead");

        const deadLabel = isDead ? ` [${t("state.dead")}]` : "";
        const stateText = isDead
          ? "행동 불가 / 로테이션 불가"
          : getStateText(unit);

        return `
        <div class="${classes.join(" ")}">
          <div class="unit-name">${tx(unit.character || tx("빈 자리"))}${deadLabel}</div>
          <div class="unit-detail">
            HP ${unit.hp} / ${unit.maxHp}<br>
            공격 ${unit.atk} / 방어 ${unit.def}<br>
            ${stateText}
          </div>
          <div class="hpbar"><div class="hpfill" style="width:${hpPercent}%"></div></div>
        </div>
      `;
      }

      function renderPartyBattle() {
        showScreen("partyBattle");

        const state = getCurrentBattleState();

        if (!state) return;

        const [leftSide, rightSide] = state.sides;
        const info = getTurnInfo(state);

        leftPartyTitle.textContent = sideLabel(leftSide);
        rightPartyTitle.textContent = sideLabel(rightSide);

        leftMainList.innerHTML = [0, 1]
          .map((i) =>
            renderUnit(
              state.teams[leftSide][i],
              info.side === leftSide && info.slot === i,
            ),
          )
          .join("");

        leftSubList.innerHTML = [2, 3]
          .map((i) => renderUnit(state.teams[leftSide][i], false))
          .join("");

        rightMainList.innerHTML = [0, 1]
          .map((i) =>
            renderUnit(
              state.teams[rightSide][i],
              info.side === rightSide && info.slot === i,
            ),
          )
          .join("");

        rightSubList.innerHTML = [2, 3]
          .map((i) => renderUnit(state.teams[rightSide][i], false))
          .join("");

        partyLog.textContent = state.log || "";

        if (state.winner) {
          if (currentMode === "single") {
            partyTurnText.textContent =
              state.winner === "player" ? t("result.win") : t("result.lose");
          } else {
            partyTurnText.textContent =
              state.winner === mySide ? t("result.win") : t("result.lose");
          }

          partyActionButtons.innerHTML = "";
          return;
        }

        const actor = getTeam(state, info.side)[info.slot];

        partyTurnText.textContent = `${state.round}라운드 - ${sideLabel(info.side)} 메인${info.slot + 1} ${tx(actor.character)} 행동`;
        partyActionButtons.innerHTML = "";

        const myTurn =
          currentMode === "single"
            ? info.side === "player"
            : info.side === mySide;

        if (!myTurn) {
          const wait = document.createElement("div");

          wait.className = "status";

          if (currentMode === "single" && info.side === "ai") {
            wait.textContent = partyBusy ? tx("AI 행동 중...") : tx("AI 턴입니다.");
          } else {
            wait.textContent = `${sideLabel(info.side)} 턴입니다. 상대 행동을 기다리는 중...`;
          }

          partyActionButtons.appendChild(wait);
          return;
        }

        if (pendingPartyAction) {
          const skill =
            pendingPartyAction.kind === "main" && pendingPartyAction.skillId === ULTIMATE_SKILL_ID
              ? { name: `궁극기: ${getUltimateSkill(actor).name}` }
              : pendingPartyAction.kind === "main"
                ? skills[pendingPartyAction.skillId]
                : { name: `서브스킬: ${pendingPartyAction.subSkill?.name || "-"}` };
          const selectionSide = pendingPartyAction.targetSide;

          const title = document.createElement("div");
          title.className = "status";
          title.textContent = `[${tx(skill.name)}] ${t("ui.targetSelect")}`;
          partyActionButtons.appendChild(title);

          [0, 1].forEach((slot) => {
            const target = state.teams[selectionSide][slot];
            const btn = document.createElement("button");
            const targetDead = !alive(target);
            const targetLabel = targetDead
              ? `${target?.character || tx("빈 자리")} [전투불능]`
              : `${target?.character || tx("빈 자리")}`;

            btn.className = "target-button";
            btn.disabled = !alive(target);
            btn.innerHTML = `
            <div class="skill-name">${sideLabel(selectionSide)} 메인${slot + 1} ${targetLabel}</div>
            <div class="skill-desc">HP ${target?.hp || 0} / ${target?.maxHp || 0}</div>
          `;

            btn.addEventListener("click", () =>
              pendingPartyAction.kind === "main"
                ? handlePartySkill(pendingPartyAction.skillId, selectionSide, slot)
                : handlePartySubSkill(pendingPartyAction.subIndex, selectionSide, slot),
            );
            partyActionButtons.appendChild(btn);
          });

          const cancel = document.createElement("button");
          cancel.className = "secondary";
          cancel.textContent = t("common.cancel");
          cancel.addEventListener("click", () => {
            pendingPartyAction = null;
            renderPartyBattle();
          });
          partyActionButtons.appendChild(cancel);
          return;
        }

        getSkillListForPlayer(actor).forEach((skillId) => {
          const skill = skills[skillId];
          const btn = document.createElement("button");

          btn.className = "skill-button";
          btn.innerHTML = `
          <div class="skill-name">${tx(skill.name)}</div>
          <div class="skill-power">${tx(skill.powerText || "")}</div>
          <div class="skill-desc">${tx(skill.desc)}</div>
        `;

          btn.addEventListener("click", () => {
            if (isTargetSkill(skill)) {
              pendingPartyAction = { kind: "main", skillId, targetSide: getEnemySide(state, info.side) };
              renderPartyBattle();
            } else {
              handlePartySkill(skillId);
            }
          });

          partyActionButtons.appendChild(btn);
        });

        const ultBtn = document.createElement("button");
        const ultimateGauge = clampUltimateGauge(actor?.ultimateGauge || 0);
        const ultimateReady = canUseUltimate(actor);
        const ultimateSkill = getUltimateSkill(actor);
        ultBtn.className = `skill-button${ultimateReady ? " ultimate-ready" : ""}`;
        ultBtn.disabled = !ultimateReady;
        ultBtn.innerHTML = `
          <div class="skill-name">${t("ui.ultimate")}: ${tx(ultimateSkill.name)}</div>
          <div class="skill-power">${tx(ultimateSkill.desc)}</div>
          <div class="skill-desc">게이지 ${ultimateGauge}/${ULTIMATE_READY_GAUGE} - ${ultimateReady ? t("state.available") : t("state.unavailable")}</div>
        `;
        if (ultimateReady) {
          ultBtn.addEventListener("click", () => {
            if (ultimateSkill.target === "enemySingle") {
              pendingPartyAction = { kind: "main", skillId: ULTIMATE_SKILL_ID, targetSide: getEnemySide(state, info.side) };
              renderPartyBattle();
              return;
            }
            handlePartySkill(ULTIMATE_SKILL_ID);
          });
        }
        partyActionButtons.appendChild(ultBtn);

        [2, 3].forEach((subIndex) => {
          const sub = state.teams[info.side][subIndex];
          const rotateBtn = document.createElement("button");
          const subSkillBtn = document.createElement("button");
          const mainLabel = `메인${info.slot + 1}`;
          const subLabel = `서브${subIndex - 1}`;
          const canRotate = alive(sub);
          const subSkill = getSubSkillForPlayer(sub);

          rotateBtn.className = "rotate-button secondary";
          rotateBtn.disabled = !canRotate || !alive(actor);
          rotateBtn.innerHTML = canRotate
            ? `
              <div class="rotate-title">${t("ui.rotationAvailable")}</div>
              <div class="rotate-main">${mainLabel} ${tx(actor.character)} ↔ ${subLabel} ${sub?.character || tx("빈 자리")}</div>
            `
            : `
              <div class="rotate-title unavailable">${t("ui.rotationUnavailable")}</div>
              <div class="rotate-main">${subLabel} ${sub?.character || tx("빈 자리")} [전투불능]</div>
            `;
          rotateBtn.addEventListener("click", () => handlePartyRotate(subIndex));
          partyActionButtons.appendChild(rotateBtn);

          subSkillBtn.className = "skill-button secondary";
          subSkillBtn.disabled = !canRotate || !alive(actor) || !subSkill;
          subSkillBtn.innerHTML = `
            <div class="skill-name">서브${subIndex - 1} ${t("ui.skill")}: ${tx(subSkill?.name || "없음")}</div>
            <div class="skill-desc">${tx(subSkill?.desc || t("state.unavailable"))}</div>
          `;
          if (!subSkillBtn.disabled) {
            subSkillBtn.addEventListener("click", () => {
              pendingPartyAction = {
                kind: "sub",
                subIndex,
                subSkill,
                targetSide: subSkill.target === "allySingleMain" ? info.side : getEnemySide(state, info.side),
              };
              renderPartyBattle();
            });
          }
          partyActionButtons.appendChild(subSkillBtn);
        });
      }

      async function handlePartySkill(
        skillId,
        targetSide = null,
        targetSlot = null,
      ) {
        pendingPartyAction = null;

        if (currentMode === "single") {
          singlePartyState = processPartySkill(
            singlePartyState,
            skillId,
            targetSide,
            targetSlot,
          );
          renderPartyBattle();
          triggerAiIfNeeded();
          return;
        }

        if (currentMode === "online") {
          const roomRef = ref(db, "rooms/" + currentRoomCode);
          const snapshot = await get(roomRef);

          if (!snapshot.exists()) return;

          const room = snapshot.val();
          const battle = room.state.battle;

          if (!battle || battle.winner) return;

          const info = getTurnInfo(battle);

          if (info.side !== mySide) {
            alert(tx("아직 내 턴이 아닙니다."));
            return;
          }

          const newBattle = processPartySkill(
            battle,
            skillId,
            targetSide,
            targetSlot,
          );

          await update(roomRef, {
            "state/battle": newBattle,
            updatedAt: Date.now(),
          });
        }
      }

      async function handlePartyRotate(subIndex) {
        pendingPartyAction = null;

        if (currentMode === "single") {
          singlePartyState = processPartyRotate(singlePartyState, subIndex);
          renderPartyBattle();
          triggerAiIfNeeded();
          return;
        }

        if (currentMode === "online") {
          const roomRef = ref(db, "rooms/" + currentRoomCode);
          const snapshot = await get(roomRef);

          if (!snapshot.exists()) return;

          const room = snapshot.val();
          const battle = room.state.battle;

          if (!battle || battle.winner) return;

          const info = getTurnInfo(battle);

          if (info.side !== mySide) {
            alert(tx("아직 내 턴이 아닙니다."));
            return;
          }

          const newBattle = processPartyRotate(battle, subIndex);

          await update(roomRef, {
            "state/battle": newBattle,
            updatedAt: Date.now(),
          });
        }
      }
      async function handlePartySubSkill(subIndex, targetSide, targetSlot) {
        pendingPartyAction = null;
        if (currentMode === "single") {
          singlePartyState = processPartySubSkill(singlePartyState, subIndex, targetSide, targetSlot);
          renderPartyBattle();
          triggerAiIfNeeded();
          return;
        }
        if (currentMode === "online") {
          const roomRef = ref(db, "rooms/" + currentRoomCode);
          const snapshot = await get(roomRef);
          if (!snapshot.exists()) return;
          const room = snapshot.val();
          const battle = room.state.battle;
          if (!battle || battle.winner) return;
          const info = getTurnInfo(battle);
          if (info.side !== mySide) {
            alert(tx("아직 내 턴이 아닙니다."));
            return;
          }
          const newBattle = processPartySubSkill(battle, subIndex, targetSide, targetSlot);
          await update(roomRef, { "state/battle": newBattle, updatedAt: Date.now() });
        }
      }

      function chooseAiSkill(actor) {
        if (canUseUltimate(actor)) {
          return ULTIMATE_SKILL_ID;
        }

        const list = getSkillListForPlayer(actor);
        const heal = list.find((id) => skills[id].type === "heal");

        if (heal && actor.hp <= actor.maxHp * 0.45 && Math.random() < 0.65) {
          return heal;
        }

        const guard = list.find((id) => skills[id].type === "guard");

        if (guard && actor.hp <= actor.maxHp * 0.35 && Math.random() < 0.45) {
          return guard;
        }

        return list[Math.floor(Math.random() * list.length)];
      }

      function tryAiRotate() {
        if (!singlePartyState || singlePartyState.winner) return false;

        const state = singlePartyState;
        const info = getTurnInfo(state);

        if (info.side !== "ai") return false;

        const team = state.teams.ai;
        const actor = team[info.slot];

        if (!alive(actor)) return false;

        const aliveSubs = [2, 3].filter((i) => alive(team[i]));

        if (aliveSubs.length === 0) return false;

        const hpRate = actor.hp / actor.maxHp;

        if (hpRate > 0.35) return false;
        if (Math.random() > 0.65) return false;

        aliveSubs.sort(
          (a, b) => team[b].hp / team[b].maxHp - team[a].hp / team[a].maxHp,
        );
        singlePartyState = processPartyRotate(state, aliveSubs[0]);

        return true;
      }

      function aiAction() {
        if (!singlePartyState || singlePartyState.winner) return;

        const info = getTurnInfo(singlePartyState);

        if (info.side !== "ai") return;

        if (tryAiRotate()) {
          renderPartyBattle();
          triggerAiIfNeeded();
          return;
        }

        const actor = singlePartyState.teams.ai[info.slot];
        const skillId = chooseAiSkill(actor);
        const skill =
          skillId === ULTIMATE_SKILL_ID
            ? { type: "attack" }
            : skills[skillId];

        if (isTargetSkill(skill)) {
          const targets = [0, 1].filter((i) =>
            alive(singlePartyState.teams.player[i]),
          );
          const targetSlot =
            targets[Math.floor(Math.random() * targets.length)];

          singlePartyState = processPartySkill(
            singlePartyState,
            skillId,
            "player",
            targetSlot,
          );
        } else {
          singlePartyState = processPartySkill(singlePartyState, skillId);
        }

        renderPartyBattle();
        triggerAiIfNeeded();
      }

      function triggerAiIfNeeded() {
        if (!singlePartyState || singlePartyState.winner) return;

        const info = getTurnInfo(singlePartyState);

        if (info.side === "ai" && !partyBusy) {
          partyBusy = true;
          renderPartyBattle();

          setTimeout(() => {
            partyBusy = false;
            aiAction();
          }, 900);
        }
      }

      async function resetBattle() {
        if (currentMode === "single") {
          openSingleMode();
          return;
        }

        if (currentMode === "online") {
          await leaveRoom();
        }
      }

      async function leaveRoom() {
        if (currentMode === "single") {
          backToMode();
          return;
        }

        if (!currentRoomCode || !mySide) {
          location.reload();
          return;
        }

        if (mySide === "p1") {
          await remove(ref(db, "rooms/" + currentRoomCode));
        } else {
          await update(ref(db, "rooms/" + currentRoomCode), {
            "players/p2": false,
            "state/p2Party": [],
            "state/started": false,
            "state/battle": null,
            "state/log": "2P가 나갔습니다. 새 참가자를 기다리는 중...",
            updatedAt: Date.now(),
          });

          location.reload();
        }
      }

      function backToMode() {
        currentMode = null;
        currentRoomCode = null;
        mySide = null;
        partySelection = [];
        singlePartyState = null;
        latestOnlineBattle = null;
        partyBusy = false;
        pendingPartyAction = null;
        showScreen("mode");
      }

      onlineModeBtn.addEventListener("click", openOnlineMode);
      singleModeBtn.addEventListener("click", openSingleMode);
      createRoomBtn.addEventListener("click", createRoom);
      joinRoomBtn.addEventListener("click", joinRoom);
      backToModeBtn.addEventListener("click", backToMode);
      waitingBackBtn.addEventListener("click", leaveRoom);

      selectBackBtn.addEventListener("click", async () => {
        if (currentMode === "online" && currentRoomCode && mySide === "p1") {
          await remove(ref(db, "rooms/" + currentRoomCode));
        }

        backToMode();
      });

      partyResetBtn.addEventListener("click", resetBattle);
      partyLeaveBtn.addEventListener("click", leaveRoom);

      copyCodeBtn.addEventListener("click", async () => {
        if (!currentRoomCode) return;

        try {
          await navigator.clipboard.writeText(currentRoomCode);
          alert(tx("방 코드 복사 완료!"));
        } catch {
          alert(tx("복사 실패. 방 코드를 직접 보내줘: ") + currentRoomCode);
        }
      });
    

      function refreshLocalizedUI() {
        applyLanguage();

        const title = document.querySelector("h1");
        if (title) title.textContent = t("header.title");
        const sub = document.querySelector(".subtitle");
        if (sub) sub.textContent = t("header.subtitle");
        const modeTitle = document.querySelector(".mode-title");
        if (modeTitle) modeTitle.textContent = t("mode.select");

        if (onlineModeBtn) onlineModeBtn.textContent = t("mode.online");
        if (singleModeBtn) singleModeBtn.textContent = t("mode.single");
        if (createRoomBtn) createRoomBtn.textContent = t("lobby.create");
        if (joinRoomBtn) joinRoomBtn.textContent = t("lobby.join");
        if (roomInput) roomInput.placeholder = t("lobby.input");
        if (backToModeBtn) backToModeBtn.textContent = t("common.backToMode");
        if (copyCodeBtn) copyCodeBtn.textContent = t("common.copyRoom");
        if (waitingBackBtn) waitingBackBtn.textContent = t("common.leave");
        if (selectBackBtn) selectBackBtn.textContent = t("common.back");
        if (partyResetBtn) partyResetBtn.textContent = t("common.restart");
        if (partyLeaveBtn) partyLeaveBtn.textContent = t("common.leave");

        if (selectTopLabel && currentMode === "single") selectTopLabel.textContent = t("select.party");
        if (selectTitle && currentMode === "single") selectTitle.textContent = t("select.party4");

        if (!selectCharacter.classList.contains("hidden")) {
          renderRecommendedButtons();
          renderCharacterList();
          renderSelectedPartyPreview();
          renderSingleStartButton();
          renderOnlineSubmitButton();
          if (myRoleText) {
            myRoleText.textContent = currentMode === "single" ? t("select.orderGuideSingle") : t("select.orderGuide");
          }
        }

        if (!waiting.classList.contains("hidden") && waitingText) {
          waitingText.textContent = t("waiting.opponentSelecting");
        }

        if (!partyBattle.classList.contains("hidden") && (singlePartyState || latestOnlineBattle)) {
          renderPartyBattle();
        }
      }

      refreshLocalizedUI();
      renderRecommendedButtons();
