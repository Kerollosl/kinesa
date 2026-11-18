import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { loadPrefs, savePrefs } from "../prefs.js";
import { normalizeSettings } from "../engine.js";
import { LENGTH_OPTIONS, Segmented, TIER_OPTIONS } from "./Lobby.jsx";
import AboutLinks from "./AboutLinks.jsx";

// Everything optional lives here; changes apply as you make them.
export default function Settings({ sound, onSound, onHelp, onDone }) {
  const prefs = loadPrefs();
  const [name, setName] = useState(prefs.name);
  const [settings, setSettings] = useState(prefs.settings);
  const update = (patch) => {
    const next = normalizeSettings({ ...settings, timed: true, ...patch });
    setSettings(next);
    savePrefs({ name, settings: next });
  };
  return (
    <form
      className="settings"
      onSubmit={(e) => {
        e.preventDefault();
        onDone();
      }}
    >
      <h2 id="modal-title">Settings</h2>
      <label className="field">
        <span>Your name</span>
        <input
          value={name}
          maxLength={20}
          placeholder="You"
          autoComplete="nickname"
          onChange={(e) => {
            setName(e.target.value);
            savePrefs({ name: e.target.value, settings });
          }}
        />
      </label>
      <Segmented
        label="Level"
        value={settings.tier}
        options={TIER_OPTIONS}
        onChange={(tier) => update({ tier })}
      />
      <Segmented
        label="Game"
        value={settings.length}
        options={LENGTH_OPTIONS}
        onChange={(length) => update({ length })}
      />
      <label className="switch">
        <span>Sound</span>
        <input
          type="checkbox"
          role="switch"
          checked={sound}
          onChange={(e) => onSound(e.target.checked)}
        />
        <i aria-hidden="true" />
      </label>
      <button type="submit" className="btn btn-go btn-block">
        Done
      </button>
      <button type="button" className="link-btn" onClick={onHelp}>
        <HelpCircle size={18} aria-hidden="true" /> How to play
      </button>
      <p className="fine">
        Progress stays on this device. <AboutLinks />
      </p>
    </form>
  );
}
