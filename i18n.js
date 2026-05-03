const LANG_KEY = "mbg_lang";

export const I18N = {
  ko: {
    "app.title": "모바일 온라인 배틀",
    "header.title": "온라인 배틀",
    "header.subtitle": "모바일 턴제 대전 테스트",
    "mode.select": "모드 선택",
    "mode.online": "온라인 멀티 4인 파티",
    "mode.single": "싱글 AI 4인 파티",
    "lobby.create": "방 만들기",
    "lobby.join": "방 참가",
    "lobby.input": "방 코드 입력",
    "common.back": "뒤로가기",
    "common.leave": "나가기",
    "common.copyRoom": "방 코드 복사",
    "select.party4": "파티 4명 선택",
    "role.main": "메인",
    "role.sub": "서브",
    "battle.rotate": "로테이션",
    "skill.basic": "기본 공격",
    "skill.sub": "서브스킬",
    "skill.ult": "궁극기",
    "result.win": "승리!",
    "result.lose": "패배!",
    "state.dead": "전투불능",
    "state.gaugeLow": "게이지 부족",
    "state.available": "사용 가능",
    "state.unavailable": "사용 불가",
    "party.player": "플레이어",
    "party.ai": "AI",
    "party.p1": "1P",
    "party.p2": "2P",
  },
  ja: {
    "app.title": "モバイルオンラインバトル",
    "header.title": "オンラインバトル",
    "header.subtitle": "モバイルターン制バトルテスト",
    "mode.select": "モード選択",
    "mode.online": "オンライン対戦 4人パーティー",
    "mode.single": "シングルAI 4人パーティー",
    "lobby.create": "ルーム作成",
    "lobby.join": "ルーム参加",
    "lobby.input": "ルームコード入力",
    "common.back": "戻る",
    "common.leave": "戻る",
    "common.copyRoom": "ルームコードをコピー",
    "select.party4": "パーティー4人選択",
    "role.main": "メイン",
    "role.sub": "サブ",
    "battle.rotate": "ローテーション",
    "skill.basic": "通常攻撃",
    "skill.sub": "サブスキル",
    "skill.ult": "必殺技",
    "result.win": "勝利!",
    "result.lose": "敗北!",
    "state.dead": "戦闘不能",
    "state.gaugeLow": "ゲージ不足",
    "state.available": "使用可能",
    "state.unavailable": "使用不可",
    "party.player": "プレイヤー",
    "party.ai": "AI",
    "party.p1": "1P",
    "party.p2": "2P",
  },
};

const namesJa = {
  검사:"剣士",마법사:"魔法使い",도적:"盗賊",탱커:"タンク",광전사:"狂戦士",성직자:"聖職者",궁수:"弓使い",주술사:"呪術師",
  "기본 공격":"通常攻撃",일섬:"一閃","철벽 자세":"鉄壁の構え",반월참:"半月斬り",화염구:"火炎球",얼음창:"氷槍","치유의 빛":"癒しの光",독침:"毒針","급소 찌르기":"急所突き",연막:"煙幕","방패 강타":"シールドバッシュ","수호 자세":"守護の構え","묵직한 일격":"重い一撃","광란의 도끼":"狂乱の斧","피의 참격":"血の斬撃","분노 폭발":"怒りの爆発",치유:"治癒","빛의 심판":"光の審判",축복:"祝福","관통 화살":"貫通矢","연속 사격":"連続射撃","집중 조준":"集中照準",저주:"呪い","영혼 흡수":"魂の吸収","암흑 구체":"暗黒球",
  "검기 지원":"剣気支援","마력 증폭":"魔力増幅",교란:"撹乱","보호 개입":"防護介入","광기 투척":"狂気投擲","응급 치유":"応急治癒","엄호 사격":"援護射撃","약화 주술":"弱体呪術",
};

export function getLang() { return localStorage.getItem(LANG_KEY) || "ko"; }
export function setLang(lang) { localStorage.setItem(LANG_KEY, lang === "ja" ? "ja" : "ko"); }
export function t(key) { const lang = getLang(); return I18N[lang]?.[key] || I18N.ko[key] || key; }
export function tx(text) { return getLang() === "ja" ? (namesJa[text] || text) : text; }

// 새 UI 문구 추가 시 ko/ja 번역 테이블을 모두 추가하세요.
export function applyLanguage() {
  document.documentElement.lang = getLang() === "ja" ? "ja" : "ko";
  document.title = t("app.title");
}
