// Shared class names, so every button, input and card looks the same.
// The colours are the theme variables from app/globals.css, so light and dark both work.
const button =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButton = `${button} bg-accent text-background hover:bg-accent/85`;
export const secondaryButton = `${button} border bg-background hover:bg-surface`;

export const input =
  "mt-1 block w-full rounded-md border bg-background px-2.5 py-1.5 text-sm shadow-sm outline-none " +
  "focus:border-accent focus:ring-2 focus:ring-accent/30";

export const card = "rounded-xl border bg-background shadow-sm";
