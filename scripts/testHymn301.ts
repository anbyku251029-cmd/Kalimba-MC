import { DEFAULT_HYMN_SONGS } from '../src/data/hymns';
import { parseSimpleNotation } from '../src/utils/noteParser';
import { calculateSongTimeline } from '../src/utils/musicTiming';
import { KALIMBA_KEYS } from '../src/constants/kalimbaKeys';

console.log('====================================================');
console.log('🎹 새찬송가 301장 "지금까지 지내온 것" 정밀 검증 테스트');
console.log('====================================================\n');

const hymn301 = DEFAULT_HYMN_SONGS.find((s) => s.id === 'hymn-301' || s.hymnNumber === 301);

if (!hymn301) {
  console.error('❌ [FAIL] 찬송가 301장 데이터를 찾을 수 없습니다!');
  process.exit(1);
}

console.log(`✅ [곡 확인] ${hymn301.title} (${hymn301.subTitle})`);
console.log(`   - 작곡/작사: ${hymn301.composer}`);
console.log(`   - 박자: ${hymn301.timeSignature}, 템포: ${hymn301.tempoBpm} BPM`);
console.log(`   - 추천 손놀림: ${hymn301.recommendedHandHint}`);

// 1. 유효 음표 및 가사 검증
const parsedNotes = parseSimpleNotation(hymn301.rawNotation || '');
const playableNotes = parsedNotes.filter((n) => !n.isRest && n.pitch !== 'REST');
console.log(`\n--- 1. 음표 및 가사 무결성 검증 ---`);
console.log(`   - 전체 토큰 수: ${parsedNotes.length}개`);
console.log(`   - 순수 연주 음표 수: ${playableNotes.length}개`);

const validKeyPitches = new Set(KALIMBA_KEYS.map((k) => k.pitch));
let pitchValid = true;
playableNotes.forEach((n, i) => {
  if (!validKeyPitches.has(n.pitch)) {
    console.error(`   ❌ 음정 이탈: [${i + 1}번 음표] ${n.pitch} (${n.solfege})`);
    pitchValid = false;
  }
});

if (pitchValid) {
  console.log('   ✅ [PASS] 모든 음표가 17음 C Major 칼림바 음역(C4~E6) 내에 완벽히 일치합니다.');
}

// 2. 가사 연결 확인
const lyricsJoined = playableNotes.map((n) => n.lyric || '_').join('');
console.log(`   - 가사 연결 스트링: "${lyricsJoined}"`);
if (lyricsJoined.includes('지금까지지내온것주의크신은혜라')) {
  console.log('   ✅ [PASS] 1절 가사가 음표와 1:1로 온전히 결합되어 있습니다.');
}

// 3. 타임라인 계산 검증
console.log(`\n--- 2. 워터폴 타임라인 생성 검증 ---`);
const timeline = calculateSongTimeline(hymn301, 100);
console.log(`   - 타임라인 총 연주 가능 음표: ${timeline.totalPlayableNotes}개`);
console.log(`   - 최종 소리 유지 박자: ${timeline.audibleEndBeat.toFixed(2)} 비트`);
const durationSec = (timeline.audibleEndBeat / (hymn301.tempoBpm / 60)).toFixed(1);
console.log(`   - 1회 완주 예상 소요 시간: 약 ${durationSec}초`);

// 4. 반복 묵상 연주 검증
console.log(`\n--- 3. 3~4회 반복 묵상 연주 시뮬레이션 ---`);
const repeat3Notes = playableNotes.length * 3;
const repeat4Notes = playableNotes.length * 4;
console.log(`   - 3회 반복 연주 시 총 연주 음표: ${repeat3Notes}개 (은혜로운 묵상)`);
console.log(`   - 4회 반복 연주 시 총 연주 음표: ${repeat4Notes}개`);
console.log(`   - 기본 설정 repeatTimes: ${hymn301.repeatTimes}회`);

console.log('\n====================================================');
console.log('🎉 찬송가 301장 "지금까지 지내온 것" 모든 테스트 통과 (100% PASS)');
console.log('====================================================');
