import { useCallback, useEffect, useMemo, useState } from "react";
import { questions } from "./data/questions";
import { formatQuestionNumber, getLiveTriviaState } from "./lib/liveTrivia";
import { calculateScore } from "./lib/scoring";
import { loadStats, saveStats } from "./lib/storage";
import type { TriviaStats } from "./types";

type AnswerState =
  | { status: "idle" }
  | {
      status: "answered";
      selectedIndex: number | null;
      isCorrect: boolean;
      points: number;
      timeBonus: number;
      streakBonus: number;
    };

type LiveRunState = {
  score: number;
  streak: number;
  longestStreak: number;
  answered: number;
  correct: number;
  joinedAtMs: number;
};

const createInitialRun = (): LiveRunState => ({
  score: 0,
  streak: 0,
  longestStreak: 0,
  answered: 0,
  correct: 0,
  joinedAtMs: Date.now(),
});

function makeAnswerKey(questionNumber: number) {
  return questionNumber.toString();
}

function getVisualTone(questionId: string) {
  const tones = ["ember", "jade", "aqua", "gold", "violet", "steel"];
  const total = [...questionId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[total % tones.length];
}

export function App() {
  const [stats, setStats] = useState<TriviaStats>(() => loadStats());
  const [run, setRun] = useState<LiveRunState>(() => createInitialRun());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, AnswerState>>({});

  const liveState = useMemo(
    () => (questions.length > 0 ? getLiveTriviaState({ nowMs, pool: questions }) : null),
    [nowMs],
  );

  const answerKey = liveState ? makeAnswerKey(liveState.questionNumber) : "no-question";
  const answerState = answeredQuestions[answerKey] ?? { status: "idle" };

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const recordAnswer = useCallback(
    (selectedIndex: number | null, remainingSeconds: number) => {
      if (!liveState || answerState.status !== "idle") {
        return;
      }

      const isCorrect = selectedIndex === liveState.question.answerIndex;
      const scoreResult = calculateScore({
        isCorrect,
        timeRemaining: remainingSeconds,
        questionTime: liveState.totalSeconds,
        streak: run.streak,
      });
      const nextAnswerState: AnswerState = {
        status: "answered",
        selectedIndex,
        isCorrect,
        points: scoreResult.points,
        timeBonus: scoreResult.timeBonus,
        streakBonus: scoreResult.streakBonus,
      };

      setAnsweredQuestions((current) => {
        const entries = Object.entries({ ...current, [answerKey]: nextAnswerState });
        return Object.fromEntries(entries.slice(-60));
      });

      setRun((current) => {
        const nextStreak = scoreResult.nextStreak;
        const nextRun = {
          ...current,
          score: current.score + scoreResult.points,
          streak: nextStreak,
          longestStreak: Math.max(current.longestStreak, nextStreak),
          answered: current.answered + 1,
          correct: current.correct + (isCorrect ? 1 : 0),
        };

        const nextStats: TriviaStats = {
          ...stats,
          bestScore: Math.max(stats.bestScore, nextRun.score),
          totalAnswered: stats.totalAnswered + 1,
          totalCorrect: stats.totalCorrect + (isCorrect ? 1 : 0),
          longestStreak: Math.max(stats.longestStreak, nextRun.longestStreak),
          lastCategory: "all",
          lastDifficulty: "all",
        };
        setStats(nextStats);
        saveStats(nextStats);

        return nextRun;
      });
    },
    [answerKey, answerState.status, liveState, run.streak, stats],
  );

  useEffect(() => {
    if (!liveState || answerState.status !== "idle") {
      return undefined;
    }

    const timeout = window.setTimeout(
      () => recordAnswer(null, 0),
      Math.max(liveState.remainingSeconds * 1000 - 100, 0),
    );

    return () => window.clearTimeout(timeout);
  }, [answerState.status, liveState, recordAnswer]);

  if (!liveState) {
    return (
      <main className="app-shell">
        <article className="trivia-card empty-card">
          <header className="card-header">QUEUE TIME TRIVIA</header>
          <h1>Question bank is empty.</h1>
        </article>
      </main>
    );
  }

  const timerPercentage = (liveState.remainingSeconds / liveState.totalSeconds) * 100;
  const resultLabel = answerState.status === "answered"
    ? answerState.isCorrect
      ? "CORRECT"
      : "INCORRECT"
    : null;
  const visualTone = getVisualTone(liveState.question.id);

  return (
    <main className="app-shell">
      <article className={"trivia-card " + (answerState.status === "answered" ? "is-answered" : "")} aria-label="Queue time trivia">
        <header className="card-header">QUEUE TIME TRIVIA</header>

        <section className="question-stage">
          <h1>{liveState.question.prompt}</h1>
          <div className={"question-visual visual-" + visualTone} aria-hidden="true">
            <span className="visual-core" />
            <span className="visual-slash" />
            <span className="visual-spark one" />
            <span className="visual-spark two" />
          </div>
        </section>

        <section className="answers" aria-label="Answer choices">
          {liveState.question.choices.map((choice, index) => {
            const letter = String.fromCharCode(65 + index);
            const isSelected =
              answerState.status === "answered" && answerState.selectedIndex === index;
            const isCorrectAnswer =
              answerState.status === "answered" && liveState.question.answerIndex === index;
            const stateClass = isCorrectAnswer
              ? "answer-correct"
              : isSelected
                ? "answer-wrong"
                : "";

            return (
              <button
                aria-label={"Answer " + letter + ": " + choice}
                className={"answer-button " + stateClass}
                disabled={answerState.status === "answered"}
                key={choice}
                onClick={() => recordAnswer(index, liveState.remainingSeconds)}
                type="button"
              >
                <span className="answer-letter">{letter}</span>
                <span className="answer-copy">{choice}</span>
              </button>
            );
          })}
        </section>

        <section className="result-stage" aria-live="polite">
          {answerState.status === "answered" ? (
            <div className={answerState.isCorrect ? "result result-correct" : "result result-wrong"} role="status">
              <strong>{resultLabel}</strong>
              <span>+{answerState.points} TRIVIA POINTS</span>
            </div>
          ) : (
            <div className="timer-readout">
              <strong>0:{liveState.remainingSeconds.toString().padStart(2, "0")}</strong>
              <span>TIME REMAINING</span>
            </div>
          )}
          <div className="timer-track" aria-label={liveState.remainingSeconds + " seconds remaining"}>
            <div className="timer-fill" style={{ width: timerPercentage + "%" }} />
          </div>
        </section>

        <footer className="card-footer">
          <span>{formatQuestionNumber(liveState.questionNumber)}</span>
        </footer>
      </article>
    </main>
  );
}
