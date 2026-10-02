"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Percent,
  Search,
  Filter,
  Info,
} from "lucide-react";

interface ItemAnalysisViewProps {
  quiz: any;
  submissions: any[];
}

export function ItemAnalysisView({ quiz, submissions }: ItemAnalysisViewProps) {
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<"ALL" | "EASY" | "MODERATE" | "HARD">("ALL");

  const completedSubmissions = useMemo(() => {
    return submissions.filter((s) => s.hasSubmitted && s.answers && s.answers.length > 0);
  }, [submissions]);

  // Upper 27% and Lower 27% for Discrimination Index
  const { upperSubmissions, lowerSubmissions } = useMemo(() => {
    if (completedSubmissions.length < 3) {
      return { upperSubmissions: [], lowerSubmissions: [] };
    }
    const sorted = [...completedSubmissions].sort((a, b) => b.score - a.score);
    const groupSize = Math.max(1, Math.round(sorted.length * 0.27));
    return {
      upperSubmissions: sorted.slice(0, groupSize),
      lowerSubmissions: sorted.slice(sorted.length - groupSize),
    };
  }, [completedSubmissions]);

  // Compute item metrics
  const itemMetrics = useMemo(() => {
    const questions = (quiz?.questions || []).filter((q: any) => q.type !== "INSTRUCTION");
    const totalSub = completedSubmissions.length;

    return questions.map((q: any) => {
      // Find all answers for this question across completed submissions
      const qAnswers = completedSubmissions.map((s) =>
        s.answers.find((a: any) => a.questionId === q.id)
      ).filter(Boolean);

      const attemptsCount = qAnswers.length;
      const correctCount = qAnswers.filter((a: any) => a.isCorrect).length;
      const accuracyRate = attemptsCount > 0 ? (correctCount / attemptsCount) * 100 : 0;
      const difficulty = attemptsCount > 0 ? correctCount / attemptsCount : 0;

      // Discrimination Index: (Upper Correct Rate) - (Lower Correct Rate)
      let discriminationIndex: number | null = null;
      if (upperSubmissions.length > 0 && lowerSubmissions.length > 0) {
        const upperCorrect = upperSubmissions.filter((s) => {
          const ans = s.answers.find((a: any) => a.questionId === q.id);
          return ans?.isCorrect;
        }).length;
        const lowerCorrect = lowerSubmissions.filter((s) => {
          const ans = s.answers.find((a: any) => a.questionId === q.id);
          return ans?.isCorrect;
        }).length;

        const pu = upperCorrect / upperSubmissions.length;
        const pl = lowerCorrect / lowerSubmissions.length;
        discriminationIndex = pu - pl;
      }

      // Distractor Breakdown
      const optionCounts: Record<string, number> = {};
      if (Array.isArray(q.options) && q.options.length > 0) {
        q.options.forEach((opt: string) => {
          optionCounts[opt] = 0;
        });
      }

      qAnswers.forEach((a: any) => {
        const val = a.studentAnswer?.trim();
        if (val) {
          optionCounts[val] = (optionCounts[val] || 0) + 1;
        }
      });

      return {
        ...q,
        attemptsCount,
        correctCount,
        accuracyRate,
        difficulty,
        discriminationIndex,
        optionCounts,
      };
    });
  }, [quiz, completedSubmissions, upperSubmissions, lowerSubmissions]);

  const filteredItems = useMemo(() => {
    return itemMetrics.filter((item: any) => {
      const matchText =
        item.prompt.toLowerCase().includes(search.toLowerCase()) ||
        item.type.toLowerCase().includes(search.toLowerCase());

      if (!matchText) return false;

      if (filterDifficulty === "EASY") return item.difficulty >= 0.8;
      if (filterDifficulty === "MODERATE") return item.difficulty >= 0.5 && item.difficulty < 0.8;
      if (filterDifficulty === "HARD") return item.difficulty < 0.5;
      return true;
    });
  }, [itemMetrics, search, filterDifficulty]);

  // Overall Stats
  const avgAccuracy =
    itemMetrics.length > 0
      ? Math.round(itemMetrics.reduce((sum: number, item: any) => sum + item.accuracyRate, 0) / itemMetrics.length)
      : 0;

  const hardestItem = [...itemMetrics].sort((a, b) => a.accuracyRate - b.accuracyRate)[0];
  const bestDiscriminating = [...itemMetrics]
    .filter((i) => i.discriminationIndex !== null)
    .sort((a, b) => (b.discriminationIndex ?? -1) - (a.discriminationIndex ?? -1))[0];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flat-card p-4 bg-white border-2 border-slate-300">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Overall Test Accuracy</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{avgAccuracy}%</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Average correct rate across all questions</p>
        </div>

        <div className="flat-card p-4 bg-white border-2 border-slate-300">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Most Challenging Item</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg font-black text-rose-700 truncate">
            {hardestItem ? `Item #${hardestItem.orderIndex + 1}` : "--"}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {hardestItem ? `${Math.round(hardestItem.accuracyRate)}% correct rate` : "No submissions"}
          </p>
        </div>

        <div className="flat-card p-4 bg-white border-2 border-slate-300">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Best Discriminator</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-700 truncate">
            {bestDiscriminating ? `Item #${bestDiscriminating.orderIndex + 1}` : "--"}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {bestDiscriminating && bestDiscriminating.discriminationIndex !== null
              ? `D = ${bestDiscriminating.discriminationIndex.toFixed(2)} index`
              : "Need at least 3 submissions"}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions by prompt..."
            className="flat-input text-xs pl-9 w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
          <span>Difficulty:</span>
          {(["ALL", "EASY", "MODERATE", "HARD"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterDifficulty(mode)}
              className={`px-2.5 py-1 text-xs font-bold border transition-colors ${
                filterDifficulty === mode
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Questions Item Analysis List */}
      {completedSubmissions.length === 0 ? (
        <div className="flat-card p-12 text-center bg-white border border-slate-200">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-sm">No completed submissions yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Item difficulty and distractor analyses will automatically generate as students submit their exams.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flat-card p-8 text-center bg-white border border-slate-200">
          <p className="text-xs text-slate-500">No items match your filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item: any) => {
            const isEasy = item.difficulty >= 0.8;
            const isModerate = item.difficulty >= 0.5 && item.difficulty < 0.8;

            return (
              <div
                key={item.id}
                className="flat-card p-5 bg-white border-2 border-slate-200 hover:border-slate-400 transition-colors space-y-4"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        Item #{item.orderIndex + 1}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {item.type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {item.points} {item.points === 1 ? "point" : "points"}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{item.prompt}</p>
                  </div>

                  {/* Difficulty & Discrimination Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span
                        className={`text-xs font-black px-2.5 py-1 border ${
                          isEasy
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : isModerate
                            ? "bg-indigo-50 text-indigo-800 border-indigo-300"
                            : "bg-rose-50 text-rose-800 border-rose-300"
                        }`}
                      >
                        {Math.round(item.accuracyRate)}% Correct
                      </span>
                      <div className="text-[10px] text-slate-500 font-bold mt-1">
                        {isEasy ? "Easy Item" : isModerate ? "Optimal Item" : "Difficult Item"}
                      </div>
                    </div>

                    {item.discriminationIndex !== null && (
                      <div className="text-right pl-3 border-l border-slate-200">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-1 border ${
                            item.discriminationIndex >= 0.3
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : item.discriminationIndex >= 0.15
                              ? "bg-slate-50 text-slate-700 border-slate-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                          title="Difference in correct rate between top 27% and bottom 27% scorers"
                        >
                          D: {item.discriminationIndex.toFixed(2)}
                        </span>
                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                          {item.discriminationIndex >= 0.3
                            ? "High Discrim."
                            : item.discriminationIndex >= 0.15
                            ? "Fair Discrim."
                            : "Low Discrim."}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Answer Key & Distractor Option Distribution */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-700">Correct Answer Key:</span>
                    <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 font-bold">
                      {(item.correctAnswers || []).join(", ") || "None"}
                    </span>
                  </div>

                  {/* Option Choice Distribution */}
                  {Object.keys(item.optionCounts).length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Student Choice Distribution:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(item.optionCounts).map(([opt, count]) => {
                          const isCorrectChoice = (item.correctAnswers || []).includes(opt);
                          const pct = item.attemptsCount > 0 ? Math.round((Number(count) / item.attemptsCount) * 100) : 0;

                          return (
                            <div
                              key={opt}
                              className={`p-2 border text-xs flex items-center justify-between ${
                                isCorrectChoice
                                  ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold"
                                  : "bg-slate-50 border-slate-200 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                {isCorrectChoice ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <span className="w-3.5 h-3.5 shrink-0 text-slate-400 font-mono text-[10px] text-center">
                                    •
                                  </span>
                                )}
                                <span className="truncate">{opt}</span>
                              </div>
                              <span className="font-mono font-bold shrink-0 text-slate-600">
                                {Number(count)} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
