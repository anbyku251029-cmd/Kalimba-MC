import React from 'react';
import { Star, RotateCcw, ArrowRight, X, Sparkles } from 'lucide-react';
import { Song } from '../types/music';

interface CompletionModalProps {
  song: Song;
  onReplay: () => void;
  onNextSong?: () => void;
  onClose: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  song,
  onReplay,
  onNextSong,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border-4 border-amber-300 relative text-center">
        {/* Close Icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 transition cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Star Badge */}
        <div className="mx-auto w-20 h-20 bg-linear-to-tr from-amber-400 to-yellow-300 rounded-full flex items-center justify-center shadow-lg shadow-amber-300/50 mb-3 animate-bounce">
          <Star className="w-11 h-11 text-amber-950 fill-amber-950" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>끝까지 완주 성공!</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-amber-950 mb-1">
          &ldquo;{song.title}&rdquo; 완주 완료!
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 font-medium mb-4">
          축하해요! 곡의 처음부터 끝까지 모든 음을 들으며 연습했어요.
          <br />
          <strong className="text-emerald-700 font-bold">
            이제 실제 칼림바를 손에 쥐고 건반을 똑같이 튕겨보세요!
          </strong>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={onReplay}
            className="flex-1 py-3 px-4 rounded-2xl bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-950 font-black text-sm flex items-center justify-center space-x-1.5 transition cursor-pointer border border-amber-300"
          >
            <RotateCcw className="w-4 h-4 text-amber-800" />
            <span>한 번 더 연습하기</span>
          </button>

          {onNextSong && (
            <button
              onClick={onNextSong}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-md shadow-emerald-700/20"
            >
              <span>다음 곡으로</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
