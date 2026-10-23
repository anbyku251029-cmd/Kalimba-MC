import { ADVANCED_SONGS } from '../src/data/songsAdvanced';

console.log('=== 신규 고급곡 30곡 음표 수 검증 ===');
let failed = 0;
ADVANCED_SONGS.forEach((s, i) => {
  const playable = s.notes.filter(n => !n.isRest && n.pitch !== 'REST').length;
  const isPass = playable >= 50;
  if (!isPass) failed++;
  console.log(`[${i + 1}/30] ${s.id} - ${s.title}: ${playable}음표 ${isPass ? 'PASS' : 'FAIL'}`);
});
console.log('50음표 미만 실패 곡 수:', failed);
if (failed > 0) process.exit(1);
