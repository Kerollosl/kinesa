import { categories } from "../data.js";
import { CategoryIcon } from "./Wheel.jsx";
import { masteryFor } from "../progress.js";
import { spotlight } from "../daily.js";

// The six categories. Tap one to read about it and play ten of its questions.
export default function Discover({ stats, onOpen }) {
  const boosted = spotlight();
  return (
    <div className="page categories">
      <h1>Categories</h1>
      <div className="cat-grid">
        {categories.map((c) => {
          const tier = masteryFor(stats.categoryCorrect[c.id] || 0);
          return (
            <button
              key={c.id}
              className="cat-tile"
              style={{ "--cat": c.color, "--cat-ink": c.ink }}
              onClick={() => onOpen(c)}
            >
              <span className="cat-icon" aria-hidden="true">
                <CategoryIcon category={c} size={30} />
              </span>
              <span className="cat-name">{c.name}</span>
              <span className="cat-desc">{c.description}</span>
              {(tier || c.id === boosted.id) && (
                <span className="cat-tags">
                  {c.id === boosted.id && (
                    <span className="cat-tag is-boost">1.5× XP</span>
                  )}
                  {tier && (
                    <span className={`cat-tag is-${tier.id}`}>
                      {tier.label}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
