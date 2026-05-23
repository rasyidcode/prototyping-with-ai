import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Flame,
  Play,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import { questions } from "./data/questions";
import { calculateScore } from "./lib/scoring";
import { filterQuestions, pickNextQuestion } from "./lib/questionRotation";
import { loadStats, mergeSessionStats, saveStats } from "./lib/storage";
import type { TriviaCategory, TriviaDifficulty, TriviaQuestion, TriviaStats } from "./types";

const QUESTION_TIME = 20;
const SESSION_LENGTH = 10;

const categoryLabels: Record<TriviaCategory | "all", string> = {
  all: "All",
  heroes: "Heroes",
  abilities: "Abilities",
  items: "Items",
  mechanics: "Mechanics",
  objectives: "Objectives",
  roles: "Roles",
};

const difficultyLabels: Record<TriviaDifficulty | "all", string> = {
  all: "All",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

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

type SessionState = {
  score: number;
  streak: number;
  longestStreak: number;
  answered: number;
  correct: number;
  elapsed: number;
};

const initialSession: SessionState = {
  score: 0,
  streak: 0,
  longestStreak: 0,
  answered: 0,
  correct: 0,
  elapsed: 0,
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function App() {
  const [stats, setStats] = useState<TriviaStats>(() => loadStats());
  const [category, setCategory] = useState<TriviaCategory | "all">(stats.lastCategory);
  const [difficulty, setDifficulty] = useState<TriviaDifficulty | "all">(stats.lastDifficulty);
  const [session, setSession] = useState<SessionState>(initialSession);
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [answerState, setAnswerState] = useState<AnswerState>({ status: "idle" });
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME);
  const [isFinished, setIsFinished] = useState(false);

  const activePool = useMemo(
    () => filterQuestions(questions, category, difficulty),
    [category, difficulty],
  );

  useEffect(() => {
    saveStats({ ...stats, lastCategory: category, lastDifficulty: difficulty });
  }, [category, difficulty, stats]);


  function startSession() {
    if (activePool.length === 0) {
      return;
    }

    const next = pickNextQuestion(activePool, []);
    setSession(initialSession);
    setQuestion(next.question);
    setAnsweredIds(next.nextAnsweredIds);
    setAnswerState({ status: "idle" });
    setTimeRemaining(QUESTION_TIME);
    setIsFinished(false);
  }

  const handleAnswer = useCallback(
    (selectedIndex: number | null, remaining = timeRemaining) => {
      if (!question || answerState.status !== "idle") {
        return;
      }

      const isCorrect = selectedIndex === question.answerIndex;
      const scoreResult = calculateScore({
        isCorrect,
        timeRemaining: remaining,
        questionTime: QUESTION_TIME,
        streak: session.streak,
      });

      setAnswerState({
        status: "answered",
        selectedIndex,
        isCorrect,
        points: scoreResult.points,
        timeBonus: scoreResult.timeBonus,
        streakBonus: scoreResult.streakBonus,
      });

      setSession((current) => {
        const nextStreak = scoreResult.nextStreak;
        return {
          ...current,
          score: current.score + scoreResult.points,
          streak: nextStreak,
          longestStreak: Math.max(current.longestStreak, nextStreak),
          answered: current.answered + 1,
          correct: current.correct + (isCorrect ? 1 : 0),
        };
      });
    },
    [answerState.status, question, session.streak, timeRemaining],
  );

  useEffect(() => {
    if (!question || isFinished) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSession((current) => ({ ...current, elapsed: current.elapsed + 1 }));
      if (answerState.status === "idle") {
        setTimeRemaining((current) => {
          if (current <= 1) {
            handleAnswer(null, 0);
            return 0;
          }

          return current - 1;
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [answerState.status, handleAnswer, isFinished, question]);

  function nextQuestion() {
    if (session.answered >= SESSION_LENGTH) {
      finishSession();
      return;
    }

    const next = pickNextQuestion(activePool, answeredIds);
    setQuestion(next.question);
    setAnsweredIds(next.nextAnsweredIds);
    setAnswerState({ status: "idle" });
    setTimeRemaining(QUESTION_TIME);
  }

  function finishSession() {
    const nextStats = mergeSessionStats(stats, {
      score: session.score,
      answered: session.answered,
      correct: session.correct,
    });
    nextStats.lastCategory = category;
    nextStats.lastDifficulty = difficulty;
    setStats(nextStats);
    saveStats(nextStats);
    setIsFinished(true);
  }

  const accuracy =
    session.answered === 0 ? 0 : Math.round((session.correct / session.answered) * 100);
  const timerPercentage = (timeRemaining / QUESTION_TIME) * 100;
  const isActive = Boolean(question) && !isFinished;

  return (
    <main className="app-shell">
      <section className="top-bar" aria-label="Queue status">
        <div>
          <p className="eyebrow">Unofficial Dota 2 companion</p>
          <h1>Queue Trivia</h1>
        </div>
        <div className="queue-metrics">
          <Metric icon={<Clock3 />} label="Queue" value={formatTime(session.elapsed)} />
          <Metric icon={<Trophy />} label="Score" value={session.score.toString()} />
          <Metric icon={<Flame />} label="Streak" value={`${session.streak}x`} />
          <Metric icon={<Activity />} label="Best" value={stats.bestScore.toString()} />
        </div>
      </section>

      <section className="control-strip" aria-label="Trivia filters">
        <SegmentedControl
          label="Category"
          value={category}
          options={Object.entries(categoryLabels)}
          disabled={isActive}
          onChange={(value) => setCategory(value as TriviaCategory | "all")}
        />
        <SegmentedControl
          label="Difficulty"
          value={difficulty}
          options={Object.entries(difficultyLabels)}
          disabled={isActive}
          onChange={(value) => setDifficulty(value as TriviaDifficulty | "all")}
        />
      </section>

      <section className="play-surface">
        {!question && !isFinished ? (
          <StartPanel poolSize={activePool.length} onStart={startSession} />
        ) : null}

        {question && !isFinished ? (
          <article className="question-panel">
            <div className="question-meta">
              <span>{categoryLabels[question.category]}</span>
              <span>{difficultyLabels[question.difficulty]}</span>
              <span>
                {session.answered + 1}/{SESSION_LENGTH}
              </span>
            </div>
            <div className="timer-track" aria-label={`${timeRemaining} seconds remaining`}>
              <div className="timer-fill" style={{ width: `${timerPercentage}%` }} />
            </div>
            <h2>{question.prompt}</h2>
            <div className="answers">
              {question.choices.map((choice, index) => {
                const isSelected =
                  answerState.status === "answered" && answerState.selectedIndex === index;
                const isCorrectAnswer =
                  answerState.status === "answered" && question.answerIndex === index;
                const stateClass = isCorrectAnswer
                  ? "answer-correct"
                  : isSelected
                    ? "answer-wrong"
                    : "";

                return (
                  <button
                    aria-label={`Answer ${String.fromCharCode(65 + index)}: ${choice}`}
                    className={`answer-button ${stateClass}`}
                    disabled={answerState.status === "answered"}
                    key={choice}
                    onClick={() => handleAnswer(index)}
                    type="button"
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    {choice}
                  </button>
                );
              })}
            </div>

            {answerState.status === "answered" ? (
              <div className="feedback" role="status">
                <div className={answerState.isCorrect ? "feedback-good" : "feedback-bad"}>
                  {answerState.isCorrect ? <CheckCircle2 /> : <XCircle />}
                  <strong>{answerState.isCorrect ? "Correct" : "Missed"}</strong>
                  <span>
                    +{answerState.points} pts
                    {answerState.timeBonus > 0 ? `, +${answerState.timeBonus} speed` : ""}
                    {answerState.streakBonus > 0 ? `, +${answerState.streakBonus} streak` : ""}
                  </span>
                </div>
                <p>{question.explanation}</p>
                <button className="primary-button" onClick={nextQuestion} type="button">
                  <Play size={18} />
                  {session.answered >= SESSION_LENGTH ? "Finish" : "Next"}
                </button>
              </div>
            ) : null}
          </article>
        ) : null}

        {isFinished ? (
          <SummaryPanel
            accuracy={accuracy}
            session={session}
            onRestart={startSession}
            onReset={() => {
              setQuestion(null);
              setIsFinished(false);
              setSession(initialSession);
              setAnswerState({ status: "idle" });
            }}
          />
        ) : null}
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SegmentedControl({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="segmented" disabled={disabled}>
      <legend>{label}</legend>
      <div>
        {options.map(([optionValue, optionLabel]) => (
          <button
            aria-pressed={value === optionValue}
            key={optionValue}
            onClick={() => onChange(optionValue)}
            type="button"
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function StartPanel({ poolSize, onStart }: { poolSize: number; onStart: () => void }) {
  return (
    <article className="start-panel">
      <div>
        <p className="eyebrow">Match search active</p>
        <h2>Answer while the queue ticks.</h2>
        <p>
          A 10-question run with speed bonuses, streak points, and explanations after every pick.
        </p>
      </div>
      <button className="primary-button" disabled={poolSize === 0} onClick={onStart} type="button">
        <Play size={18} />
        Start Trivia
      </button>
      <span className="pool-count">{poolSize} questions in this pool</span>
    </article>
  );
}

function SummaryPanel({
  session,
  accuracy,
  onRestart,
  onReset,
}: {
  session: SessionState;
  accuracy: number;
  onRestart: () => void;
  onReset: () => void;
}) {
  return (
    <article className="summary-panel">
      <p className="eyebrow">Queue popped</p>
      <h2>Session summary</h2>
      <div className="summary-grid">
        <Metric icon={<Trophy />} label="Score" value={session.score.toString()} />
        <Metric icon={<CheckCircle2 />} label="Correct" value={`${session.correct}/${session.answered}`} />
        <Metric icon={<Activity />} label="Accuracy" value={`${accuracy}%`} />
        <Metric icon={<Flame />} label="Best streak" value={`${session.longestStreak}x`} />
      </div>
      <div className="summary-actions">
        <button className="primary-button" onClick={onRestart} type="button">
          <RotateCcw size={18} />
          Run Again
        </button>
        <button className="ghost-button" onClick={onReset} type="button">
          Change Filters
        </button>
      </div>
    </article>
  );
}
