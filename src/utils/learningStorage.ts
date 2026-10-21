/**
 * Kalimba-MC STEP 01-F
 * 단계별 학습 진행 기록 저장소
 * 
 * 기존 `kalimba_classroom_progress_v1` 및 `custom_hymns_v1`과 완전히 분리되어 작동하며,
 * 원본 곡 데이터에는 일체 영향을 주지 않습니다.
 */

import { LearningCatalogProgress, LearningProgressItem, LearningStep } from '../types/learningTypes';

const LEARNING_STORAGE_KEY = 'kalimba_learning_progress_v1';

export function loadAllLearningProgress(): LearningCatalogProgress {
  try {
    const raw = localStorage.getItem(LEARNING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.warn('[learningStorage] 로컬스토리지 학습 데이터 로드 실패 (기본값 복구)', e);
    return {};
  }
}

export function getSongLearningProgress(songId: string): LearningProgressItem {
  const all = loadAllLearningProgress();
  if (all[songId]) {
    return all[songId];
  }
  return {
    songId,
    completedSteps: [],
    lastStep: 'LISTENING',
    loopSectionIndex: 0,
    practiceCount: 0,
    practiceDurationSeconds: 0,
    lastPracticeTimestamp: 0,
    preferredSpeedPercent: 70,
  };
}

export function saveSongStepProgress(
  songId: string,
  stepCompleted: LearningStep,
  elapsedSeconds: number = 0,
  speedPercent: number = 70
): LearningProgressItem {
  try {
    const all = loadAllLearningProgress();
    const current = getSongLearningProgress(songId);

    const completedSet = new Set<LearningStep>(current.completedSteps);
    completedSet.add(stepCompleted);

    const updatedItem: LearningProgressItem = {
      ...current,
      completedSteps: Array.from(completedSet),
      lastStep: stepCompleted,
      practiceCount: current.practiceCount + (stepCompleted === 'PRACTICE_RESULT' ? 1 : 0),
      practiceDurationSeconds: current.practiceDurationSeconds + Math.max(0, Math.round(elapsedSeconds)),
      lastPracticeTimestamp: Date.now(),
      preferredSpeedPercent: speedPercent,
    };

    all[songId] = updatedItem;
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(all));
    return updatedItem;
  } catch (e) {
    console.warn('[learningStorage] 학습 진행 저장 실패', e);
    return getSongLearningProgress(songId);
  }
}

export function resetSongLearningProgress(songId: string): void {
  try {
    const all = loadAllLearningProgress();
    delete all[songId];
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('[learningStorage] 학습 진행 초기화 실패', e);
  }
}
