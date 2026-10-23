import { DEFAULT_HYMN_SONGS } from '../src/data/hymns';

console.log('=== 신규 찬송가 20곡 음표 수 및 반복 검증 ===');
DEFAULT_HYMN_SONGS.forEach((s, i) => {
  const playable = s.notes.filter(n => !n.isRest && n.pitch !== 'REST').length;
  console.log(`[${i + 1}/20] ${s.id} (${s.hymnNumber}장) - ${s.title}: 고유 ${playable}음표, ${s.repeatTimes}회 반복 시 ${playable * (s.repeatTimes || 1)}음표`);
});
