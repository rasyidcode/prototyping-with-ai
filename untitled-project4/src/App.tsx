import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Flame,
  Radio,
  Trophy,
  XCircle,
} from "lucide-react";
import { questions } from "./data/questions";
import { getLiveTriviaState, formatQuestionNumber } from "./lib/liveTrivia";
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

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return minutes + ":" + seconds;
}

function makeAnswerKey(questionNumber: number) {
  return questionNumber.toString();
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

  function resetRun() {
    setRun(createInitialRun());
    setAnsweredQuestions({});
  }

  const joinedSeconds = Math.max(0, Math.floor((nowMs - run.joinedAtMs) / 1000));
  const accuracy = run.answered === 0 ? 0 : Math.round((run.correct / run.answered) * 100);
  const timerPercentage = liveState
    ? (liveState.remainingSeconds / liveState.totalSeconds) * 100
    : 0;

  return (
    <main className="app-shell">
      <section className="top-bar" aria-label="Queue status">
        <div>
          <p className="eyebrow">Unofficial Dota 2 companion</p>
          <h1>Queue Trivia</h1>
        </div>
        <div className="queue-metrics">
          <Metric icon={<Radio />} label="Live" value={liveState ? formatQuestionNumber(liveState.questionNumber) : "--"} />
          <Metric icon={<Clock3 />} label="Joined" value={formatTime(joinedSeconds)} />
          <Metric icon={<Trophy />} label="Score" value={run.score.toString()} />
          <Metric icon={<Flame />} label="Streak" value={run.streak + "x"} />
        </div>
      </section>

      <section className="play-surface">
        {liveState ? (
          <article className="question-panel">
            <div className="question-meta">
              <span>{formatQuestionNumber(liveState.questionNumber)}</span>
              <span>{liveState.remainingSeconds}s</span>
            </div>
            <div className="timer-track" aria-label={liveState.remainingSeconds + " seconds remaining"}>
              <div className="timer-fill" style={{ width: timerPercentage + "%" }} />
            </div>
            <h2>{liveState.question.prompt}</h2>
            <div className="answers">
              {liveState.question.choices.map((choice, index) => {
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
                    aria-label={"Answer " + String.fromCharCode(65 + index) + ": " + choice}
                    className={"answer-button " + stateClass}
                    disabled={answerState.status === "answered"}
                    key={choice}
                    onClick={() => recordAnswer(index, liveState.remainingSeconds)}
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
                    {answerState.timeBonus > 0 ? ", +" + answerState.timeBonus + " speed" : ""}
                    {answerState.streakBonus > 0 ? ", +" + answerState.streakBonus + " streak" : ""}
                  </span>
                </div>
                <p>{liveState.question.explanation}</p>
                <span className="next-up">
                  Next global question in {liveState.remainingSeconds}s
                </span>
              </div>
            ) : null}
          </article>
        ) : (
          <article className="start-panel">
            <p className="eyebrow">No questions available</p>
            <h2>Question bank is empty.</h2>
          </article>
        )}

        <section className="live-summary" aria-label="Live run stats">
          <Metric icon={<Activity />} label="Accuracy" value={accuracy + "%"} />
          <Metric icon={<CheckCircle2 />} label="Correct" value={run.correct + "/" + run.answered} />
          <Metric icon={<Trophy />} label="Best" value={stats.bestScore.toString()} />
          <Metric icon={<Flame />} label="Longest" value={Math.max(stats.longestStreak, run.longestStreak) + "x"} />
          <button className="ghost-button" onClick={resetRun} type="button">
            Reset Run
          </button>
        </section>
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

