#!/usr/bin/env node
/* ============================================================
   toeic_study_game-2.html のロジックをNode上で動かして検証する
   簡易テストランナー（外部依存なし・ブラウザ不要）。

   仕組み：
   1. toeic_study_game-2.html から <script>...</script> の中身を
      取り出す。
   2. document / window / localStorage などブラウザAPIの
      最小限のダミーを用意する（画面描画は行わないので、
      innerHTML書き込みやDOM取得は何もしないダミーでよい）。
   3. ゲーム本体のスクリプト＋各テストファイルの中身を1つの
      関数としてまとめて実行する（＝ゲーム側のトップレベル
      const/let/functionにテストコードから直接アクセスできる）。

   実行方法：
     node test/run.js
   もしくは：
     cd test && node run.js

   新しいテストを追加するには、このファイル下部の TEST_FILES
   配列に *.assertions.js のファイル名を追加する。
   ============================================================ */
const fs = require('fs');
const path = require('path');

const GAME_HTML_PATH = path.join(__dirname, '..', 'toeic_study_game-2.html');
const TEST_FILES = [
  'ls-scope-completion.assertions.js',
];

function fakeElement(){
  const el = {
    innerHTML: '', textContent: '', value: '', checked: false, disabled: false,
    style: {}, dataset: {},
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    addEventListener(){}, removeEventListener(){}, appendChild(){},
    setAttribute(){}, getAttribute(){ return null; },
    querySelector(){ return fakeElement(); },
    querySelectorAll(){ return []; },
  };
  return el;
}

function setupBrowserStubs(){
  const store = {};
  global.localStorage = {
    getItem(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v){ store[k] = String(v); },
    removeItem(k){ delete store[k]; },
  };
  global.document = {
    getElementById(){ return fakeElement(); },
    querySelector(){ return fakeElement(); },
    querySelectorAll(){ return []; },
    createElement(){ return fakeElement(); },
    addEventListener(){},
    documentElement: fakeElement(),
  };
  global.window = global;
  global.window.addEventListener = function(){};
  global.navigator = {};
  global.app = fakeElement();
  global.Audio = function(){ return { play(){ return Promise.resolve(); } }; };
}

function extractInlineScript(html){
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if(!match) throw new Error('toeic_study_game-2.html 内に <script> タグが見つかりませんでした。');
  return match[1];
}

function main(){
  setupBrowserStubs();

  const html = fs.readFileSync(GAME_HTML_PATH, 'utf8');
  const gameScript = extractInlineScript(html);

  const testSources = TEST_FILES.map(name => {
    const p = path.join(__dirname, name);
    console.log(`>> テストファイル読み込み: ${name}`);
    return fs.readFileSync(p, 'utf8');
  });

  // ゲーム本体のスクリプトと、全テストファイルを1つの関数本体として連結して実行する。
  // こうすることでテスト側からゲーム側のトップレベル関数・変数に直接アクセスできる。
  const combined = [gameScript, ...testSources].join('\n;\n');

  try {
    // eslint-disable-next-line no-new-func
    const runAll = new Function(combined);
    runAll();
  } catch (e) {
    console.error('\nテスト実行中に例外が発生しました:');
    console.error(e);
    process.exit(1);
  }

  const failures = global.__TEST_FAILURES__ || 0;
  if (failures > 0) {
    process.exit(1);
  }
}

main();
