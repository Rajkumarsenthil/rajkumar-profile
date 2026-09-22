export type Token = { text: string; accent: boolean };

/**
 * Splits text into words, marking runs wrapped in *asterisks* as accents.
 * "Owner of *problems,* not tickets" -> "problems," is an accent word.
 */
export function parseAccent(text: string): Token[] {
  let on = false;
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      let word = raw;
      let accent = on;
      if (word.startsWith("*")) {
        accent = true;
        on = true;
        word = word.slice(1);
      }
      const end = word.indexOf("*");
      if (end !== -1) {
        word = word.slice(0, end) + word.slice(end + 1);
        on = false;
      }
      return { text: word, accent };
    });
}
