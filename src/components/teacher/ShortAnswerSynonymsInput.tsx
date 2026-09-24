"use client";

import React, { useState, useEffect } from "react";

interface ShortAnswerSynonymsInputProps {
  correctAnswers: string[];
  onChange: (answers: string[]) => void;
  placeholder?: string;
  required?: boolean;
}

/**
 * Robust input component for Short Answer / Identification questions.
 * Eliminates the space-key swallowing bug by maintaining raw input in local state,
 * while broadcasting parsed synonym arrays and rendering real-time chip badges.
 */
export function ShortAnswerSynonymsInput({
  correctAnswers,
  onChange,
  placeholder = "e.g. Move Tool, V, Pointer (separate synonyms with commas)",
  required = true,
}: ShortAnswerSynonymsInputProps) {
  const [text, setText] = useState(() => correctAnswers.join(", "));
  const [isFocused, setIsFocused] = useState(false);

  // Sync if parent updates externally (e.g. initial fetch or docx import)
  useEffect(() => {
    if (!isFocused) {
      setText(correctAnswers.join(", "));
    }
  }, [correctAnswers, isFocused]);

  const parseSynonyms = (raw: string): string[] => {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    const parsed = parseSynonyms(val);
    // Broadcast parsed answers; if user is typing the first answer, broadcast trimmed value or empty
    onChange(parsed.length > 0 ? parsed : val.trim() ? [val.trim()] : []);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseSynonyms(text);
    onChange(parsed);
    setText(parsed.join(", "));
  };

  const parsedTags = parseSynonyms(text);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={text}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onChange={handleTextChange}
        placeholder={placeholder}
        className="flat-input text-xs font-medium"
        required={required}
      />
      
      {/* Real-time recognized answers badge list */}
      {parsedTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] uppercase font-bold text-indigo-900 tracking-wider">
            Recognized Answers ({parsedTags.length}):
          </span>
          {parsedTags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-900 border border-indigo-300 font-mono text-[11px] font-bold shadow-2xs"
            >
              <span className="text-indigo-400 font-normal">#{idx + 1}</span>
              <span>{tag}</span>
            </span>
          ))}
        </div>
      ) : (
        <span className="text-[11px] text-amber-700 font-medium block">
          ⚠️ Please type at least one acceptable answer key (use commas to separate multiple valid answers).
        </span>
      )}
    </div>
  );
}
