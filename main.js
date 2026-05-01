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
import { skills, characters } from "./data.js";
import { BATTLE_MODULE } from "./battle.js";
import { ONLINE_MODULE } from "./online.js";
import { UI_MODULE } from "./ui.js";

void BATTLE_MODULE;
void ONLINE_MODULE;
void UI_MODULE;

const modeSelect = document.getElementById("modeSelect");
      const lobby = document.getElementById("lobby");
      const waiting = document.getElementById("waiting");
      const selectCharacter = document.getElementById("selectCharacter");
      const partyBattle = document.getElementById("partyBattle");

      const onlineModeBtn = document.getElementById("onlineModeBtn");
      const singleModeBtn = document.getElementById("singleModeBtn");
      const startBtn = document.getElementById("startBtn");
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
      }

      function makeRoomCode() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 4; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
      }

      function makePlayerFromCharacter(charName) {
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
          skillIds: c.skillIds,
          turnCount: 0,
          guardRate: 0,
          evasion: false,
          atkBuff: 0,
          atkDebuff: 0,
          poison: 0,
        };
      }

      function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
      }

      function alive(unit) {
        return unit && unit.hp > 0;
      }

      function getSkillListForPlayer(player) {
        return ["basic", ...(player.skillIds || [])];
      }

      function isTargetSkill(skill) {
        return [
          "attack",
          "attackBuff",
          "attackDebuff",
          "poisonAttack",
          "weakAttack",
        ].includes(skill.type);
      }

      function getTeam(state, side) {
        return state.teams[side];
      }

      function getEnemySide(state, side) {
        return state.sides.find((s) => s !== side);
      }

      function sideLabel(side) {
        if (side === "player") return "플레이어";
        if (side === "ai") return "AI";
        if (side === "p1") return "1P";
        if (side === "p2") return "2P";
        return side;
      }

      function getStateText(player) {
        const list = [];

        if (player.guardRate > 0) list.push("방어");
        if (player.evasion) list.push("연막");
        if (player.atkBuff > 0) list.push(`공격강화 +${player.atkBuff}`);
        if (player.atkDebuff > 0) list.push(`공격감소 -${player.atkDebuff}`);
        if (player.poison > 0) list.push(`독 ${player.poison}`);

        return list.length ? list.join(" / ") : "상태 없음";
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
              `${defenderLabel} ${defender.character}이 연막으로 공격을 회피했다!`,
            );
            return { hit: false, damage: 0 };
          }
        }

        if (defender.character === "도적" && Math.random() < 0.15) {
          logs.push(
            `${defenderLabel} ${defender.character}의 패시브 [그림자 걸음] 발동!`,
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
          logs.push(`${defender.character}의 패시브 [불굴의 육체] 발동!`);
        }

        if (defender.guardRate > 0) {
          damage = Math.floor(damage * (1 - defender.guardRate));
          defender.guardRate = 0;
          logs.push(
            `${defenderLabel} ${defender.character}이 방어로 피해를 줄였다!`,
          );
        }

        damage = Math.max(1, damage);
        defender.hp = Math.max(0, defender.hp - damage);

        return { hit: true, damage };
      }

      function applyPoisonStart(state, side, slot) {
        const actor = getTeam(state, side)[slot];
        let log = "";

        if (actor && actor.poison > 0) {
          actor.poison -= 1;
          actor.hp = Math.max(0, actor.hp - 5);
          log += `${sideLabel(side)} ${actor.character}은 독으로 5 피해를 받았다!\n`;
        }

        return log;
      }

      function autoPromote(team, logs = []) {
        for (let slot = 0; slot < 2; slot++) {
          if (!alive(team[slot])) {
            const subIndex = [2, 3].find((i) => alive(team[i]));

            if (subIndex !== undefined) {
              const fallen = team[slot]?.character || "빈 자리";
              const incoming = team[subIndex].character;

              [team[slot], team[subIndex]] = [team[subIndex], team[slot]];
              logs.push(`${fallen} 대신 ${incoming}이 메인으로 출전!`);
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
        const skill = skills[skillId] || skills.basic;
        let log = applyPoisonStart(state, info.side, info.slot);

        if (!alive(actor)) {
          log += `${sideLabel(info.side)} ${actor?.character || "빈 자리"}이 쓰러져 행동할 수 없습니다.`;
          state.log = log;
          advanceTurn(state);
          return state;
        }

        actor.turnCount = (actor.turnCount || 0) + 1;
        log += `${sideLabel(info.side)} 메인${info.slot + 1} ${actor.character}의 [${skill.name}]!\n`;

        if (skill.type === "guard") {
          actor.guardRate = skill.guardRate;
          log += "다음에 받는 피해가 감소한다!";
        } else if (skill.type === "heal") {
          let healAmount = skill.heal;

          if (actor.character === "성직자") {
            healAmount = Math.floor(healAmount * 1.2);
            log += `${actor.character}의 패시브 [성스러운 가호] 발동!\n`;
          }

          const before = actor.hp;
          actor.hp = Math.min(actor.maxHp, actor.hp + healAmount);
          log += `HP를 ${actor.hp - before} 회복했다!`;
        } else if (skill.type === "evasion") {
          actor.evasion = true;
          log += "다음 공격을 회피할 준비를 했다!";
        } else {
          const defender = getTeam(state, targetSide)[targetSlot];
          const logs = [];
          const result = applyDamageCore(
            actor,
            defender,
            skill.power,
            { bonusIfPoison: skill.bonusIfPoison },
            logs,
            sideLabel(info.side),
            sideLabel(targetSide),
          );

          if (logs.length) {
            log += logs.join("\n") + "\n";
          }

          if (result.hit) {
            log += `${sideLabel(targetSide)} 메인${targetSlot + 1} ${defender.character}에게 ${result.damage} 데미지!`;

            if (skill.type === "attackBuff") {
              actor.atkBuff += skill.buff;
              log += `\n다음 공격 피해가 ${skill.buff} 증가한다!`;
            }

            if (skill.type === "attackDebuff") {
              defender.atkDebuff += skill.debuff;
              log += `\n${sideLabel(targetSide)} ${defender.character}의 다음 공격 피해가 감소한다!`;
            }

            if (skill.type === "poisonAttack") {
              defender.poison = 3;
              log += `\n${sideLabel(targetSide)} ${defender.character}이 독 상태가 되었다!`;
            }
          }
        }

        state.log = log;
        autoPromoteAll(state);

        if (checkWinner(state)) {
          state.log += `\n${sideLabel(state.winner)} 승리!`;
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
          log += `${actor?.character || "빈 자리"}이 쓰러져 로테이션할 수 없습니다.`;
        } else if (!alive(sub)) {
          log += `${sub?.character || "빈 자리"}은 쓰러져 로테이션할 수 없습니다.`;
        } else {
          [team[info.slot], team[subIndex]] = [team[subIndex], team[info.slot]];
          log += `로테이션! ${sideLabel(info.side)} 메인${info.slot + 1} ${actor.character} ↔ 서브${subIndex - 1} ${sub.character}`;
        }

        state.log = log;
        advanceTurn(state);

        return state;
      }

      function renderCharacterList() {
        characterList.innerHTML = "";

        Object.values(characters).forEach((c) => {
          const div = document.createElement("div");
          div.className = "character-card";

          const skillNames = c.skillIds
            .map((id) => `${skills[id].name} - ${skills[id].powerText}`)
            .join("<br>");

          const selected = partySelection.includes(c.name);
          const buttonText = selected
            ? "선택됨"
            : `파티에 추가 (${partySelection.length}/4)`;

          div.innerHTML = `
          <div class="character-name">${c.name}</div>
          <div class="character-info">
            HP ${c.hp} / 공격 ${c.atk} / 방어 ${c.def}<br>
            <span class="passive">패시브: ${c.passiveName}</span><br>
            ${c.passiveDesc}<br>
            스킬:<br>${skillNames}
          </div>
          <button class="green" ${selected ? "disabled" : ""}>${buttonText}</button>
        `;

          div
            .querySelector("button")
            .addEventListener("click", () => selectPartyCharacter(c.name));
          characterList.appendChild(div);
        });
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
        latestOnlineBattle = null;
        roomInput.value = "";
        showScreen("lobby");
      }

      function openSingleMode() {
        currentMode = "single";
        currentRoomCode = null;
        mySide = "player";
        partySelection = [];
        singlePartyState = null;
        pendingPartySkillId = null;
        partyBusy = false;

        selectTopLabel.textContent = "싱글 파티";
        selectRoomCodeView.textContent = "0/4";
        selectTitle.textContent = "파티 4명 선택";
        myRoleText.textContent =
          "선택 순서대로 1,2번은 메인 / 3,4번은 서브가 됩니다.";

        renderCharacterList();
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

        roomCodeView.textContent = code;
        selectTopLabel.textContent = "방 코드";
        selectRoomCodeView.textContent = code;
        selectTitle.textContent = "1P 파티 4명 선택";
        myRoleText.textContent =
          "선택 순서대로 1,2번은 메인 / 3,4번은 서브입니다.";

        renderCharacterList();
        showScreen("select");
        listenRoom(code);
      }

      async function joinRoom() {
        if (!(await ensureOnlineAvailable())) return;

        currentMode = "online";

        const code = roomInput.value.trim().toUpperCase();

        if (code.length !== 4) {
          alert("방 코드는 4글자입니다.");
          return;
        }

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

        selectTopLabel.textContent = "방 코드";
        selectRoomCodeView.textContent = code;
        selectTitle.textContent = "2P 파티 4명 선택";
        myRoleText.textContent =
          "선택 순서대로 1,2번은 메인 / 3,4번은 서브입니다.";

        renderCharacterList();
        showScreen("select");
        listenRoom(code);
      }

      async function selectPartyCharacter(charName) {
        if (partySelection.includes(charName)) return;

        partySelection.push(charName);

        if (currentMode === "single") {
          selectRoomCodeView.textContent = `${partySelection.length}/4`;
          myRoleText.textContent = `선택됨: ${partySelection.join(" / ")}`;

          if (partySelection.length >= 4) {
            startSinglePartyBattle(partySelection);
          } else {
            renderCharacterList();
          }

          return;
        }

        if (currentMode === "online") {
          myRoleText.textContent = `선택됨: ${partySelection.join(" / ")}`;

          if (partySelection.length < 4) {
            renderCharacterList();
            return;
          }

          const party = partySelection.map(makePlayerFromCharacter);
          const updates = {};

          updates[`state/${mySide}Party`] = party;
          updates["state/log"] = `${sideLabel(mySide)} 파티 선택 완료!`;
          updates["updatedAt"] = Date.now();

          await update(ref(db, "rooms/" + currentRoomCode), updates);

          roomCodeView.textContent = currentRoomCode;
          waitingText.textContent = "상대의 파티 선택을 기다리는 중...";
          showScreen("waiting");
        }
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
          playerNames.map(makePlayerFromCharacter),
          aiNames.map(makePlayerFromCharacter),
          `싱글 4인 파티 배틀 시작!\n플레이어: ${playerNames.join(" / ")}\nAI: ${aiNames.join(" / ")}\n1라운드 시작!`,
        );

        pendingPartySkillId = null;
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
          waitingText.textContent = "상대의 파티 선택을 기다리는 중...";
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

        const deadLabel = isDead ? " [전투불능]" : "";
        const stateText = isDead
          ? "행동 불가 / 로테이션 불가"
          : getStateText(unit);

        return `
        <div class="${classes.join(" ")}">
          <div class="unit-name">${unit.character || "빈 자리"}${deadLabel}</div>
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
              state.winner === "player" ? "승리!" : "패배!";
          } else {
            partyTurnText.textContent =
              state.winner === mySide ? "승리!" : "패배!";
          }

          partyActionButtons.innerHTML = "";
          return;
        }

        const actor = getTeam(state, info.side)[info.slot];

        partyTurnText.textContent = `${state.round}라운드 - ${sideLabel(info.side)} 메인${info.slot + 1} ${actor.character} 행동`;
        partyActionButtons.innerHTML = "";

        const myTurn =
          currentMode === "single"
            ? info.side === "player"
            : info.side === mySide;

        if (!myTurn) {
          const wait = document.createElement("div");

          wait.className = "status";

          if (currentMode === "single" && info.side === "ai") {
            wait.textContent = partyBusy ? "AI 행동 중..." : "AI 턴입니다.";
          } else {
            wait.textContent = `${sideLabel(info.side)} 턴입니다. 상대 행동을 기다리는 중...`;
          }

          partyActionButtons.appendChild(wait);
          return;
        }

        if (pendingPartySkillId) {
          const skill = skills[pendingPartySkillId];
          const enemySide = getEnemySide(state, info.side);

          const title = document.createElement("div");
          title.className = "status";
          title.textContent = `[${skill.name}] 대상 선택`;
          partyActionButtons.appendChild(title);

          [0, 1].forEach((slot) => {
            const target = state.teams[enemySide][slot];
            const btn = document.createElement("button");
            const targetDead = !alive(target);
            const targetLabel = targetDead
              ? `${target?.character || "빈 자리"} [전투불능]`
              : `${target?.character || "빈 자리"}`;

            btn.className = "target-button";
            btn.disabled = !alive(target);
            btn.innerHTML = `
            <div class="skill-name">${sideLabel(enemySide)} 메인${slot + 1} ${targetLabel}</div>
            <div class="skill-desc">HP ${target?.hp || 0} / ${target?.maxHp || 0}</div>
          `;

            btn.addEventListener("click", () =>
              handlePartySkill(pendingPartySkillId, enemySide, slot),
            );
            partyActionButtons.appendChild(btn);
          });

          const cancel = document.createElement("button");
          cancel.className = "secondary";
          cancel.textContent = "취소";
          cancel.addEventListener("click", () => {
            pendingPartySkillId = null;
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
          <div class="skill-name">${skill.name}</div>
          <div class="skill-power">${skill.powerText}</div>
          <div class="skill-desc">${skill.desc}</div>
        `;

          btn.addEventListener("click", () => {
            if (isTargetSkill(skill)) {
              pendingPartySkillId = skillId;
              renderPartyBattle();
            } else {
              handlePartySkill(skillId);
            }
          });

          partyActionButtons.appendChild(btn);
        });

        [2, 3].forEach((subIndex) => {
          const sub = state.teams[info.side][subIndex];
          const btn = document.createElement("button");
          const mainLabel = `메인${info.slot + 1}`;
          const subLabel = `서브${subIndex - 1}`;
          const canRotate = alive(sub);
          const subSkillNames = canRotate
            ? getSkillListForPlayer(sub)
                .map((id) => skills[id]?.name)
                .filter(Boolean)
                .join(" · ")
            : "사용 불가";

          btn.className = "rotate-button secondary";
          btn.disabled = !canRotate;
          btn.innerHTML = canRotate
            ? `
              <div class="rotate-title">로테이션 가능</div>
              <div class="rotate-main">${mainLabel} ${actor.character} ↔ ${subLabel} ${sub?.character || "빈 자리"}</div>
              <div class="rotate-subskill">서브스킬: ${subSkillNames}</div>
            `
            : `
              <div class="rotate-title unavailable">로테이션 불가</div>
              <div class="rotate-main">${subLabel} ${sub?.character || "빈 자리"} [전투불능]</div>
              <div class="rotate-subskill">서브스킬: ${subSkillNames}</div>
            `;

          btn.addEventListener("click", () => handlePartyRotate(subIndex));
          partyActionButtons.appendChild(btn);
        });
      }

      async function handlePartySkill(
        skillId,
        targetSide = null,
        targetSlot = null,
      ) {
        pendingPartySkillId = null;

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
            alert("아직 내 턴이 아닙니다.");
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
        pendingPartySkillId = null;

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
            alert("아직 내 턴이 아닙니다.");
            return;
          }

          const newBattle = processPartyRotate(battle, subIndex);

          await update(roomRef, {
            "state/battle": newBattle,
            updatedAt: Date.now(),
          });
        }
      }

      function chooseAiSkill(actor) {
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
        const skill = skills[skillId];

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
        pendingPartySkillId = null;
        showScreen("mode");
      }

      onlineModeBtn.addEventListener("click", openOnlineMode);
      singleModeBtn.addEventListener("click", openSingleMode);
      if (startBtn) startBtn.addEventListener("click", openSingleMode);
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
          alert("방 코드 복사 완료!");
        } catch {
          alert("복사 실패. 방 코드를 직접 보내줘: " + currentRoomCode);
        }
      });
    
