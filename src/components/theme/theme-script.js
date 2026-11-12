export const THEME_STORAGE_KEY = "hz-theme";

/**
 * Runs before first paint to apply the saved theme and avoid a flash.
 * Light is the default; we intentionally don't follow the OS setting
 * unless the user picks dark.
 */
const script = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
