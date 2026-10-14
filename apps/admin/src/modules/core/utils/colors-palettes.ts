// Enhanced SaaS design palettes with typography, spacing, and other design elements
export interface DesignPalette {
  name: string;
  description: string;
  colors: string[];
  palette: {
    // Colors
    mainColor: string;
    mainColorLight: string;
    textColor: string;
    secondaryColor: string;
    thirdColor: string;
    bgColor: string;
    bordersColor: string;
    inputsTextColor: string;
    inputsBgColor: string;
    linksColor: string;
    navigationBgColor: string;
    negativeColor: string;
    buttonTextColor?: string;
    buttonBgColor?: string;
    focusColor?: string;
    // Typography
    fontFamily?: string;
    headingsFontFamily?: string;
    baseFontSize?: number;
    // Layout
    borderRadius?: number;
    buttonRadius?: number;
    spacing?: 'compact' | 'normal' | 'comfortable';
    shadowStyle?: 'none' | 'light' | 'medium' | 'heavy';
    animationSpeed?: number;
    /** cards and panels; defaults to white (light) or negativeColor (dark themes) */
    surfaceColor?: string;
    /** Google Fonts stylesheet (css2 URL) that provides the font families above */
    fontsUrl?: string;
  };
}

export const PALETTES: DesignPalette[] = [
  {
    name: 'Indigo Studio',
    description: 'Crisp indigo on cool paper with a deep navy sidebar. Modern product UI',
    colors: [
      '#3730a3',
      '#4f46e5',
      '#151833',
      '#f7f8fc',
      '#e2e4f0',
      '#1b1f3b'
    ],
    palette: {
      mainColor: '#3730a3',
      mainColorLight: '#e8e9fb',
      textColor: '#1b1f3b',
      secondaryColor: '#c7cbf0',
      thirdColor: '#ffffff',
      bgColor: '#f7f8fc',
      bordersColor: '#e2e4f0',
      inputsTextColor: '#1b1f3b',
      inputsBgColor: '#ffffff',
      linksColor: '#4338ca',
      navigationBgColor: '#151833',
      negativeColor: '#9aa0d6',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#4f46e5',
      focusColor: '#818cf8',
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
      headingsFontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
      baseFontSize: 16,
      borderRadius: 10,
      buttonRadius: 10,
      spacing: 'normal',
      shadowStyle: 'light',
      animationSpeed: 200,
      fontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
    }
  },
  {
    name: 'Paper & Ink',
    description: 'Warm editorial look: serif headings, rust accents and a cream sidebar',
    colors: [
      '#7c2d12',
      '#9a3412',
      '#f0e9dd',
      '#faf7f2',
      '#e5dccd',
      '#2a2620'
    ],
    palette: {
      mainColor: '#7c2d12',
      mainColorLight: '#f3e6d8',
      textColor: '#2a2620',
      secondaryColor: '#4d463c',
      thirdColor: '#9a3412',
      bgColor: '#faf7f2',
      bordersColor: '#e5dccd',
      inputsTextColor: '#2a2620',
      inputsBgColor: '#fffdf9',
      linksColor: '#9a3412',
      navigationBgColor: '#f0e9dd',
      negativeColor: '#6f675b',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#9a3412',
      focusColor: '#c2410c',
      fontFamily: "'Source Sans 3', ui-sans-serif, system-ui, sans-serif",
      headingsFontFamily: "Fraunces, Georgia, 'Times New Roman', serif",
      baseFontSize: 16,
      borderRadius: 4,
      buttonRadius: 4,
      spacing: 'normal',
      shadowStyle: 'none',
      animationSpeed: 180,
      fontsUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Sans+3:wght@400;500;600;700&display=swap'
    }
  },
  {
    name: 'Evergreen',
    description: 'Deep forest greens with generous rounding. Calm and trustworthy',
    colors: [
      '#14532d',
      '#15803d',
      '#0e2a1e',
      '#f3f7f4',
      '#dbe6df',
      '#12241a'
    ],
    palette: {
      mainColor: '#14532d',
      mainColorLight: '#dcefe3',
      textColor: '#12241a',
      secondaryColor: '#cfe9db',
      thirdColor: '#86efac',
      bgColor: '#f3f7f4',
      bordersColor: '#dbe6df',
      inputsTextColor: '#12241a',
      inputsBgColor: '#ffffff',
      linksColor: '#166534',
      navigationBgColor: '#0e2a1e',
      negativeColor: '#7fa893',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#15803d',
      focusColor: '#22c55e',
      fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
      headingsFontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
      baseFontSize: 16,
      borderRadius: 12,
      buttonRadius: 10,
      spacing: 'normal',
      shadowStyle: 'medium',
      animationSpeed: 220,
      fontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap'
    }
  },
  {
    name: 'Harbor',
    description: 'Ocean blues, soft shadows and friendly geometry',
    colors: [
      '#0c4a6e',
      '#0369a1',
      '#0c2233',
      '#f1f7fa',
      '#d6e4ec',
      '#0f2430'
    ],
    palette: {
      mainColor: '#0c4a6e',
      mainColorLight: '#d9ecf6',
      textColor: '#0f2430',
      secondaryColor: '#cde4f1',
      thirdColor: '#7dd3fc',
      bgColor: '#f1f7fa',
      bordersColor: '#d6e4ec',
      inputsTextColor: '#0f2430',
      inputsBgColor: '#ffffff',
      linksColor: '#0369a1',
      navigationBgColor: '#0c2233',
      negativeColor: '#7ea3b8',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#0369a1',
      focusColor: '#38bdf8',
      fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
      headingsFontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
      baseFontSize: 16,
      borderRadius: 14,
      buttonRadius: 12,
      spacing: 'normal',
      shadowStyle: 'medium',
      animationSpeed: 220,
      fontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
    }
  },
  {
    name: 'Graphite',
    description: 'Neutral enterprise monochrome with hairline borders and a dense layout',
    colors: [
      '#18181b',
      '#18181b',
      '#111113',
      '#f4f4f5',
      '#e4e4e7',
      '#27272a'
    ],
    palette: {
      mainColor: '#18181b',
      mainColorLight: '#e4e4e7',
      textColor: '#27272a',
      secondaryColor: '#d4d4d8',
      thirdColor: '#ffffff',
      bgColor: '#f4f4f5',
      bordersColor: '#e4e4e7',
      inputsTextColor: '#18181b',
      inputsBgColor: '#ffffff',
      linksColor: '#2563eb',
      navigationBgColor: '#111113',
      negativeColor: '#8c8c96',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#18181b',
      focusColor: '#2563eb',
      fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
      headingsFontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
      baseFontSize: 15,
      borderRadius: 6,
      buttonRadius: 6,
      spacing: 'compact',
      shadowStyle: 'none',
      animationSpeed: 150,
      fontsUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap'
    }
  },
  {
    name: 'Rosewood',
    description: 'Berry accent, very round corners and airy, confident type',
    colors: [
      '#9f1239',
      '#be123c',
      '#2a1119',
      '#fbf6f7',
      '#efdde2',
      '#2b1a20'
    ],
    palette: {
      mainColor: '#9f1239',
      mainColorLight: '#f9e1e7',
      textColor: '#2b1a20',
      secondaryColor: '#f0cdd6',
      thirdColor: '#fda4af',
      bgColor: '#fbf6f7',
      bordersColor: '#efdde2',
      inputsTextColor: '#2b1a20',
      inputsBgColor: '#ffffff',
      linksColor: '#be123c',
      navigationBgColor: '#2a1119',
      negativeColor: '#bf8c99',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#be123c',
      focusColor: '#fb7185',
      fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
      headingsFontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
      baseFontSize: 16,
      borderRadius: 16,
      buttonRadius: 20,
      spacing: 'normal',
      shadowStyle: 'light',
      animationSpeed: 240,
      fontsUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap'
    }
  },
  {
    name: 'Midnight Indigo',
    description: 'Deep navy dark mode with soft indigo highlights',
    colors: [
      '#a5b4fc',
      '#a5b4fc',
      '#090b1a',
      '#0d1021',
      '#272c52',
      '#e7e9f7'
    ],
    palette: {
      mainColor: '#a5b4fc',
      mainColorLight: '#232a57',
      textColor: '#e7e9f7',
      secondaryColor: '#b9bfe6',
      thirdColor: '#ffffff',
      bgColor: '#0d1021',
      bordersColor: '#272c52',
      inputsTextColor: '#e7e9f7',
      inputsBgColor: '#161a33',
      linksColor: '#a5b4fc',
      navigationBgColor: '#090b1a',
      negativeColor: '#161a33',
      buttonTextColor: '#0b0e1f',
      buttonBgColor: '#a5b4fc',
      focusColor: '#818cf8',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      headingsFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      baseFontSize: 16,
      borderRadius: 10,
      buttonRadius: 10,
      spacing: 'normal',
      shadowStyle: 'heavy',
      animationSpeed: 200,
      fontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
    }
  },
  {
    name: 'Obsidian Emerald',
    description: 'Developer dark mode: emerald accents and monospaced headings',
    colors: [
      '#6ee7b7',
      '#6ee7b7',
      '#060c0b',
      '#0a1110',
      '#1f2f2b',
      '#e3efe9'
    ],
    palette: {
      mainColor: '#6ee7b7',
      mainColorLight: '#17302a',
      textColor: '#e3efe9',
      secondaryColor: '#b4d4c6',
      thirdColor: '#ffffff',
      bgColor: '#0a1110',
      bordersColor: '#1f2f2b',
      inputsTextColor: '#e3efe9',
      inputsBgColor: '#121c1a',
      linksColor: '#6ee7b7',
      navigationBgColor: '#060c0b',
      negativeColor: '#121c1a',
      buttonTextColor: '#04130d',
      buttonBgColor: '#6ee7b7',
      focusColor: '#34d399',
      fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
      headingsFontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
      baseFontSize: 15,
      borderRadius: 6,
      buttonRadius: 6,
      spacing: 'compact',
      shadowStyle: 'none',
      animationSpeed: 150,
      fontsUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap'
    }
  }
]
