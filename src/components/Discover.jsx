import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, RotateCcw } from "lucide-react";
import { categories, questions } from "../data.js";
import { CategoryIcon } from "./Wheel.jsx";
import "./learning-experience.css";

export default function Discover({ setModal, openLobby, onQuiz }) {
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
          <h1>A world of stories.</h1>
        </div>
      </header>

      <section
        ref={studio}
        className="le-studio"
        aria-labelledby="discovery-heading"
        style={{ "--le-accent": category.color, "--le-pale": category.pale }}
      >
        <div className="le-studio-context">
          <div className="le-context-icon">
            <CategoryIcon category={category} size={33} />
          </div>
          <h2 id="discovery-heading">{category.name}</h2>
          <button
            className="le-text-action"
            aria-label="About this category"
            title="About this category"
            onClick={() => setModal({ type: "category", category })}
          >
            <BookOpen size={18} />
          </button>
        </div>

        <div className="le-sample" key={`${categoryId}-${sampleIndex}`}>
          <div className="le-sample-top">
            <span>Practice</span>
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
            <p className="le-sample-note">Unscored sample</p>
          )}
        </div>
      </section>

      <section
        className="le-topic-section"
        aria-labelledby="discover-topics-heading"
      >
        <div className="le-section-heading">
          <div>
            <h2 id="discover-topics-heading">Choose a topic</h2>
          </div>
        </div>
        <div className="le-topic-grid">
          {categories.map((c) => (
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
                {c.id === categoryId && (
                  <Check size={18} aria-label="Selected" />
                )}
              </span>
              <h3>{c.name}</h3>
            </button>
          ))}
        </div>
      </section>

      <div className="le-bottom-callout">
        <button className="le-solid-action" onClick={() => onQuiz(categoryId)}>
          Quiz me on {category.name} <ArrowRight size={17} />
        </button>
        <button className="le-text-action" onClick={() => openLobby("random")}>
          Or play a mixed round
        </button>
      </div>
    </div>
  );
}
