import React, { useState, useMemo } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, RefreshCw, FileText, ChevronRight } from 'lucide-react';
import { Song } from '../types/music';
import { validateCatalog } from '../utils/musicValidator';
import { CatalogValidationSummary, SongValidationReport } from '../types/musicValidationTypes';

interface ValidationReportModalProps {
  songs: Song[];
  onClose: () => void;
}

export const ValidationReportModal: React.FC<ValidationReportModalProps> = ({ songs, onClose }) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'REVIEW' | 'FAIL'>('ALL');
  const [selectedReport, setSelectedReport] = useState<SongValidationReport | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 실시간 검증 실행
  const [summary, setSummary] = useState<CatalogValidationSummary>(() => validateCatalog(songs));

  const handleRevalidate = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSummary(validateCatalog(songs));
      setIsRefreshing(false);
    }, 250);
  };

  const filteredReports = useMemo(() => {
    if (filterStatus === 'ALL') return summary.reports;
    return summary.reports.filter((r) => r.status === filterStatus);
  }, [summary.reports, filterStatus]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs font-['Jua',sans-serif]">
      <div className="bg-[#141036] border-2 border-cyan-400/50 rounded-3xl max-w-4xl w-full p-5 sm:p-7 text-white shadow-[0_0_50px_rgba(6,182,212,0.3)] relative my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-2xl">
              📋
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-cyan-300 flex items-center gap-2">
                <span>음악 데이터 자동 검증 리포트</span>
                <span className="text-xs bg-cyan-500/30 text-cyan-200 px-2.5 py-0.5 rounded-full border border-cyan-400/40">
                  STEP 01-B 엔진
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-white/60 font-sans">
                17음 C Major 칼림바 호환성, 음표 유효성 및 마디 박자를 실시간 검사합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRevalidate}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-200 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
              title="다시 검사하기"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>다시 검사</span>
            </button>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Badges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 py-4 shrink-0 font-sans">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-xs text-white/60 font-bold">전체 검사 곡</span>
            <span className="text-2xl font-black text-white mt-0.5">{summary.totalSongs}곡</span>
            <span className="text-[11px] text-white/40">초급30 / 중급30 / 고급30 / 찬송가20</span>
          </div>

          <div
            onClick={() => setFilterStatus('PASS')}
            className={`cursor-pointer rounded-2xl p-3 flex flex-col items-center border transition ${
              filterStatus === 'PASS'
                ? 'bg-emerald-500/25 border-emerald-400 ring-2 ring-emerald-400/50'
                : 'bg-emerald-500/10 border-emerald-400/30 hover:bg-emerald-500/20'
            }`}
          >
            <span className="text-xs text-emerald-300 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> 통과 (PASS)
            </span>
            <span className="text-2xl font-black text-emerald-300 mt-0.5">
              {summary.statusCounts.PASS}곡
            </span>
            <span className="text-[11px] text-emerald-400/70">마디·음역 100% 완전 일치</span>
          </div>

          <div
            onClick={() => setFilterStatus('REVIEW')}
            className={`cursor-pointer rounded-2xl p-3 flex flex-col items-center border transition ${
              filterStatus === 'REVIEW'
                ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50'
                : 'bg-amber-500/10 border-amber-400/30 hover:bg-amber-500/20'
            }`}
          >
            <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> 검토 (REVIEW)
            </span>
            <span className="text-2xl font-black text-amber-300 mt-0.5">
              {summary.statusCounts.REVIEW}곡
            </span>
            <span className="text-[11px] text-amber-400/70">마디 박자 대조 권장</span>
          </div>

          <div
            onClick={() => setFilterStatus('FAIL')}
            className={`cursor-pointer rounded-2xl p-3 flex flex-col items-center border transition ${
              filterStatus === 'FAIL'
                ? 'bg-red-500/25 border-red-400 ring-2 ring-red-400/50'
                : 'bg-red-500/10 border-red-400/30 hover:bg-red-500/20'
            }`}
          >
            <span className="text-xs text-red-300 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> 오류 (FAIL)
            </span>
            <span className="text-2xl font-black text-red-300 mt-0.5">
              {summary.statusCounts.FAIL}곡
            </span>
            <span className="text-[11px] text-red-400/70">치명적 데이터 오류</span>
          </div>
        </div>

        {/* Content Area: List & Detail View */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden pt-1 font-sans">
          {/* Left Column: Song Report List */}
          <div className="flex flex-col border border-white/10 rounded-2xl bg-black/30 overflow-hidden">
            <div className="p-3 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs font-bold text-white/70">
              <span>
                검사 대상 곡 목록 ({filteredReports.length}곡)
                {filterStatus !== 'ALL' && ` [필터: ${filterStatus}]`}
              </span>
              {filterStatus !== 'ALL' && (
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className="text-cyan-300 hover:underline cursor-pointer"
                >
                  전체 보기
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-1">
              {filteredReports.map((report) => (
                <div
                  key={report.songId}
                  onClick={() => setSelectedReport(report)}
                  className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition ${
                    selectedReport?.songId === report.songId
                      ? 'bg-cyan-500/20 border border-cyan-400/50'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    {report.status === 'PASS' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : report.status === 'REVIEW' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                        <span>{report.title}</span>
                        <span className="text-[10px] text-white/40">({report.songId})</span>
                      </div>
                      <div className="text-[11px] text-white/50 flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-white/10 text-white/70">
                          {report.category}
                        </span>
                        <span>{report.timeSignature}</span>
                        <span>{report.tempoBpm} BPM</span>
                        <span>{report.playableNotes}음</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Song Details */}
          <div className="flex flex-col border border-white/10 rounded-2xl bg-black/30 p-4 overflow-y-auto">
            {selectedReport ? (
              <div className="space-y-4">
                <div className="pb-3 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">곡별 상세 검증 리포트</span>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                        selectedReport.status === 'PASS'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                          : selectedReport.status === 'REVIEW'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                          : 'bg-red-500/20 text-red-300 border-red-400/50'
                      }`}
                    >
                      {selectedReport.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">{selectedReport.title}</h3>
                  <p className="text-xs text-white/50 font-mono">ID: {selectedReport.songId}</p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <span className="text-white/50 block">연주 음표 / 쉼표</span>
                    <span className="text-white font-bold text-sm">
                      {selectedReport.playableNotes}음 / {selectedReport.restNotes}개
                    </span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <span className="text-white/50 block">총 비트 / 예상 시간</span>
                    <span className="text-white font-bold text-sm">
                      {selectedReport.totalBeats}박 ({selectedReport.calculatedSeconds}초)
                    </span>
                  </div>
                </div>

                {/* Rule Checklist */}
                <div>
                  <h4 className="text-xs font-bold text-white/80 mb-2">검증 규칙 수행 결과</h4>
                  <div className="space-y-1.5">
                    {selectedReport.ruleSummaries.map((rule, idx) => (
                      <div
                        key={idx}
                        className="bg-white/5 p-2 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          {rule.passed ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="font-bold text-white/90">{rule.ruleName}</span>
                        </div>
                        <span className="text-[11px] text-white/50">{rule.notes}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Errors / Reviews */}
                {selectedReport.errors.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-300 mb-2">
                      검토 필요 항목 ({selectedReport.errors.length}건)
                    </h4>
                    <div className="space-y-2">
                      {selectedReport.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>⚠️ {err.code}</span>
                            {err.measureNumber && <span>마디 #{err.measureNumber}</span>}
                          </div>
                          <p className="mt-1 text-white/80">{err.message}</p>
                          {err.recommendation && (
                            <p className="mt-1 text-[11px] text-amber-300/80">
                              💡 권장: {err.recommendation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/40 space-y-2">
                <FileText className="w-10 h-10 stroke-[1.5]" />
                <p className="text-sm font-bold">좌측 목록에서 곡을 선택하면</p>
                <p className="text-xs">상세 마디 박자 및 음역 검증 결과를 확인할 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40 shrink-0 font-sans">
          <span>* 검증 엔진은 원본 악보 데이터를 일체 변경하지 않고 읽기 전용으로 안전하게 분석합니다.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
