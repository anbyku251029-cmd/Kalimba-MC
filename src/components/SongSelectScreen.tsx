import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Music, Play, Sparkles, CheckCircle2, ChevronRight, Plus, Edit3, Search, Volume2, Square, Sliders, ClipboardCheck } from 'lucide-react';
import { Song } from '../types/music';
import { HymnEditorModal } from './HymnEditorModal';
import { SoundSettingsModal } from './SoundSettingsModal';
import { ValidationReportModal } from './ValidationReportModal';
import { StepLearningModal } from './StepLearningModal';
import { StickerRewardBoardModal } from './StickerRewardBoardModal';
import { ChildGrowthModal } from './ChildGrowthModal';
import { ParentDashboardModal } from './ParentDashboardModal';
import { audioEngine } from '../utils/audioEngine';

interface SongSelectScreenProps {
  songs: Song[];
  onSelectSong: (song: Song, difficulty: '쉬움' | '보통' | '어려움' | '찬송가') => void;
  completedSongIds: string[];
  onSaveHymn: (hymnData: {
    id?: string;
    hymnNumber?: number;
    title: string;
    subTitle?: string;
    description?: string;
    tempoBpm: number;
    timeSignature?: '4/4' | '3/4' | '2/4' | '6/8';
    rawNotation: string;
  }) => void;
  onDeleteOrResetHymn: (id: string) => void;
  onOpenRecordingStudio?: () => void;
  onOpenScoreStudio?: () => void;
}

type TabType = '쉬움' | '보통' | '어려움' | '찬송가' | '전체';

export const SongSelectScreen: React.FC<SongSelectScreenProps> = ({
  songs,
  onSelectSong,
  completedSongIds,
  onSaveHymn,
  onDeleteOrResetHymn,
  onOpenRecordingStudio,
  onOpenScoreStudio,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('쉬움');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isHymnModalOpen, setIsHymnModalOpen] = useState<boolean>(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState<boolean>(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState<boolean>(false);
  const [isChildGrowthOpen, setIsChildGrowthOpen] = useState<boolean>(false);
  const [isParentDashboardOpen, setIsParentDashboardOpen] = useState<boolean>(false);
  const [learningSong, setLearningSong] = useState<Song | null>(null);
  const [editingHymn, setEditingHymn] = useState<Song | null>(null);

  // 미리 듣기 상태 관리
  const [previewSongId, setPreviewSongId] = useState<string | null>(null);
  const previewTimerRef = useRef<number[]>([]);

  const stopPreview = () => {
    previewTimerRef.current.forEach((t) => clearTimeout(t));
    previewTimerRef.current = [];
    audioEngine.stopAll();
    setPreviewSongId(null);
  };

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  const handleTogglePreview = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();

    if (previewSongId === song.id) {
      stopPreview();
      return;
    }

    stopPreview();
    setPreviewSongId(song.id);
    audioEngine.ensureReady();

    const playableNotes = song.notes.slice(0, 16);
    let accumulatedBeats = 0;
    const beatSeconds = 60 / song.tempoBpm;

    playableNotes.forEach((n) => {
      if (!n.isRest && n.pitch !== 'REST') {
        const delayMs = accumulatedBeats * beatSeconds * 1000;
        const timerId = window.setTimeout(() => {
          audioEngine.playNote(n.pitch, n.duration, song.tempoBpm, 1.0);
        }, delayMs);
        previewTimerRef.current.push(timerId);
      }
      accumulatedBeats += n.duration;
    });

    const totalMs = accumulatedBeats * beatSeconds * 1000 + 400;
    const endTimer = window.setTimeout(() => {
      setPreviewSongId(null);
    }, totalMs);
    previewTimerRef.current.push(endTimer);
  };

  const counts = useMemo(() => {
    return {
      쉬움: songs.filter((s) => s.level === 'beginner').length,
      보통: songs.filter((s) => s.level === 'intermediate').length,
      어려움: songs.filter((s) => s.level === 'advanced').length,
      찬송가: songs.filter((s) => s.level === 'hymn').length,
    };
  }, [songs]);

  // Filter songs by tab and search query
  const displayedSongs = useMemo(() => {
    let list = songs;
    if (activeTab === '쉬움') {
      list = songs.filter((s) => s.level === 'beginner');
    } else if (activeTab === '보통') {
      list = songs.filter((s) => s.level === 'intermediate');
    } else if (activeTab === '어려움') {
      list = songs.filter((s) => s.level === 'advanced');
    } else if (activeTab === '찬송가') {
      list = songs.filter((s) => s.level === 'hymn');
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.subTitle && s.subTitle.toLowerCase().includes(q)) ||
        (s.hymnNumber && String(s.hymnNumber).includes(q)) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [songs, activeTab, searchQuery]);

  const tabConfigs: {
    key: '쉬움' | '보통' | '어려움' | '찬송가';
    label: string;
    levelName: string;
    icon: string;
    speed: string;
    desc: string;
    activeBg: string;
    activeBorder: string;
    activeText: string;
    badgeBg: string;
    unitLabel: string;
  }[] = [
    {
      key: '쉬움',
      label: '쉬움',
      levelName: '초급 30곡',
      icon: '🌱',
      speed: '속도 70%',
      desc: '가운데 도와 기초 건반 위주의 가장 쉬운 동요 30곡',
      activeBg: 'bg-emerald-500/20',
      activeBorder: 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]',
      activeText: 'text-emerald-300',
      badgeBg: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50',
      unitLabel: `초급 동요 ${counts.쉬움}곡`,
    },
    {
      key: '보통',
      label: '보통',
      levelName: '중급 30곡',
      icon: '🎵',
      speed: '속도 100%',
      desc: '친숙한 동요·민요·가곡과 양손 교차 대표곡 30곡',
      activeBg: 'bg-cyan-500/20',
      activeBorder: 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]',
      activeText: 'text-cyan-300',
      badgeBg: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/50',
      unitLabel: `중급 명곡 ${counts.보통}곡`,
    },
    {
      key: '어려움',
      label: '어려움',
      levelName: '고급 30곡',
      icon: '🚀',
      speed: '속도 130%',
      desc: '지브리 OST·클래식·영화음악 고난도 연주 30곡',
      activeBg: 'bg-purple-500/20',
      activeBorder: 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]',
      activeText: 'text-purple-300',
      badgeBg: 'bg-purple-500/30 text-purple-200 border-purple-400/50',
      unitLabel: `고급 명곡 ${counts.어려움}곡`,
    },
    {
      key: '찬송가',
      label: '찬송가',
      levelName: '업데이트 가능',
      icon: '✝️',
      speed: '속도 90%',
      desc: '은혜로운 새찬송가·복음성가 연주 및 새 찬송가 직접 추가/수정',
      activeBg: 'bg-amber-500/20',
      activeBorder: 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]',
      activeText: 'text-amber-300',
      badgeBg: 'bg-amber-500/30 text-amber-200 border-amber-400/50',
      unitLabel: `수록 찬송가 ${counts.찬송가}곡 (추가 가능)`,
    },
  ];

  const handleStartPractice = (song: Song, diffOverride?: '쉬움' | '보통' | '어려움' | '찬송가') => {
    stopPreview();
    const diff: '쉬움' | '보통' | '어려움' | '찬송가' =
      diffOverride ||
      (activeTab === '전체'
        ? song.level === 'beginner'
          ? '쉬움'
          : song.level === 'advanced'
          ? '어려움'
          : song.level === 'hymn'
          ? '찬송가'
          : '보통'
        : activeTab);
    onSelectSong(song, diff);
  };

  const handleOpenAddHymn = () => {
    stopPreview();
    setEditingHymn(null);
    setIsHymnModalOpen(true);
  };

  const handleOpenEditHymn = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    stopPreview();
    setEditingHymn(song);
    setIsHymnModalOpen(true);
  };

  return (
    <div className="relative w-full min-h-screen bg-[#0c0827] text-white flex flex-col justify-start overflow-y-auto select-none font-['Jua',sans-serif] p-4 sm:p-8">
      {/* Background Starry Sky Radial Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_15%,#1c1448_0%,#0c0827_85%)] pointer-events-none" />

      {/* Decorative stars */}
      <div className="fixed top-12 left-10 text-cyan-300/20 text-3xl pointer-events-none">✦</div>
      <div className="fixed top-24 right-16 text-amber-300/30 text-2xl pointer-events-none">⭐</div>
      <div className="fixed bottom-12 left-1/4 text-white/10 text-4xl pointer-events-none">✦</div>
      <div className="fixed bottom-20 right-1/4 text-purple-300/20 text-3xl pointer-events-none">✨</div>

      <div className="relative z-10 max-w-6xl w-full mx-auto flex flex-col space-y-6">
        {/* App Title & Header */}
        <header className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pt-2 pb-1 border-b border-white/10">
          <div className="flex items-center space-x-3.5">
            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-linear-to-tr from-cyan-500 via-sky-400 to-indigo-500 p-0.5 shadow-[0_0_20px_rgba(56,189,248,0.5)] flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#120f38] rounded-2xl flex items-center justify-center text-2xl sm:text-3xl">
                🎹
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-normal text-white drop-shadow-md">
                  우리 아이 칼림바 음악 교실
                </h1>
                <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold">
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                  <span>17음 C Major</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-cyan-200/70 mt-1 font-sans">
                단계별 30곡(초급·중급·고급)과 은혜로운 찬송가 카테고리를 선택해 첫 음부터 끝까지 따라 연주해 보세요!
              </p>
            </div>
          </div>

          {/* Quick Stats, Sound Settings, Validation Report, Hymn Update & Recording Studio Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenRecordingStudio && (
              <button
                onClick={() => {
                  stopPreview();
                  onOpenRecordingStudio();
                }}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-500/25 to-pink-500/25 hover:from-rose-500/40 hover:to-pink-500/40 border-2 border-rose-400 text-rose-100 text-xs sm:text-sm font-extrabold flex items-center space-x-2 shadow-[0_0_20px_rgba(244,63,94,0.35)] transition cursor-pointer active:scale-95 animate-pulse"
                title="어린이 가상 칼림바 자유 연주 녹음 및 WAV 다운로드 스튜디오 열기"
              >
                <span className="text-base sm:text-lg">🎙️</span>
                <span>나만의 녹음실</span>
              </button>
            )}

            {onOpenScoreStudio && (
              <button
                onClick={() => {
                  stopPreview();
                  onOpenScoreStudio();
                }}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-violet-500/25 to-indigo-500/25 hover:from-violet-500/40 hover:to-indigo-500/40 border-2 border-violet-400 text-violet-100 text-xs sm:text-sm font-extrabold flex items-center space-x-2 shadow-[0_0_20px_rgba(139,92,246,0.35)] transition cursor-pointer active:scale-95"
                title="악보 사진/이미지 업로드 및 음표 추출·수정 에디터 열기"
              >
                <span className="text-base sm:text-lg">📷</span>
                <span>악보 사진 등록</span>
              </button>
            )}

            <button
              onClick={() => setIsValidationModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/60 text-indigo-200 text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(99,102,241,0.25)] transition cursor-pointer active:scale-95"
              title="110곡 음악 데이터 무결성 및 마디 검증 리포트 열기"
            >
              <ClipboardCheck className="w-4 h-4 text-indigo-300 stroke-[2.5]" />
              <span>데이터 검증</span>
            </button>

            <button
              onClick={() => setIsSoundSettingsOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-200 text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(34,211,238,0.25)] transition cursor-pointer active:scale-95"
            >
              <Sliders className="w-4 h-4 text-cyan-300 stroke-[2.5]" />
              <span>사운드 / 음색 설정</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('찬송가');
                handleOpenAddHymn();
              }}
              className="px-3.5 py-2 rounded-2xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/60 text-amber-200 text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(251,191,36,0.25)] transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-300 stroke-[3]" />
              <span>찬송가 업데이트 / 추가</span>
            </button>

            {/* 구구가가 스티커 보상판 버튼 */}
            <button
              onClick={() => setIsRewardModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-linear-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-400/60 text-pink-200 text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(244,114,182,0.25)] transition cursor-pointer active:scale-95"
              title="마디 연습 구구가가 10종 스티커 보상판 열기"
            >
              <span className="text-base">🎨</span>
              <span>구구가가 스티커 보상판</span>
            </button>

            {/* 어린이용 성장 기록 버튼 */}
            <button
              onClick={() => setIsChildGrowthOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/40 hover:to-teal-500/40 border-2 border-emerald-400/70 text-emerald-100 text-xs sm:text-sm font-extrabold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition cursor-pointer active:scale-95"
              title="오늘의 연습 시간과 목표 달성 성장 기록 확인하기"
            >
              <span className="text-base">🌱</span>
              <span>나의 성장 기록</span>
            </button>

            {/* 학부모 대시보드 버튼 */}
            <button
              onClick={() => setIsParentDashboardOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-indigo-500/25 to-blue-500/25 hover:from-indigo-500/40 hover:to-blue-500/40 border-2 border-indigo-400/70 text-indigo-100 text-xs sm:text-sm font-extrabold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition cursor-pointer active:scale-95"
              title="학부모 학습 대시보드 (주간 그래프, 완주 곡 수, 통계)"
            >
              <span className="text-base">📊</span>
              <span>학부모 대시보드</span>
            </button>

            <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl shadow-inner">
              <div className="flex items-center space-x-1.5 text-amber-300 text-sm font-bold">
                <span>⭐</span>
                <span>완주 {completedSongIds.length}곡</span>
              </div>
              <span className="text-white/20">|</span>
              <div className="text-cyan-200 text-sm font-bold">
                총 {songs.length}곡 수록
              </div>
            </div>
          </div>
        </header>

        {/* 4 Category Tabs */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-base sm:text-lg font-bold text-cyan-100 flex items-center space-x-1.5">
              <span>🎯</span>
              <span>연습할 단계 또는 찬송가 카테고리를 선택해 주세요</span>
            </h2>
            <span className="text-xs text-white/50 hidden sm:inline">
              각 단계별 30곡씩 수록되어 있으며, 찬송가는 직접 추가·업데이트할 수 있습니다
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {tabConfigs.map((tab) => {
              const isSelected = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between relative active:scale-98 ${
                    isSelected
                      ? `${tab.activeBg} ${tab.activeBorder} scale-101 ring-2 ring-white/30`
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl sm:text-3xl">{tab.icon}</span>
                      <div>
                        <span className="text-xl sm:text-2xl font-black text-white">{tab.label}</span>
                        <span className="block text-[11px] font-bold text-white/60">({tab.levelName})</span>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${tab.badgeBg}`}>
                      {tab.speed}
                    </span>
                  </div>

                  <p className="text-xs text-cyan-100/80 mb-2 font-sans line-clamp-2">
                    {tab.desc}
                  </p>

                  <div className="flex items-center justify-between text-xs text-white/50 pt-2 border-t border-white/10 w-full">
                    <span>{tab.unitLabel}</span>
                    {isSelected && (
                      <span className={`font-bold ${tab.activeText} flex items-center space-x-0.5`}>
                        <span>선택됨</span>
                        <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Song Cards Section */}
        <div className="flex flex-col space-y-3 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {activeTab === '찬송가' ? '✝️ 찬송가 & 복음성가 목록' : `${activeTab} 단계 곡 목록`} ({displayedSongs.length}곡)
              </h3>
              <span className="text-xs bg-white/10 text-cyan-200 px-2.5 py-0.5 rounded-full font-bold">
                연습 시작하기 클릭 시 첫 음부터 시작
              </span>

              {activeTab === '찬송가' && (
                <button
                  onClick={handleOpenAddHymn}
                  className="px-3 py-1 rounded-full bg-linear-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-[#141036] text-xs font-black flex items-center space-x-1 shadow-[0_0_12px_rgba(251,191,36,0.4)] transition cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>새 찬송가 악보 추가하기</span>
                </button>
              )}
            </div>

            {/* Search Input & All songs filter toggle */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="곡 제목 또는 찬송가 장수 검색..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-xs sm:text-sm text-white placeholder-white/40 focus:border-cyan-400 focus:outline-hidden font-sans"
                />
              </div>

              <button
                onClick={() => setActiveTab(activeTab === '전체' ? '쉬움' : '전체')}
                className={`text-xs px-3 py-1.5 rounded-full border transition cursor-pointer font-bold shrink-0 ${
                  activeTab === '전체'
                    ? 'bg-cyan-500 text-[#12163a] border-cyan-400 font-extrabold shadow-sm'
                    : 'bg-white/5 text-white/70 border-white/15 hover:bg-white/10 hover:text-white'
                }`}
              >
                전체 {songs.length}곡 보기
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {displayedSongs.map((song, idx) => {
              const isCompleted = completedSongIds.includes(song.id);
              const isHymn = song.level === 'hymn';
              const isHighlighted = song.id === 'beginner-4' || song.id === 'hymn-305';
              const isPreviewing = previewSongId === song.id;

              const songDifficulty: '쉬움' | '보통' | '어려움' | '찬송가' =
                activeTab === '전체'
                  ? song.level === 'beginner'
                    ? '쉬움'
                    : song.level === 'advanced'
                    ? '어려움'
                    : song.level === 'hymn'
                    ? '찬송가'
                    : '보통'
                  : activeTab;

              const playableCount = song.notes.filter((n) => !n.isRest && n.pitch !== 'REST').length;
              const totalBeats = song.notes.reduce((acc, n) => acc + (n.duration || 0), 0);
              const totalSec = Math.round((totalBeats / song.tempoBpm) * 60);
              const formattedDuration = totalSec >= 60 ? `${Math.floor(totalSec / 60)}분 ${totalSec % 60}초` : `${totalSec}초`;

              return (
                <div
                  key={song.id}
                  onClick={() => handleStartPractice(song, songDifficulty)}
                  className={`group relative rounded-2xl border-2 p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-cyan-500/20 active:scale-98 ${
                    isHymn
                      ? 'bg-linear-to-b from-[#231b42] to-[#141030] border-amber-400/40 hover:border-amber-400/80'
                      : isHighlighted
                      ? 'bg-linear-to-b from-[#18234d] to-[#12163a] border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.25)] ring-2 ring-cyan-400/30'
                      : 'bg-white/5 border-white/10 hover:border-cyan-400/50 hover:bg-white/10'
                  }`}
                >
                  {/* Top: Icon, Title, and Subtitle */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border font-extrabold text-xs ${
                            isHymn
                              ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                              : isHighlighted
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                              : 'bg-white/10 border-white/20 text-cyan-200'
                          }`}
                        >
                          {isHymn && song.hymnNumber ? (
                            <span>{song.hymnNumber}장</span>
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-lg sm:text-xl font-black text-white group-hover:text-cyan-300 transition leading-tight">
                              {song.title}
                            </h4>
                            {song.isCustom && (
                              <span className="text-[10px] bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full font-bold">
                                직접 추가됨
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-cyan-200/60 font-sans mt-0.5 line-clamp-1">
                            {song.subTitle || song.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {isHymn && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditHymn(e, song)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-amber-400 hover:text-[#141036] text-amber-200 transition cursor-pointer"
                            title="이 찬송가 악보 수정/업데이트"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isCompleted && (
                          <div className="flex items-center space-x-1 text-amber-400 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>완주</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Song Specs: Note count, Tempo, Duration */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-xs text-white/70">
                      <span className="bg-white/10 px-2 py-0.5 rounded-md font-bold text-cyan-200">
                        총 {playableCount}음
                      </span>
                      <span className="bg-white/10 px-2 py-0.5 rounded-md font-bold text-white/80">
                        ⏱️ {formattedDuration}
                      </span>
                      <span className="bg-white/10 px-2 py-0.5 rounded-md font-bold text-white/80">
                        {song.tempoBpm} BPM
                      </span>
                      {song.tags && song.tags[0] && (
                        <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-[11px] text-white/60">
                          {song.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Preview, Step Learning & Play Buttons */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePreview(e, song)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition cursor-pointer border ${
                        isPreviewing
                          ? 'bg-amber-400 text-amber-950 border-amber-300 animate-pulse font-black'
                          : 'bg-white/8 hover:bg-white/15 text-white/85 hover:text-white border-white/15'
                      }`}
                      title={isPreviewing ? '미리 듣기 정지' : '앞부분 소리 미리 듣기'}
                    >
                      {isPreviewing ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>정지하기</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
                          <span>먼저 듣기</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLearningSong(song);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/40 text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                      title="어린이 5단계 맞춤 학습 열기"
                    >
                      <span>🌱</span>
                      <span>단계별 학습</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartPractice(song, songDifficulty);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center space-x-1.5 transition cursor-pointer active:scale-95 ${
                        isHymn
                          ? 'bg-linear-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-[#141036] shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                          : 'bg-linear-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-[#0c0827] shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>연습 시작하기</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search Empty State */}
          {displayedSongs.length === 0 && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 my-4">
              <span className="text-5xl sm:text-6xl animate-bounce">🔍</span>
              <div className="space-y-1">
                <h4 className="text-xl sm:text-2xl font-black text-white">
                  앗! 찾으시는 곡이 없어요
                </h4>
                <p className="text-sm text-cyan-200/70 max-w-md font-sans">
                  "{searchQuery}"에 해당하는 곡을 찾지 못했어요. 철자를 확인하거나 다른 제목으로 검색해 보세요!
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold transition cursor-pointer border border-white/20"
                >
                  검색어 지우기
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveTab('전체');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0c0827] text-xs sm:text-sm font-black transition cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                >
                  모든 곡 보기 ({songs.length}곡)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Helpful Tips Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-cyan-100 text-xs sm:text-sm">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">💡</span>
            <div>
              <strong className="text-white block font-bold text-sm sm:text-base">
                사운드 설정 안내: 상단 [사운드 / 음색 설정]으로 나만의 칼림바 소리를 맞춰보세요!
              </strong>
              <span className="text-cyan-200/70 font-sans">
                기본 칼림바, 맑은 크리스탈, 포근한 목재 울림 등 3가지 음색과 공간감 잔향을 실시간으로 변경할 수 있습니다.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hymn Add / Update Modal */}
      {isHymnModalOpen && (
        <HymnEditorModal
          initialSong={editingHymn}
          onSave={(data) => {
            onSaveHymn(data);
            setIsHymnModalOpen(false);
            setEditingHymn(null);
            setActiveTab('찬송가');
          }}
          onDeleteOrReset={(id) => {
            onDeleteOrResetHymn(id);
            setIsHymnModalOpen(false);
            setEditingHymn(null);
          }}
          onClose={() => {
            setIsHymnModalOpen(false);
            setEditingHymn(null);
          }}
        />
      )}

      {/* Sound Settings Modal */}
      {isSoundSettingsOpen && (
        <SoundSettingsModal onClose={() => setIsSoundSettingsOpen(false)} />
      )}

      {/* Music Validation Report Modal */}
      {isValidationModalOpen && (
        <ValidationReportModal songs={songs} onClose={() => setIsValidationModalOpen(false)} />
      )}

      {/* Step Learning Modal */}
      {learningSong && (
        <StepLearningModal
          song={learningSong}
          onClose={() => setLearningSong(null)}
          onStartFullPractice={(s, speed) => {
            setLearningSong(null);
            const songDifficulty: '쉬움' | '보통' | '어려움' | '찬송가' =
              s.level === 'beginner'
                ? '쉬움'
                : s.level === 'advanced'
                ? '어려움'
                : s.level === 'hymn'
                ? '찬송가'
                : '보통';
            onSelectSong(s, songDifficulty);
          }}
        />
      )}

      {/* GuGuGaGa Sticker Reward Board Modal */}
      <StickerRewardBoardModal
        isOpen={isRewardModalOpen}
        onClose={() => setIsRewardModalOpen(false)}
      />

      {/* 어린이용 성장 기록 모달 */}
      {isChildGrowthOpen && (
        <ChildGrowthModal onClose={() => setIsChildGrowthOpen(false)} />
      )}

      {/* 학부모 학습 대시보드 모달 */}
      {isParentDashboardOpen && (
        <ParentDashboardModal onClose={() => setIsParentDashboardOpen(false)} />
      )}
    </div>
  );
};
