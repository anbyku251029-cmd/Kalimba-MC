import fs from 'fs';
import path from 'path';
import { BEGINNER_SONGS } from '../src/data/songsBeginner';
import { INTERMEDIATE_SONGS } from '../src/data/songsIntermediate';
import { ADVANCED_SONGS } from '../src/data/songsAdvanced';
import { DEFAULT_HYMN_SONGS } from '../src/data/hymns';
import { validateAllSongs, SongValidationResult } from '../src/utils/musicValidator';

const allSongs = [
  ...BEGINNER_SONGS,
  ...INTERMEDIATE_SONGS,
  ...ADVANCED_SONGS,
  ...DEFAULT_HYMN_SONGS,
];

console.log(`총 ${allSongs.length}곡 검증 시작...`);
const audit = validateAllSongs(allSongs);

console.log('====================================');
console.log(`[전체 검증 요약]`);
console.log(`총 곡 수: ${audit.totalSongs}곡`);
console.log(`PASS: ${audit.passCount}곡`);
console.log(`REVIEW: ${audit.reviewCount}곡`);
console.log(`FAIL: ${audit.failCount}곡`);
console.log('====================================');

const fails = audit.results.filter((r) => r.status === 'FAIL');
if (fails.length > 0) {
  console.log('\n[FAIL 곡 목록]');
  fails.forEach((f) => {
    console.log(`- [${f.level}] ${f.title} (${f.songId}):`, f.anomalies.join('; '));
  });
}

const reviews = audit.results.filter((r) => r.status === 'REVIEW');
console.log(`\n[REVIEW 곡 수: ${reviews.length}곡]`);
reviews.slice(0, 15).forEach((r) => {
  console.log(`- [${r.level}] ${r.title} (${r.songId}): 박자 불일치 마디 ${r.measureMismatchCount}개, 경고 ${r.warnings.length}개`);
});
if (reviews.length > 15) {
  console.log(`...외 ${reviews.length - 15}곡`);
}

// docs 폴더 생성 및 JSON 결과 저장
const docsDir = path.resolve(process.cwd(), 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(docsDir, 'audit-raw-results.json'),
  JSON.stringify(audit, null, 2),
  'utf-8'
);

console.log(`\n검증 결과가 docs/audit-raw-results.json에 저장되었습니다.`);
