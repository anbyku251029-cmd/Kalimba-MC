import { DifficultyLevel, UserProgress } from '../types/music';

const STORAGE_KEY = 'kalimba_classroom_progress_v1';

const DEFAULT_PROGRESS: UserProgress = {
  completedSongIds: [],
  songPlayCounts: {},
  lastLevel: 'beginner',
  lastSongId: 'beginner-1',
  totalPracticeCount: 0,
};

export function loadUserProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw);
    return {
      completedSongIds: Array.isArray(parsed.completedSongIds) ? parsed.completedSongIds : [],
      songPlayCounts: typeof parsed.songPlayCounts === 'object' && parsed.songPlayCounts !== null ? parsed.songPlayCounts : {},
      lastLevel: ['beginner', 'intermediate', 'advanced', 'hymn'].includes(parsed.lastLevel) ? parsed.lastLevel : 'beginner',
      lastSongId: typeof parsed.lastSongId === 'string' ? parsed.lastSongId : 'beginner-1',
      totalPracticeCount: typeof parsed.totalPracticeCount === 'number' ? parsed.totalPracticeCount : 0,
    };
  } catch (e) {
    console.warn('Failed to load user progress from localStorage', e);
    return DEFAULT_PROGRESS;
  }
}

export function saveUserProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Failed to save user progress to localStorage', e);
  }
}

/**
 * Record a full song completion (grants star & updates practice count)
 */
export function recordSongCompletion(songId: string, currentProgress: UserProgress): UserProgress {
  const currentCount = currentProgress.songPlayCounts[songId] || 0;
  const isAlreadyCompleted = currentProgress.completedSongIds.includes(songId);

  const updated: UserProgress = {
    ...currentProgress,
    completedSongIds: isAlreadyCompleted ? currentProgress.completedSongIds : [...currentProgress.completedSongIds, songId],
    songPlayCounts: {
      ...currentProgress.songPlayCounts,
      [songId]: currentCount + 1,
    },
    totalPracticeCount: currentProgress.totalPracticeCount + 1,
    lastSongId: songId,
  };

  saveUserProgress(updated);
  return updated;
}

export function updateLastSession(level: DifficultyLevel, songId: string, currentProgress: UserProgress): UserProgress {
  const updated: UserProgress = {
    ...currentProgress,
    lastLevel: level,
    lastSongId: songId,
  };
  saveUserProgress(updated);
  return updated;
}
