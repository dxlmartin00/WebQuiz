"use client";

import React, { useState, useEffect } from "react";
import { Copy, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";

interface DuplicateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: { id: string; title: string; subjectId: string } | null;
  onDuplicated: () => void;
}

export function DuplicateQuizModal({
  isOpen,
  onClose,
  quiz,
  onDuplicated,
}: DuplicateQuizModalProps) {
  const toast = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [targetSubjectId, setTargetSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    if (!isOpen || !quiz) return;

    setTitle(`${quiz.title} (Copy)`);

    async function loadSubjects() {
      try {
        setLoadingSubjects(true);
        const res = await fetch("/api/teacher/subjects");
        if (!res.ok) throw new Error("Failed to load classes");
        const json = await res.json();
        const list = json.subjects || [];
        setSubjects(list);
        if (list.length > 0) {
          // Default to first subject, or different subject if available
          const other = list.find((s: any) => s.id !== quiz?.subjectId) || list[0];
          setTargetSubjectId(other.id);
        }
      } catch (err: any) {
        toast.error("Error", "Could not load class rosters.");
      } finally {
        setLoadingSubjects(false);
      }
    }

    loadSubjects();
  }, [isOpen, quiz]);

  if (!isOpen || !quiz) return null;

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSubjectId) {
      toast.error("Selection Required", "Please select a target class.");
      return;
    }

    try {
      setDuplicating(true);
      const res = await fetch(`/api/teacher/quizzes/${quiz.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSubjectId,
          title: title.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to duplicate quiz");

      toast.success("Quiz Duplicated", json.message || "Quiz copied successfully as a draft.");
      onDuplicated();
      onClose();
    } catch (err: any) {
      toast.error("Duplication Failed", err.message);
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border-2 border-slate-900 rounded-none shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Copy className="w-4 h-4 text-indigo-600" />
            <span>Duplicate Quiz to Another Class</span>
          </div>
          <button
            onClick={onClose}
            disabled={duplicating}
            className="text-slate-400 hover:text-slate-700 p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleDuplicate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Destination Class / Subject
            </label>
            {loadingSubjects ? (
              <div className="text-xs text-slate-500 py-2">Loading classes...</div>
            ) : (
              <select
                value={targetSubjectId}
                onChange={(e) => setTargetSubjectId(e.target.value)}
                disabled={duplicating}
                className="flat-input text-xs w-full font-medium"
                required
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.subjectCode} — {sub.title}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-500">
              All questions, grading criteria, and settings will be copied into this class.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              New Quiz Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={duplicating}
              className="flat-input text-xs w-full"
              placeholder="e.g. Midterm Exam - Section B"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={duplicating}
              className="flat-button-secondary text-xs py-2 px-3 text-slate-600 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={duplicating || loadingSubjects}
              className="flat-button-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
            >
              {duplicating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Duplicating...</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate Quiz</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
