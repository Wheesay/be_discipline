"use client";

import { useEffect, useMemo, useState } from "react";

type Goal = {
  id: number;
  title: string;
  detail: string;
  category: "Move" | "Fuel" | "Focus";
  done: boolean;
};

const starterGoals: Goal[] = [
  {
    id: 1,
    title: "Strength training",
    detail: "45 minutes · Upper body",
    category: "Move",
    done: true,
  },
  {
    id: 2,
    title: "Eat a real lunch",
    detail: "Protein + greens · Before 2 PM",
    category: "Fuel",
    done: false,
  },
  {
    id: 3,
    title: "Evening walk",
    detail: "30 minutes · Phone stays home",
    category: "Focus",
    done: false,
  },
];

const days = [
  { label: "M", state: "done" },
  { label: "T", state: "done" },
  { label: "W", state: "done" },
  { label: "T", state: "today" },
  { label: "F", state: "open" },
  { label: "S", state: "open" },
  { label: "S", state: "open" },
];

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>(starterGoals);
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [checkIn, setCheckIn] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("be-discipline-goals");
    if (saved) setGoals(JSON.parse(saved));
    setCheckIn(window.localStorage.getItem("be-discipline-checkin") === "sent");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("be-discipline-goals", JSON.stringify(goals));
  }, [goals]);

  const completed = goals.filter((goal) => goal.done).length;
  const score = useMemo(
    () => Math.round(((completed + 7) / (goals.length + 8)) * 100),
    [completed, goals.length],
  );

  function toggleGoal(id: number) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === id ? { ...goal, done: !goal.done } : goal,
      ),
    );
  }

  function addGoal(event: React.FormEvent) {
    event.preventDefault();
    const title = newGoal.trim();
    if (!title) return;
    setGoals((current) => [
      ...current,
      {
        id: Date.now(),
        title,
        detail: "Personal commitment · Today",
        category: "Focus",
        done: false,
      },
    ]);
    setNewGoal("");
    setShowAdd(false);
  }

  function sendCheckIn() {
    setCheckIn(true);
    window.localStorage.setItem("be-discipline-checkin", "sent");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Be Discipline home">
          <span className="brand-mark">BD</span>
          <span>Be Discipline</span>
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          <a className="active" href="#today">Today</a>
          <a href="#week">My week</a>
          <a href="#accountability">Accountability</a>
        </nav>
        <button className="avatar" aria-label="Open profile">WS</button>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">Thursday · Week 31</p>
          <h1>Keep the promise<br />you made to yourself.</h1>
        </div>
        <div className="hero-score">
          <div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}>
            <div>
              <strong>{score}%</strong>
              <span>kept</span>
            </div>
          </div>
          <p><strong>Solid week.</strong> One honest action<br />at a time.</p>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="today-panel" id="today">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your contract</p>
              <h2>Today&apos;s promises</h2>
            </div>
            <span className="count">{completed}/{goals.length} kept</span>
          </div>

          <div className="goal-list">
            {goals.map((goal, index) => (
              <button
                className={`goal-row ${goal.done ? "is-done" : ""}`}
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                aria-pressed={goal.done}
              >
                <span className="goal-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="goal-copy">
                  <span className="goal-category">{goal.category}</span>
                  <strong>{goal.title}</strong>
                  <small>{goal.detail}</small>
                </span>
                <span className="check" aria-hidden="true">{goal.done ? "✓" : ""}</span>
              </button>
            ))}
          </div>

          {showAdd ? (
            <form className="add-form" onSubmit={addGoal}>
              <label htmlFor="new-goal">What will you commit to?</label>
              <div>
                <input
                  id="new-goal"
                  autoFocus
                  value={newGoal}
                  onChange={(event) => setNewGoal(event.target.value)}
                  placeholder="e.g. Prepare tomorrow's breakfast"
                />
                <button type="submit">Add promise</button>
              </div>
            </form>
          ) : (
            <button className="add-button" onClick={() => setShowAdd(true)}>
              <span>+</span> Add a promise
            </button>
          )}
        </section>

        <aside className="streak-card">
          <p className="eyebrow">Current streak</p>
          <div className="streak-number">12</div>
          <p className="streak-label">days showing up</p>
          <div className="day-strip" aria-label="Weekly streak">
            {days.map((day, index) => (
              <span key={`${day.label}-${index}`} className={day.state}>
                <i>{day.state === "done" ? "✓" : index + 21}</i>
                <b>{day.label}</b>
              </span>
            ))}
          </div>
          <p className="streak-note">Your longest streak is 18 days.<br />Keep this one alive.</p>
        </aside>
      </div>

      <section className="week-section" id="week">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The bigger picture</p>
            <h2>This week&apos;s standards</h2>
          </div>
          <span className="week-dates">Jul 21 — 27</span>
        </div>

        <div className="standards-grid">
          <article className="standard-card">
            <div className="standard-top">
              <span className="category-icon">M</span>
              <span className="status-on">On track</span>
            </div>
            <p className="eyebrow">Movement</p>
            <h3>Exercise 4 times</h3>
            <div className="progress-meta"><strong>3</strong><span>of 4 sessions</span></div>
            <div className="progress-bar"><i style={{ width: "75%" }} /></div>
            <p className="card-foot">One more session by Sunday</p>
          </article>

          <article className="standard-card food">
            <div className="standard-top">
              <span className="category-icon">F</span>
              <span className="status-watch">Needs attention</span>
            </div>
            <p className="eyebrow">Food</p>
            <h3>Cook 5 balanced meals</h3>
            <div className="progress-meta"><strong>2</strong><span>of 5 meals</span></div>
            <div className="progress-bar"><i style={{ width: "40%" }} /></div>
            <p className="card-foot">Plan the next meal, not the whole week</p>
          </article>
        </div>
      </section>

      <section className="accountability-section" id="accountability">
        <div className="account-copy">
          <p className="eyebrow">Accountability</p>
          <h2>Proof beats intention.</h2>
          <p>Your partner sees the promises you keep—not your private notes. A two-minute check-in makes today real.</p>
          <div className="partner">
            <span>MK</span>
            <div><strong>Maya is in your corner</strong><small>Accountability partner · 3 weeks</small></div>
          </div>
        </div>
        <div className={`checkin-card ${checkIn ? "sent" : ""}`}>
          {checkIn ? (
            <div className="sent-state">
              <span>✓</span>
              <p className="eyebrow">Check-in sent</p>
              <h3>You showed your work.</h3>
              <p>Maya can now see today&apos;s progress. Come back tomorrow and do it again.</p>
            </div>
          ) : (
            <>
              <div className="checkin-head">
                <div><p className="eyebrow">Evening check-in</p><h3>How did today go?</h3></div>
                <span>2 min</span>
              </div>
              <label htmlFor="reflection">One honest sentence</label>
              <textarea
                id="reflection"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What helped—or got in the way?"
              />
              <button onClick={sendCheckIn} disabled={!note.trim()}>Share today&apos;s check-in <span>→</span></button>
              <small>Only your goal status and this note are shared.</small>
            </>
          )}
        </div>
      </section>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark">BD</span><span>Be Discipline</span></a>
        <p>Small promises. Kept daily.</p>
      </footer>
    </main>
  );
}
