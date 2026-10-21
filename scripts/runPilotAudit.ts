import { BEGINNER_SONGS } from '../src/data/songsBeginner';
import { INTERMEDIATE_SONGS } from '../src/data/songsIntermediate';
import { ADVANCED_SONGS } from '../src/data/songsAdvanced';
import { DEFAULT_HYMN_SONGS } from '../src/data/hymns';
import { validateSong } from '../src/utils/musicValidator';

const pilotIds = [
  'beginner-1',
  'beginner-2',
  'beginner-4',
  'inter-6',
  'inter-1',
  'adv-10',
  'adv-2',
  'hymn-305',
  'hymn-563',
];

const all = [...BEGINNER_SONGS, ...INTERMEDIATE_SONGS, ...ADVANCED_SONGS, ...DEFAULT_HYMN_SONGS];

console.log('=== [대표 파일럿 9곡 정밀 검증 결과] ===\n');

pilotIds.forEach((id) => {
  const song = all.find((s) => s.id === id);
  if (!song) {
    console.log(`곡 ${id}을(를) 찾을 수 없습니다.`);
    return;
  }

  const result = validateSong(song);
  console.log(`----------------------------------------`);
  console.log(`[${result.level}] ${result.title} (${result.songId})`);
  console.log(`- 박자표: ${result.timeSignature}, BPM: ${result.tempoBpm}`);
  console.log(`- 음표 수: ${result.totalNotes} (연주음: ${result.playableNotes}, 쉼표: ${result.restNotes})`);
  console.log(`- 총 비트: ${result.totalBeats}비트, 실제 연주시간: ${result.durationSeconds}초`);
  console.log(`- 마디 수: ${result.measureCount}마디, 불일치 마디: ${result.measureMismatchCount}개`);
  console.log(`- 상태: ${result.status}`);

  if (result.measureMismatchCount > 0) {
    console.log(`  * 불일치 마디 세부내역:`);
    result.measureAudits
      .filter((m) => !m.isValid)
      .forEach((m) => {
        console.log(`    - ${m.measureNumber}번 마디: 예상 ${m.expectedBeats}박 vs 실제 ${m.actualBeats}박 (차이: ${m.diff > 0 ? '+' : ''}${m.diff}) -> [${m.rawText}]`);
      });
  }
  if (result.warnings.length > 0) {
    console.log(`  * 경고: ${result.warnings.join(' | ')}`);
  }
});
