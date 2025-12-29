export type Theme = "light" | "dark";

export const colors = {
  light: {
    background: "#FFFFFF",
    surface: "#F5F5F5",
    border: "#E0E0E0",
    primary: "#1a1a1a", // Negru închis pentru text și elemente importante pe fundal alb
    primaryButton: "#FFEE00", // Galben pentru butoane
    text: "#000000",
    textMuted: "#666666",
    accent: "#FFEE00",
  },
  dark: {
    background: "#000",
    surface: "#111",
    border: "#222",
    primary: "#FFEE00", // Galben pentru tema întunecată
    primaryButton: "#FFEE00",
    text: "#FFF",
    textMuted: "#CCC",
    accent: "#333300",
  },
};

// Funcție helper pentru a obține culorile pentru tema curentă
export const getColors = (theme: Theme) => colors[theme];

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
};

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  pill: 999,
};

export const typography = {
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
  },
  body: {
    fontSize: 14,
    color: colors.text,
  },
  muted: {
    fontSize: 14,
    color: colors.textMuted,
  },
};


