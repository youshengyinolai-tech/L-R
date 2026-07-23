/* ============================================================
   「🎯 L&Sの単語だけ」スコープの終了判定テスト（アサーション本体）
   ------------------------------------------------------------
   toeic_study_game-2.html の <script> をまるごと実行したのと同じ
   グローバルスコープ内でこのファイルが続けて実行される想定。
   （実行方法は隣の run.js を参照）

   検証すること：
   1. スコープを 'ls' にすると、カード式／4択(choose・en2en・en2ja)の
      各出題キューが「L&S.pdf 由来の120語だけ」になること。
   2. 全問（全カード）に正解／既知として答え終えたとき、
      各モードの「終了」判定（idx がキュー長に到達する）が
      ちょうど120問目で発生すること（383語分待たされたり、
      120問より前後にズレたりしないこと）。
   3. 終了画面に表示される分母（覚えた語の合計・正答の合計）が
      383ではなく120になっていること。
   4. スコープを 'all' に戻すと、通常通り383語に戻ること（回帰防止）。
   5. 高速基礎マスター（日本語／英英／L&S専用）は、この
      スコープ切り替えの影響を受けず独立していること（回帰防止）。
   ============================================================ */

__TEST_FAILURES__ = 0;
function assertTrue(cond, label){
  if(cond){
    console.log('  ✓ ' + label);
  } else {
    __TEST_FAILURES__++;
    console.log('  ✗ FAIL: ' + label);
  }
}
function assertEqual(actual, expected, label){
  assertTrue(actual === expected, label + '（期待値=' + expected + ' / 実際=' + actual + '）');
}
function section(title){ console.log('\n--- ' + title + ' ---'); }

// L&S.pdfの小テスト範囲は全12回×10語＝120語のはず（データ定義そのものの前提チェック）
section('前提：lsQuizVocab のデータ量');
assertEqual(lsQuizVocab.length, 120, 'lsQuizVocab は120語である');

// ============================================================
// 1) 🗂 日本語の意味（カード式）
// ============================================================
section('🗂 日本語の意味（カード式）: scope=ls での終了判定');
setWordScope('ls');
buildMeaningQueue();
assertEqual(meaningQueue.length, 120, '出題キューが120語である');
assertTrue(meaningQueue.every(function(w){ return w.source.indexOf('L&S.pdf')===0; }), '出題キューの単語が全てL&S.pdf由来である');

var guard = 0;
while(meaningIdx < meaningQueue.length && guard < 1000){
  guard++;
  markMeaningResult(true); // 全問「覚えた」として進める
}
assertTrue(guard < 1000, '無限ループに陥っていない（ガード未到達）');
assertEqual(meaningIdx, meaningQueue.length, 'ちょうどキュー長でidxが終了条件(このラウンド終了！)に達する');

var lsAll = getScopedWordItems();
var knownCount = lsAll.filter(function(w){ return isWordKnown(w.key); }).length;
assertEqual(lsAll.length, 120, '終了画面の分母（全語数）が120である（383ではない）');
assertEqual(knownCount, 120, '終了画面の分子（覚えた語数）が120である');

// ============================================================
// 2) 🔤/🇬🇧→🇬🇧/🇬🇧→🇯🇵 の4択3モード
// ============================================================
['choose', 'en2en', 'en2ja'].forEach(function(mode){
  section('4択モード「' + mode + '」: scope=ls での終了判定');
  setWordScope('ls'); // 各モード開始前に念のため再確認
  buildWordQuizQueue(mode);
  var st = wordQuizState[mode];
  assertEqual(st.queue.length, 120, '出題キューが120語である');
  assertTrue(st.queue.every(function(w){ return w.source.indexOf('L&S.pdf')===0; }), '出題キューの単語が全てL&S.pdf由来である');

  var cfg = WORD_QUIZ_MODES[mode];
  var fakeBtn = { classList: { add: function(){} } };
  var g = 0;
  while(st.idx < st.queue.length && g < 1000){
    g++;
    var item = st.queue[st.idx];
    answerWordQuiz(mode, item[cfg.optionField], item, fakeBtn); // 常に正解を選ぶ
    st.idx++; // 実アプリでは「次へ」ボタンのonclickが担う処理
  }
  assertTrue(g < 1000, '無限ループに陥っていない（ガード未到達）');
  assertEqual(st.idx, st.queue.length, 'ちょうどキュー長でidxが終了条件(' + cfg.doneTitle + ')に達する');
  assertEqual(st.score.total, 120, '終了時の出題数（分母）が120である');
  assertEqual(st.score.correct, 120, '終了時の正答数（分子）が120である（全問正解させたため）');
});

// ============================================================
// 3) スコープを全体に戻すと383語に戻る（回帰防止）
// ============================================================
section('回帰確認：scope=all に戻すと全383語になる');
setWordScope('all');
buildMeaningQueue();
assertEqual(meaningQueue.length, getAllWordItems().length, 'scope=allではカード式キューが全単語数と一致する');
assertTrue(meaningQueue.length > 120, '全単語数は120より多い（L&S以外の語も含む）');

['choose', 'en2en', 'en2ja'].forEach(function(mode){
  buildWordQuizQueue(mode);
  assertEqual(wordQuizState[mode].queue.length, getAllWordItems().length, 'scope=allでは「' + mode + '」のキューも全単語数と一致する');
});

// ============================================================
// 4) 高速基礎マスター（日本語／英英／L&S専用）はこのスコープ切替の影響を受けない
// ============================================================
section('回帰確認：高速基礎マスターはscope切替から独立している');
setWordScope('ls');
var jaPoolWithLsScope = getToshinPool('ja').length;
var enPoolWithLsScope = getToshinPool('en').length;
var lsPoolWithLsScope = getToshinPool('ls').length;
setWordScope('all');
var jaPoolWithAllScope = getToshinPool('ja').length;
var enPoolWithAllScope = getToshinPool('en').length;
var lsPoolWithAllScope = getToshinPool('ls').length;

assertEqual(jaPoolWithLsScope, jaPoolWithAllScope, '高速基礎マスター（日本語）の出題プール数はscope切替で変化しない');
assertEqual(enPoolWithLsScope, enPoolWithAllScope, '高速基礎マスター（英英）の出題プール数はscope切替で変化しない');
assertEqual(lsPoolWithLsScope, lsPoolWithAllScope, '高速基礎マスター（L&S小テスト範囲）の出題プール数はscope切替で変化しない');
assertEqual(lsPoolWithAllScope, 120, '高速基礎マスター（L&S小テスト範囲）は常に120語である');

section('結果');
if(__TEST_FAILURES__ === 0){
  console.log('\n全てのテストに合格しました。');
} else {
  console.log('\n' + __TEST_FAILURES__ + ' 件のテストが失敗しました。');
}
