import fs from 'fs';
import path from 'path';
import { BEGINNER_SONGS } from '../src/data/songsBeginner';
import { INTERMEDIATE_SONGS } from '../src/data/songsIntermediate';
import { ADVANCED_SONGS } from '../src/data/songsAdvanced';
import { DEFAULT_HYMN_SONGS } from '../src/data/hymns';
import { validateCatalog } from '../src/utils/musicValidator';

console.log('========================================================');
console.log(' Kalimba-MC STEP 01-B: 전체 곡 데이터 전수 검증 실행');
console.log('========================================================\n');

// 1. 실제 등록된 모든 곡 로드 (추정치 대신 실제 데이터 직접 취합)
const allSongs = [
  ...BEGINNER_SONGS,
  ...INTERMEDIATE_SONGS,
  ...ADVANCED_SONGS,
  ...DEFAULT_HYMN_SONGS,
];

console.log(`[1] 실제 등록 곡 수 집계`);
console.log(`- 초급 (beginner): ${BEGINNER_SONGS.length}곡`);
console.log(`- 중급 (intermediate): ${INTERMEDIATE_SONGS.length}곡`);
console.log(`- 고급 (advanced): ${ADVANCED_SONGS.length}곡`);
console.log(`- 찬송가 (hymn): ${DEFAULT_HYMN_SONGS.length}곡`);
console.log(`- 총 계: ${allSongs.length}곡\n`);

// 2. 검증 엔진 전수 실행
const summary = validateCatalog(allSongs);

console.log(`[2] 전수 검증 상태 집계 결과`);
console.log(`- PASS (객관적 기준 완벽 통과): ${summary.statusCounts.PASS}곡`);
console.log(`- REVIEW (원곡 대조 및 리듬 검토 권장): ${summary.statusCounts.REVIEW}곡`);
console.log(`- FAIL (재현 가능한 치명적 결함): ${summary.statusCounts.FAIL}곡`);
console.log(`- UNVERIFIED (자료 부족으로 판정 불가): ${summary.statusCounts.UNVERIFIED}곡\n`);

console.log(`[3] 에러 코드별 발생 빈도 집계`);
Object.entries(summary.errorCodeCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([code, count]) => {
    console.log(`- ${code}: ${count}건`);
  });

console.log('\n[4] 대표적인 REVIEW 항목 목록 (상위 10개 곡):');
summary.reports
  .filter((r) => r.status === 'REVIEW')
  .slice(0, 10)
  .forEach((r) => {
    const mismatchCount = r.measureAudits.filter((m) => !m.isValid).length;
    console.log(`- [${r.category}] ${r.title} (${r.songId}): 마디 박자 불일치 ${mismatchCount}개`);
  });

// 5. 검증 결과 JSON 파일 저장
const docsDir = path.resolve(process.cwd(), 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(docsDir, 'step01b-validation-raw-results.json'),
  JSON.stringify(summary, null, 2),
  'utf-8'
);

console.log(`\n✓ 전수 검증 원시 데이터가 docs/step01b-validation-raw-results.json에 저장되었습니다.`);
