import { APP_NAME, APP_VERSION, PRIVACY_URL, SUPPORT_URL } from "../appInfo.js";

// Version, privacy policy and support. Required by the App Store; no accounts or tracking to explain.
export default function AboutLinks() {
  return (
    <>
      <span>
        {APP_NAME} {APP_VERSION}
      </span>
      <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
        Privacy policy
      </a>
      <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
        Support
      </a>
    </>
  );
}
