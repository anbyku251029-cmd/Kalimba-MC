import { BEGINNER_SONGS } from '../src/data/songsBeginner';
import { INTERMEDIATE_SONGS } from '../src/data/songsIntermediate';
import { ADVANCED_SONGS } from '../src/data/songsAdvanced';
import { DEFAULT_HYMN_SONGS } from '../src/data/hymns';
import { KALIMBA_KEYS, PITCH_TO_KEY } from '../src/constants/kalimbaKeys';

const allSongs = [...BEGINNER_SONGS, ...INTERMEDIATE_SONGS, ...ADVANCED_SONGS, ...DEFAULT_HYMN_SONGS];

console.log('=== 17음 C Major 칼림바 음역 정밀 분석 ===\n');

console.log('1. 하드웨어 지원 17개 건반 목록 (C4 ~ E6):');
KALIMBA_KEYS.forEach((k) => {
  console.log(`- 건반 #${k.index.toString().padStart(2, ' ')}: ${k.pitch.padEnd(3, ' ')} | 계이름: ${k.solfege} | 숫자보: ${k.numberNotation}${k.dots === 1 ? '•' : k.dots === 2 ? ':' : ' '} | 주파수: ${k.frequency.toFixed(2)}Hz | 손: ${k.hand}`);
});

const usedPitches = new Map<string, number>();
const unmappedPitches = new Map<string, string[]>();

allSongs.forEach((song) => {
  song.notes.forEach((n) => {
    if (n.isRest || n.pitch === 'REST') return;
    usedPitches.set(n.pitch, (usedPitches.get(n.pitch) || 0) + 1);
    if (!PITCH_TO_KEY.has(n.pitch)) {
      const list = unmappedPitches.get(n.pitch) || [];
      list.push(song.id);
      unmappedPitches.set(n.pitch, list);
    }
  });
});

console.log('\n2. 110곡 전체에서 사용된 음높이 출현 빈도:');
Array.from(usedPitches.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([pitch, count]) => {
    const isSupported = PITCH_TO_KEY.has(pitch);
    console.log(`- ${pitch}: ${count}회 사용 ${isSupported ? '✓ (정상 지원)' : '✗ (미지원!)'}`);
  });

console.log(`\n3. 미지원 음높이 수: ${unmappedPitches.size}개`);
if (unmappedPitches.size > 0) {
  unmappedPitches.forEach((songs, pitch) => {
    console.log(`- 미지원 음 [${pitch}]: 곡 ${songs.length}개에서 발견됨 (${songs.slice(0, 5).join(', ')}...)`);
  });
} else {
  console.log('✓ 모든 음표가 17음 C Major 건반(C4~E6)에 100% 매핑됩니다.');
}
