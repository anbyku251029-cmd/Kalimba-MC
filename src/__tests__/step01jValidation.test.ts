import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { BEGINNER_SONGS } from '../data/songsBeginner';
import { INTERMEDIATE_SONGS } from '../data/songsIntermediate';
import { ADVANCED_SONGS } from '../data/songsAdvanced';
import { DEFAULT_HYMN_SONGS } from '../data/hymns';
import { parseSimpleNotation } from '../utils/noteParser';
import { KALIMBA_KEYS } from '../constants/kalimbaKeys';

const VALID_PITCHES = new Set(KALIMBA_KEYS.map((k) => k.pitch));

describe('STEP 01-J: 찬송가 및 고급 음악 전면 재구축 검증 스위트', () => {
  describe('1. 백업 데이터 무결성 검증', () => {
    it('backups/step01j 디렉토리에 원본 찬송가 및 고급곡 백업 파일이 정상 보존되어야 한다', () => {
      const hymnBackupPath = path.resolve(process.cwd(), 'backups/step01j/hymns.backup.ts');
      const advBackupPath = path.resolve(process.cwd(), 'backups/step01j/songsAdvanced.backup.ts');

      expect(fs.existsSync(hymnBackupPath)).toBe(true);
      expect(fs.existsSync(advBackupPath)).toBe(true);

      const hymnStat = fs.statSync(hymnBackupPath);
      const advStat = fs.statSync(advBackupPath);

      expect(hymnStat.size).toBeGreaterThan(10000);
      expect(advStat.size).toBeGreaterThan(10000);
    });
  });

  describe('2. 고급곡 (ADVANCED_SONGS) 30곡 전수 50음표 이상 및 17음 칼림바 음역 검증', () => {
    it('정확히 30곡의 고급곡이 존재해야 한다', () => {
      expect(ADVANCED_SONGS.length).toBe(30);
    });

    ADVANCED_SONGS.forEach((song, idx) => {
      it(`[adv-${idx + 1}] "${song.title}" - 음표 수 50개 이상 및 음역 검증`, () => {
        const notes = song.notes || parseSimpleNotation(song.rawNotation || '');
        const playableNotes = notes.filter((n) => !n.isRest && n.pitch !== 'REST');

        expect(playableNotes.length).toBeGreaterThanOrEqual(50);
        if (song.playableNoteCount) {
          expect(song.playableNoteCount).toBe(playableNotes.length);
        }

        playableNotes.forEach((n) => {
          expect(VALID_PITCHES.has(n.pitch)).toBe(true);
        });

        expect(song.level).toBe('advanced');
        expect(song.verificationStatus).toBe('ARRANGEMENT_VERIFIED');
        expect(song.isArranged).toBe(true);
      });
    });
  });

  describe('3. 기본 찬송가 (DEFAULT_HYMN_SONGS) 20곡 절/후렴 및 3~4회 반복 묵상 연주 검증', () => {
    it('정확히 20곡의 찬송가가 존재해야 한다', () => {
      expect(DEFAULT_HYMN_SONGS.length).toBe(20);
    });

    DEFAULT_HYMN_SONGS.forEach((hymn, idx) => {
      it(`[hymn-${idx + 1}] "${hymn.title}" - 찬송가 음역 및 3~4회 반복 연주 구조 검증`, () => {
        const notes = hymn.notes || parseSimpleNotation(hymn.rawNotation || '');
        const playableNotes = notes.filter((n) => !n.isRest && n.pitch !== 'REST');

        expect(playableNotes.length).toBeGreaterThanOrEqual(30);

        playableNotes.forEach((n) => {
          expect(VALID_PITCHES.has(n.pitch)).toBe(true);
        });

        expect(hymn.level).toBe('hymn');
        expect(hymn.verificationStatus).toBe('SOURCE_VERIFIED');
        expect(hymn.repeatTimes).toBeGreaterThanOrEqual(3);

        const totalRepeatedNotes = playableNotes.length * (hymn.repeatTimes || 3);
        expect(totalRepeatedNotes).toBeGreaterThanOrEqual(90);
      });
    });
  });

  describe('4. 기존 음악 카탈로그 보존성 및 안정성 검증', () => {
    it('초급 30곡과 중급 30곡이 온전히 보존되어야 한다', () => {
      expect(BEGINNER_SONGS.length).toBe(30);
      expect(INTERMEDIATE_SONGS.length).toBe(30);
    });

    it('전체 시스템 기본 곡 수는 110곡 (30+30+30+20)이어야 한다', () => {
      const totalSongs = BEGINNER_SONGS.length + INTERMEDIATE_SONGS.length + ADVANCED_SONGS.length + DEFAULT_HYMN_SONGS.length;
      expect(totalSongs).toBe(110);
    });
  });
});
