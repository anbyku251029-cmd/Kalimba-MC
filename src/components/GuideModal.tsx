import React from 'react';
import { X, CheckCircle, Lightbulb, Hand, Music, HelpCircle } from 'lucide-react';

interface GuideModalProps {
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border-4 border-emerald-300 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-emerald-800 mb-1">
          <HelpCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-black tracking-wider uppercase">초보자 & 학부모 가이드</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-amber-950 mb-3">
          우리 아이 칼림바 첫걸음 안내 📖
        </h2>

        <div className="space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
          {/* Section 1: Holding */}
          <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200">
            <h3 className="font-black text-amber-950 flex items-center gap-1.5 mb-1.5 text-sm sm:text-base">
              <Hand className="w-4 h-4 text-amber-700" />
              1. 칼림바 잡는 법과 연주법
            </h3>
            <ul className="space-y-1.5 list-disc list-inside text-stone-600">
              <li>칼림바의 양옆을 두 손바닥으로 편안하게 감싸 쥡니다.</li>
              <li>
                <strong>양손 엄지손가락</strong>만을 사용하여 건반을 위에서 아래로 가볍게 긁어내리듯 튕겨줍니다.
              </li>
              <li>
                손톱 끝으로 튕겨야 맑고 영롱한 <em>‘팅~’</em> 소리가 납니다. 손톱이 너무 짧으면 소리가 먹먹해질 수 있어요.
              </li>
            </ul>
          </div>

          {/* Section 2: Number Notation */}
          <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200">
            <h3 className="font-black text-emerald-950 flex items-center gap-1.5 mb-1.5 text-sm sm:text-base">
              <Music className="w-4 h-4 text-emerald-700" />
              2. 숫자 악보(간음표) 읽는 법
            </h3>
            <div className="grid grid-cols-4 gap-1.5 text-center my-2">
              <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                <span className="text-sm font-black text-stone-800">1</span>
                <span className="block text-[11px] text-stone-500 font-bold">도 (C)</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                <span className="text-sm font-black text-stone-800">2</span>
                <span className="block text-[11px] text-stone-500 font-bold">레 (D)</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                <span className="text-sm font-black text-stone-800">3</span>
                <span className="block text-[11px] text-stone-500 font-bold">미 (E)</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                <span className="text-sm font-black text-stone-800">4</span>
                <span className="block text-[11px] text-stone-500 font-bold">파 (F)</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                <span className="text-sm font-black text-stone-800">5</span>
                <span className="block text-[11px] text-stone-500 font-bold">솔 (G)</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                <span className="text-sm font-black text-stone-800">6</span>
                <span className="block text-[11px] text-stone-500 font-bold">라 (A)</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                <span className="text-sm font-black text-stone-800">7</span>
                <span className="block text-[11px] text-stone-500 font-bold">시 (B)</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                <span className="text-sm font-black text-stone-800">0</span>
                <span className="block text-[11px] text-stone-500 font-bold">쉼표 (쉬기)</span>
              </div>
            </div>
            <p className="text-[11px] text-stone-500">
              * 숫자 위에 점 1개(1̇, 2̇)가 있으면 <strong>높은 옥타브</strong>, 점 2개(1̈, 2̈)는 <strong>가장 높은 옥타브</strong>를 뜻해요.
            </p>
          </div>

          {/* Section 3: Left & Right Alternation */}
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
            <h3 className="font-black text-stone-900 flex items-center gap-1.5 mb-1.5 text-sm sm:text-base">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              3. 칼림바의 특별한 좌우 배치 비밀
            </h3>
            <p className="text-stone-600 mb-1">
              칼림바는 피아노처럼 한 방향으로 올라가지 않고, <strong>가운데 도(1)</strong>를 중심으로 좌우가 번갈아가며 높아집니다:
            </p>
            <p className="font-mono text-center text-xs bg-white p-2 rounded-xl border border-stone-200 text-stone-800 font-bold">
              ... 4 2 <span className="text-emerald-700 text-sm font-black underline">[1(도)]</span> 3 5 7 ...
              <br />
              (왼손 👈 | 가운데 | 👉 오른손)
            </p>
          </div>

          {/* Practice Tip */}
          <div className="flex items-start gap-2 text-stone-600 text-xs bg-amber-100/60 p-3 rounded-2xl">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              <strong>연습 꿀팁:</strong> 처음에는 속도를 <strong>60%나 70%</strong>로 느리게 맞추고, 프로그램 소리를 들으며 실제 칼림바를 하나씩 맞춰 튕겨보세요!
            </span>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="pt-4 mt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm cursor-pointer shadow-md transition active:scale-98"
          >
            확인했어요! 연습 시작하기
          </button>
        </div>
      </div>
    </div>
  );
};
