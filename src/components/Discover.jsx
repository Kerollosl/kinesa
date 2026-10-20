import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { categories, questions } from "../data.js";
import { CategoryIcon } from "./Wheel.jsx";
import Mascot from "./Mascot.jsx";
import "./learning-experience.css";

export default function Discover({ setModal, openLobby }) {
  const [categoryId, setCategoryId] = useState("symbols");
  const [sampleIndex, setSampleIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const studio = useRef(null);
  const questionRef = useRef(null);
  const feedbackRef = useRef(null);
  const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => {
    if (!focusRequest) return;
    questionRef.current?.focus({ preventScroll: true });
    questionRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [focusRequest]);
  useEffect(() => {
    if (selected === null) return;
    feedbackRef.current?.focus({ preventScroll: true });
    feedbackRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [selected]);
  const category = categories.find((c) => c.id === categoryId);
  const deck = questions.filter((q) => q.category === categoryId);
  const question = deck[sampleIndex];
  const revealed = selected !== null;
  const correct = selected === question.correct;

  function chooseCategory(id) {
    setFocusRequest((n) => n + 1);
    setCategoryId(id);
    setSampleIndex(0);
    setSelected(null);
    if (studio.current?.getBoundingClientRect().top < 0) {
      studio.current.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  }

  return (
    <div className="le-page le-discover">
      <header className="le-intro">
        <div>
          <span className="le-kicker">DISCOVER</span>
          <h1>A world of stories.</h1>
          <p>Explore the Bible, Coptic history, and the traditions we share.</p>
        </div>
        <span className="le-intro-tag">
          <BookOpen size={15} /> Six categories to explore
        </span>
      </header>

      <section
        ref={studio}
        className="le-studio"
        aria-labelledby="discovery-heading"
        style={{ "--le-accent": category.color, "--le-pale": category.pale }}
      >
        <div className="le-studio-context">
          <span className="le-kicker">
            <Sparkles size={13} /> A LITTLE DISCOVERY
          </span>
          <div className="le-context-icon">
            <CategoryIcon category={category} size={33} />
          </div>
          <h2 id="discovery-heading">{category.name}</h2>
          <p>{category.detail}</p>
          <button
            className="le-text-action"
            onClick={() => setModal({ type: "category", category })}
          >
            About this category <ArrowUpRight size={16} />
          </button>
          <div className="le-curious-companion" aria-hidden="true">
            <div className="le-companion-orbit" />
            <Mascot kind="eagle" />
            <span>Curiosity looks good on you.</span>
          </div>
        </div>

        <div className="le-sample" key={`${categoryId}-${sampleIndex}`}>
          <div className="le-sample-top">
            <span>JUST FOR THE FUN OF IT</span>
            <span>
              {sampleIndex + 1} / {deck.length}
            </span>
          </div>
          <fieldset className="le-question">
            <legend ref={questionRef} tabIndex={-1}>
              {question.text}
            </legend>
            <div className="le-sample-answers">
              {question.answers.map((answer, i) => (
                <button
                  key={answer}
                  className={`le-sample-answer ${revealed && i === question.correct ? "le-answer-correct" : ""} ${revealed && i === selected && !correct ? "le-answer-missed" : ""}`}
                  disabled={revealed}
                  onClick={() => setSelected(i)}
                >
                  <span className="le-answer-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{answer}</span>
                  {revealed && i === question.correct && (
                    <Check size={17} aria-label="Correct answer" />
                  )}
                </button>
              ))}
            </div>
          </fieldset>
          {revealed ? (
            <div
              className="le-sample-reveal"
              role="status"
              ref={feedbackRef}
              tabIndex={-1}
            >
              <strong>
                {correct
                  ? "You’ve got it."
                  : `The answer is ${question.answers[question.correct]}.`}
              </strong>
              <p>{question.explanation}</p>
              <span>
                <BookOpen size={13} /> {question.source}
              </span>
              <button
                className="le-text-action"
                onClick={() => {
                  setFocusRequest((n) => n + 1);
                  setSampleIndex((index) => (index + 1) % deck.length);
                  setSelected(null);
                }}
              >
                {sampleIndex === deck.length - 1
                  ? "Try the first sample again"
                  : "Try another sample"}
                {sampleIndex === deck.length - 1 ? (
                  <RotateCcw size={15} />
                ) : (
                  <ArrowRight size={16} />
                )}
              </button>
            </div>
          ) : (
            <p className="le-sample-note">
              Take a guess. This is an unscored sample.
            </p>
          )}
        </div>
      </section>

      <section
        className="le-topic-section"
        aria-labelledby="discover-topics-heading"
      >
        <div className="le-section-heading">
          <div>
            <h2 id="discover-topics-heading">Follow your curiosity</h2>
            <p>Choose a category to try its sample questions.</p>
          </div>
          <span>06 TOPICS</span>
        </div>
        <div className="le-topic-grid">
          {categories.map((c, i) => (
            <button
              className={`explore-card le-topic-card ${c.id === categoryId ? "le-topic-selected" : ""}`}
              data-glass
              key={c.id}
              style={{ "--le-accent": c.color, "--le-pale": c.pale }}
              aria-pressed={c.id === categoryId}
              onClick={() => chooseCategory(c.id)}
            >
              <span className="le-topic-top">
                <span className="le-topic-icon">
                  <CategoryIcon category={c} size={28} />
                </span>
                <span className="le-topic-index">0{i + 1}</span>
              </span>
              <h3>{c.name}</h3>
              <p>{c.description}</p>
              <span className="le-topic-footer">
                {c.id === categoryId ? "Exploring now" : "Explore category"}
                <ChevronRight size={16} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="le-bottom-callout">
        <div>
          <strong>Ready to put it to the test?</strong>
          <p>Take all six categories for a spin in a sample game.</p>
        </div>
        <button className="le-solid-action" onClick={() => openLobby("random")}>
          Start a game <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
