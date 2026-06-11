import { useCallback, useEffect, useMemo, useState } from "react";
import { questions } from "./data/questions";
import { formatQuestionNumber, getLiveTriviaState } from "./lib/liveTrivia";
import { calculateScore } from "./lib/scoring";
import { loadStats, saveStats } from "./lib/storage";
import type { TriviaStats } from "./types";

const ANSWER_SECONDS = 15;
const REVEAL_SECONDS = 5;
const QUESTION_CYCLE_SECONDS = ANSWER_SECONDS + REVEAL_SECONDS;

type AnswerState =
  | { status: "idle" }
  | { status: "locked"; selectedIndex: number; remainingSecondsAtLock: number }
  | {
      status: "revealed";
      selectedIndex: number;
      isCorrect: boolean;
      points: number;
      timeBonus: number;
      streakBonus: number;
    }
  | {
      status: "timed-out";
      points: 0;
      timeBonus: 0;
      streakBonus: 0;
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
    () =>
      questions.length > 0
        ? getLiveTriviaState({ nowMs, pool: questions, questionSeconds: QUESTION_CYCLE_SECONDS })
        : null,
    [nowMs],
  );

  const answerRemainingSeconds = liveState
    ? Math.max(liveState.remainingSeconds - REVEAL_SECONDS, 0)
    : 0;
  const answerKey = liveState ? makeAnswerKey(liveState.questionNumber) : "no-question";
  const answerState = useMemo<AnswerState>(
    () => answeredQuestions[answerKey] ?? { status: "idle" },
    [answeredQuestions, answerKey],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const storeAnswerState = useCallback(
    (nextAnswerState: AnswerState) => {
      setAnsweredQuestions((current) => {
        const entries = Object.entries({ ...current, [answerKey]: nextAnswerState });
        return Object.fromEntries(entries.slice(-60));
      });
    },
    [answerKey],
  );

  const completeQuestion = useCallback(
    (nextAnswerState: Exclude<AnswerState, { status: "idle" } | { status: "locked" }>, isCorrect: boolean) => {
      const points = nextAnswerState.points;
      const nextStreak = nextAnswerState.status === "revealed" && isCorrect ? run.streak + 1 : 0;

      storeAnswerState(nextAnswerState);

      setRun((current) => {
        const nextRun = {
          ...current,
          score: current.score + points,
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
    [run.streak, stats, storeAnswerState],
  );

  const lockAnswer = useCallback(
    (selectedIndex: number, remainingSeconds: number) => {
      if (!liveState || answerState.status !== "idle") {
        return;
      }

      storeAnswerState({
        status: "locked",
        selectedIndex,
        remainingSecondsAtLock: remainingSeconds,
      });
    },
    [answerState.status, liveState, storeAnswerState],
  );

  const revealLockedAnswer = useCallback(() => {
    if (!liveState || answerState.status !== "locked") {
      return;
    }

    const isCorrect = answerState.selectedIndex === liveState.question.answerIndex;
    const scoreResult = calculateScore({
      isCorrect,
      timeRemaining: answerState.remainingSecondsAtLock,
      questionTime: ANSWER_SECONDS,
      streak: run.streak,
    });

    completeQuestion(
      {
        status: "revealed",
        selectedIndex: answerState.selectedIndex,
        isCorrect,
        points: scoreResult.points,
        timeBonus: scoreResult.timeBonus,
        streakBonus: scoreResult.streakBonus,
      },
      isCorrect,
    );
  }, [answerState, completeQuestion, liveState, run.streak]);

  const recordTimeout = useCallback(() => {
    if (!liveState || answerState.status !== "idle") {
      return;
    }

    completeQuestion(
      {
        status: "timed-out",
        points: 0,
        timeBonus: 0,
        streakBonus: 0,
      },
      false,
    );
  }, [answerState.status, completeQuestion, liveState]);

  useEffect(() => {
    if (!liveState || answerState.status === "revealed" || answerState.status === "timed-out") {
      return undefined;
    }

    const timeout = window.setTimeout(
      () => {
        if (answerState.status === "locked") {
          revealLockedAnswer();
          return;
        }

        recordTimeout();
      },
      Math.max(answerRemainingSeconds * 1000, 0),
    );

    return () => window.clearTimeout(timeout);
  }, [answerRemainingSeconds, answerState.status, liveState, recordTimeout, revealLockedAnswer]);

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

  const isLocked = answerState.status === "locked";
  const isRevealed = answerState.status === "revealed" || answerState.status === "timed-out";
  const isDisabled = isLocked || isRevealed;
  const resultLabel = answerState.status === "timed-out"
    ? "NO ANSWER SUBMITTED"
    : answerState.status === "revealed"
      ? answerState.isCorrect
        ? "CORRECT"
        : "INCORRECT"
      : null;
  const visualTone = getVisualTone(liveState.question.id);

  return (
    <main className="app-shell">
      <article className={"trivia-card " + (isRevealed ? "is-answered" : "")} aria-label="Queue time trivia">
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
              (answerState.status === "locked" || answerState.status === "revealed") &&
              answerState.selectedIndex === index;
            const isCorrectAnswer =
              isRevealed && liveState.question.answerIndex === index;
            const stateClass = isCorrectAnswer
              ? "answer-correct"
              : answerState.status === "revealed" && isSelected
                ? "answer-wrong"
                : isSelected
                  ? "answer-locked"
                  : "";

            return (
              <button
                aria-label={"Answer " + letter + ": " + choice}
                className={"answer-button " + stateClass}
                disabled={isDisabled}
                key={choice}
                onClick={() => lockAnswer(index, answerRemainingSeconds)}
                type="button"
              >
                <span className="answer-letter">{letter}</span>
                <span className="answer-copy">{choice}</span>
              </button>
            );
          })}
        </section>

        <section className="result-stage" aria-live="polite">
          {isRevealed ? (
            <div className={answerState.status === "revealed" && answerState.isCorrect ? "result result-correct" : "result result-wrong"} role="status">
              <strong>{resultLabel}</strong>
              <span>+{answerState.points} TRIVIA POINTS</span>
            </div>
          ) : (
            <div className="timer-readout">
              <strong>0:{answerRemainingSeconds.toString().padStart(2, "0")}</strong>
              <span>{isLocked ? "ANSWER LOCKED" : "TIME REMAINING"}</span>
            </div>
          )}
        </section>

        <footer className="card-footer">
          {isRevealed ? (
            <span>NEXT QUESTION IN 0:{liveState.remainingSeconds.toString().padStart(2, "0")}</span>
          ) : (
            <span />
          )}
          <span>{formatQuestionNumber(liveState.questionNumber)}</span>
        </footer>
      </article>
    </main>
  );
}
