export const colors = {
  brown: "#5f4631",
  beige: "#b69a7a",
  red: "#dc4b4b",
  background: "#f6f4f1",
  surface: "#ffffff",
  text: "#1f2937",
  mutedText: "#6b7280",
} as const;

export const tailwindColors = {
  extend: {
    colors: {
      primary: colors.brown,
      secondary: colors.beige,
      warning: colors.red,
      background: colors.background,
      surface: colors.surface,
      "text-primary": colors.text,
      "text-muted": colors.mutedText,
    },
  },
};
