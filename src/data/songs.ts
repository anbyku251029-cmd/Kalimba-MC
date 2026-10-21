import { Song } from '../types/music';
import { BEGINNER_SONGS } from './songsBeginner';
import { INTERMEDIATE_SONGS } from './songsIntermediate';
import { ADVANCED_SONGS } from './songsAdvanced';
import { DEFAULT_HYMN_SONGS, loadAllHymns } from './hymns';

export { BEGINNER_SONGS, INTERMEDIATE_SONGS, ADVANCED_SONGS, DEFAULT_HYMN_SONGS, loadAllHymns };

export const SONGS_DATA: Song[] = [
  ...BEGINNER_SONGS,
  ...INTERMEDIATE_SONGS,
  ...ADVANCED_SONGS,
  ...DEFAULT_HYMN_SONGS,
];

export function getAllSongsWithCustomHymns(): Song[] {
  return [
    ...BEGINNER_SONGS,
    ...INTERMEDIATE_SONGS,
    ...ADVANCED_SONGS,
    ...loadAllHymns(),
  ];
}

export const SONGS_BY_LEVEL: Record<string, Song[]> = {
  beginner: BEGINNER_SONGS,
  intermediate: INTERMEDIATE_SONGS,
  advanced: ADVANCED_SONGS,
  hymn: DEFAULT_HYMN_SONGS,
};

export const DEFAULT_SONG = BEGINNER_SONGS[0];
