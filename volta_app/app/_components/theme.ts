export type Theme = "light" | "dark";

export const colors = {
  light: {
    background: "#FFFFFF",
    surface: "#F5F5F5",
    surfaceElevated: "#EBEBEB",
    border: "#E0E0E0",
    primary: "#1a1a1a",
    primaryButton: "#FFEE00",
    text: "#000000",
    textMuted: "#666666",
    navBarBg: "#F0F0F0",
    navBarBorder: "#D0D0D0",
    navBarInactive: "#404040",
    accent: "#FFEE00",
  },
  dark: {
    background: "#333",
    surface: "#404040",
    surfaceElevated: "#4a4a4a",
    border: "#555",
    primary: "#FFEE00",
    primaryButton: "#FFEE00",
    text: "#FFF",
    textMuted: "#CCC",
    navBarBg: "#3a3a3a",
    navBarBorder: "rgba(255,255,255,0.12)",
    navBarInactive: "#9a9a9a",
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
    color: colors.light.primary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.light.text,
  },
  body: {
    fontSize: 14,
    color: colors.light.text,
  },
  muted: {
    fontSize: 14,
    color: colors.light.textMuted,
  },
};

/** Scale tipografică unică pentru folosire consecventă (H1–H4, Body, Caption) */
export const textVariants = {
  H1: { fontSize: 28, fontWeight: '800' as const },
  H2: { fontSize: 22, fontWeight: '700' as const },
  H3: { fontSize: 18, fontWeight: '600' as const },
  H4: { fontSize: 16, fontWeight: '600' as const },
  Body: { fontSize: 15, fontWeight: '400' as const },
  BodyStrong: { fontSize: 15, fontWeight: '600' as const },
  Caption: { fontSize: 13, fontWeight: '400' as const },
  CaptionStrong: { fontSize: 13, fontWeight: '600' as const },
};

export type TextVariant = keyof typeof textVariants;


