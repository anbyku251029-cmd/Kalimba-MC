import { useState, useEffect, useCallback } from 'react';
import { Song } from './types/music';
import { getAllSongsWithCustomHymns } from './data/songs';
import { saveOrUpdateHymn, deleteOrResetHymn } from './data/hymns';
import { audioEngine } from './utils/audioEngine';
import { loadUserProgress, recordSongCompletion } from './utils/storage';
import { recordSectionPracticeCompletion } from './utils/practiceRewardService';
import { learningSessionManager } from './utils/learningSessionManager';
import { ComboStats } from './types/comboTypes';
import { GuguGagaSticker } from './types/practiceRewardTypes';
import { KalimbaGameWaterfall } from './components/KalimbaGameWaterfall';
import { SongSelectScreen } from './components/SongSelectScreen';
import { CompletionModal } from './components/CompletionModal';
import { RecordingStudio } from './components/RecordingStudio';
import { ScoreImageStudio } from './components/ScoreImageStudio';
import { HummingTranscriptionModal } from './components/HummingTranscriptionModal';
import { PwaStatusBanner } from './components/PwaStatusBanner';

type AppScreen = 'select' | 'practice' | 'recording' | 'scoreOcr';

export default function App() {
  const [userProgress, setUserProgress] = useState(() => loadUserProgress());
  const [allSongs, setAllSongs] = useState<Song[]>(() => getAllSongsWithCustomHymns());

  // Screen navigation state: defaults to 'select' (URL 파라미터 ?song=hymn-301 등으로 즉시 진입 가능)
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('song')) return 'practice';
    }
    return 'select';
  });

  // Currently selected song & difficulty
  const [currentSong, setCurrentSong] = useState<Song>(() => {
    const initialList = getAllSongsWithCustomHymns();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const songId = params.get('song');
      if (songId) {
        const found = initialList.find(
          (s) => s.id === songId || (s.hymnNumber && `hymn-${s.hymnNumber}` === songId)
        );
        if (found) return found;
      }
    }
    const twinkle = initialList.find((s) => s.id === 'beginner-4');
    return twinkle || initialList[0];
  });

  const [difficulty, setDifficulty] = useState<string>('쉬움');
  const [speedPercent, setSpeedPercent] = useState<number>(70);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Completion modal state & stats
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [isHummingModalOpen, setIsHummingModalOpen] = useState<boolean>(false);
  const [restartCount, setRestartCount] = useState<number>(0);
  const [lastCompletionStats, setLastCompletionStats] = useState<ComboStats | undefined>(undefined);
  const [newlyUnlockedStickers, setNewlyUnlockedStickers] = useState<GuguGagaSticker[]>([]);

  // Play/Pause
  const handleTogglePlay = useCallback(() => {
    audioEngine.ensureReady();
    setIsPlaying((prev) => {
      const next = !prev;
      if (!next) {
        learningSessionManager.pauseSession();
      } else {
        learningSessionManager.resumeSession();
      }
      return next;
    });
  }, []);

  // Restart from the very beginning of the song
  const handleRestart = useCallback(() => {
    audioEngine.ensureReady();
    audioEngine.stopAll();
    setShowCompletionModal(false);
    learningSessionManager.abandonActiveSession();
    learningSessionManager.startSession(currentSong.id, currentSong.title, difficulty, speedPercent);
    setRestartCount((prev) => prev + 1);
    setIsPlaying(true);
  }, [currentSong.id, currentSong.title, difficulty, speedPercent]);

  // Song completion handler (STEP 02-A: 리듬 콤보 통계 및 스티커 보상 연동, STEP 02-E: 완주 기록)
  const handleSongComplete = useCallback(
    (stats?: ComboStats) => {
      setIsPlaying(false);
      const updated = recordSongCompletion(currentSong.id, loadUserProgress());
      setUserProgress(updated);
      setLastCompletionStats(stats);

      // STEP 02-E: 실제 완주 세션 기록 및 통계 확정
      learningSessionManager.completeSession(stats);

      // 구구가가 스티커 보상 시스템 연동 (완주 성공 시 연습 세션 기록)
      try {
        const rewardResult = recordSectionPracticeCompletion(currentSong.id, 1, 999);
        if (rewardResult.newlyUnlockedStickers && rewardResult.newlyUnlockedStickers.length > 0) {
          setNewlyUnlockedStickers(rewardResult.newlyUnlockedStickers);
        } else {
          setNewlyUnlockedStickers([]);
        }
      } catch (err) {
        console.warn('Reward processing error', err);
      }

      setShowCompletionModal(true);
    },
    [currentSong.id]
  );

  // Select song from initial selection screen and enter practice screen
  const handleSelectSongAndStart = useCallback(
    (song: Song, newDiff: '쉬움' | '보통' | '어려움' | '찬송가' | string) => {
      audioEngine.ensureReady();
      audioEngine.stopAll();
      setShowCompletionModal(false);
      setCurrentSong(song);
      setDifficulty(newDiff);
      let calculatedSpeed = 100;
      if (newDiff === '쉬움') calculatedSpeed = 70;
      else if (newDiff === '어려움') calculatedSpeed = 130;
      else if (newDiff === '찬송가') calculatedSpeed = 90;
      setSpeedPercent(calculatedSpeed);

      // STEP 02-E: 새로운 연습 세션 시작
      learningSessionManager.startSession(song.id, song.title, newDiff, calculatedSpeed);

      setRestartCount((prev) => prev + 1);
      setIsPlaying(true);
      setCurrentScreen('practice');
    },
    []
  );

  // Change difficulty directly (쉬움: 70%, 찬송가: 90%, 보통: 100%, 어려움: 130%)
  const handleChangeDifficulty = useCallback((newDiff: string) => {
    setDifficulty(newDiff);
    if (newDiff === '쉬움') {
      setSpeedPercent(70);
    } else if (newDiff === '어려움') {
      setSpeedPercent(130);
    } else if (newDiff === '찬송가') {
      setSpeedPercent(90);
    } else {
      setSpeedPercent(100);
    }
  }, []);

  // Save or update hymn
  const handleSaveHymn = useCallback(
    (hymnData: {
      id?: string;
      hymnNumber?: number;
      title: string;
      subTitle?: string;
      description?: string;
      tempoBpm: number;
      timeSignature?: '4/4' | '3/4' | '2/4' | '6/8';
      rawNotation: string;
    }) => {
      saveOrUpdateHymn(hymnData);
      setAllSongs(getAllSongsWithCustomHymns());
    },
    []
  );

  // Delete or reset hymn
  const handleDeleteOrResetHymn = useCallback((id: string) => {
    deleteOrResetHymn(id);
    setAllSongs(getAllSongsWithCustomHymns());
  }, []);

  // Exit practice and return to initial song selection screen
  const handleExitPractice = useCallback(() => {
    audioEngine.stopAll();
    setIsPlaying(false);
    setShowCompletionModal(false);
    learningSessionManager.abandonActiveSession();
    setCurrentScreen('select');
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentScreen === 'practice') {
        if (e.code === 'Space') {
          e.preventDefault();
          handleTogglePlay();
        } else if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') {
          e.preventDefault();
          handleRestart();
        } else if (e.code === 'Escape') {
          handleExitPractice();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen, handleExitPractice, handleRestart, handleTogglePlay]);

  return (
    <div className="w-full min-h-screen bg-[#0c0827] overflow-y-auto overflow-x-hidden">
      {/* PWA 오프라인 감지, 설치 및 업데이트 배너 */}
      <PwaStatusBanner />

      {currentScreen === 'recording' ? (
        /* Recording Studio Screen */
        <RecordingStudio onBack={() => setCurrentScreen('select')} />
      ) : currentScreen === 'scoreOcr' ? (
        /* Score OCR & Image Editor Studio Screen */
        <ScoreImageStudio
          onBack={() => setCurrentScreen('select')}
          onSaveSong={(songData) => {
            const updatedList = saveOrUpdateHymn({
              title: songData.title,
              subTitle: songData.subTitle,
              description: songData.description,
              tempoBpm: songData.tempoBpm,
              timeSignature: songData.timeSignature,
              rawNotation: songData.rawNotation,
            });
            const refreshed = getAllSongsWithCustomHymns();
            setAllSongs(refreshed);
            const savedSong = refreshed.find((s) => s.title === songData.title) || refreshed[refreshed.length - 1];
            if (savedSong) {
              handleSelectSongAndStart(savedSong, songData.difficulty);
            } else {
              setCurrentScreen('select');
            }
          }}
        />
      ) : currentScreen === 'select' ? (
        /* First Screen: Select song divided by 쉬움(30곡), 보통(30곡), 어려움(30곡), 찬송가 */
        <SongSelectScreen
          songs={allSongs}
          onSelectSong={handleSelectSongAndStart}
          completedSongIds={userProgress.completedSongIds}
          onSaveHymn={handleSaveHymn}
          onDeleteOrResetHymn={handleDeleteOrResetHymn}
          onOpenRecordingStudio={() => {
            audioEngine.ensureReady();
            audioEngine.stopAll();
            setCurrentScreen('recording');
          }}
          onOpenScoreStudio={() => {
            audioEngine.ensureReady();
            audioEngine.stopAll();
            setCurrentScreen('scoreOcr');
          }}
          onOpenHummingModal={() => {
            audioEngine.ensureReady();
            audioEngine.stopAll();
            setIsHummingModalOpen(true);
          }}
        />
      ) : (
        /* Practice Screen: 1:1 Waterfall Kalimba View */
        <>
          <KalimbaGameWaterfall
            key={`${currentSong.id}-${restartCount}`}
            song={currentSong}
            difficulty={difficulty}
            speedPercent={speedPercent}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onRestart={handleRestart}
            onOpenExitModal={handleExitPractice}
            onChangeSpeed={setSpeedPercent}
            onChangeDifficulty={handleChangeDifficulty}
            onSongComplete={handleSongComplete}
          />

          {/* Completion Modal */}
          {showCompletionModal && (
            <CompletionModal
              song={currentSong}
              stats={lastCompletionStats}
              newlyUnlockedStickers={newlyUnlockedStickers}
              onReplay={() => {
                setShowCompletionModal(false);
                handleRestart();
              }}
              onNextSong={() => {
                setShowCompletionModal(false);
                const sameLevelSongs = allSongs.filter((s) => s.level === currentSong.level);
                const pool = sameLevelSongs.length > 0 ? sameLevelSongs : allSongs;
                const idx = pool.findIndex((s) => s.id === currentSong.id);
                const next = pool[(idx + 1) % pool.length];
                handleSelectSongAndStart(next, difficulty);
              }}
              onClose={() => {
                setShowCompletionModal(false);
                setCurrentScreen('select');
              }}
            />
          )}
        </>
      )}

      {/* STEP 02-G: 허밍 채보 및 AI 악보 변환 모달 */}
      <HummingTranscriptionModal
        isOpen={isHummingModalOpen}
        onClose={() => setIsHummingModalOpen(false)}
        onSaveSong={(songData) => {
          saveOrUpdateHymn({
            title: songData.title,
            subTitle: songData.subTitle,
            description: songData.description,
            tempoBpm: songData.tempoBpm,
            timeSignature: songData.timeSignature,
            rawNotation: songData.rawNotation,
          });
          const refreshed = getAllSongsWithCustomHymns();
          setAllSongs(refreshed);
          const savedSong = refreshed.find((s) => s.title === songData.title) || refreshed[refreshed.length - 1];
          if (savedSong) {
            handleSelectSongAndStart(savedSong, songData.difficulty);
          }
        }}
      />
    </div>
  );
}
