import "react";

// Lets inline styles set CSS custom properties, e.g. style={{ "--cat": color }}.
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
