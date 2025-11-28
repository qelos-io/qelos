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
  };
}

export const PALETTES: DesignPalette[] = [
  {
    name: 'Aurora Slate',
    description: 'Balanced blue and slate neutrals crafted for data-dense dashboards',
    colors: [
      '#2563eb',
      '#60a5fa',
      '#0ea5e9',
      '#f5f7fb',
      '#d5dbe7',
      '#0f172a'
    ],
    palette: {
      mainColor: '#2563eb',
      mainColorLight: '#60a5fa',
      textColor: '#0f172a',
      secondaryColor: '#0ea5e9',
      thirdColor: '#14b8a6',
      bgColor: '#f5f7fb',
      bordersColor: '#d5dbe7',
      inputsTextColor: '#0f172a',
      inputsBgColor: '#ffffff',
      linksColor: '#1d4ed8',
      navigationBgColor: '#111c36',
      negativeColor: '#ef4444',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#2563eb',
      focusColor: '#38bdf8',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
      headingsFontFamily: "Space Grotesk, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      baseFontSize: 16,
      borderRadius: 8,
      buttonRadius: 8,
      spacing: 'normal',
      shadowStyle: 'medium',
      animationSpeed: 280
    }
  },
  {
    name: 'Velocitech Core',
    description: 'Refined take on the Velocitech brand with high-contrast surfaces',
    colors: [
      '#2a9d8f',
      '#5eead4',
      '#1c4252',
      '#fcfcfc',
      '#d7dbdf',
      '#f4a261'
    ],
    palette: {
      mainColor: '#2a9d8f',
      mainColorLight: '#5eead4',
      textColor: '#1c4252',
      secondaryColor: '#f4a261',
      thirdColor: '#e9c46a',
      bgColor: '#fcfcfc',
      bordersColor: '#d7dbdf',
      inputsTextColor: '#1c4252',
      inputsBgColor: '#ffffff',
      linksColor: '#2a9d8f',
      navigationBgColor: '#102129',
      negativeColor: '#f87171',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#1c4252',
      focusColor: '#5eead4',
      fontFamily: "Sora, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      headingsFontFamily: "Space Grotesk, Sora, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      baseFontSize: 16,
      borderRadius: 6,
      buttonRadius: 8,
      spacing: 'normal',
      shadowStyle: 'light',
      animationSpeed: 260
    }
  },
  {
    name: 'Nordic Mist',
    description: 'Soft indigo primary with mint accents for calm, minimal layouts',
    colors: [
      '#6366f1',
      '#a5b4fc',
      '#14b8a6',
      '#f9fafb',
      '#e2e8f0',
      '#111827'
    ],
    palette: {
      mainColor: '#6366f1',
      mainColorLight: '#a5b4fc',
      textColor: '#111827',
      secondaryColor: '#14b8a6',
      thirdColor: '#0f172a',
      bgColor: '#f9fafb',
      bordersColor: '#e2e8f0',
      inputsTextColor: '#111827',
      inputsBgColor: '#ffffff',
      linksColor: '#4338ca',
      navigationBgColor: '#1f2937',
      negativeColor: '#f43f5e',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#4f46e5',
      focusColor: '#34d399',
      fontFamily: "IBM Plex Sans, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      headingsFontFamily: "Space Grotesk, IBM Plex Sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      baseFontSize: 16,
      borderRadius: 10,
      buttonRadius: 12,
      spacing: 'comfortable',
      shadowStyle: 'light',
      animationSpeed: 300
    }
  },
  {
    name: 'Cassia Ember',
    description: 'Warm productivity theme with editorial typography and soft surfaces',
    colors: [
      '#ea580c',
      '#fb923c',
      '#b54708',
      '#fff7ed',
      '#fed7aa',
      '#422006'
    ],
    palette: {
      mainColor: '#ea580c',
      mainColorLight: '#fb923c',
      textColor: '#422006',
      secondaryColor: '#f97316',
      thirdColor: '#b45309',
      bgColor: '#fff7ed',
      bordersColor: '#fed7aa',
      inputsTextColor: '#422006',
      inputsBgColor: '#ffffff',
      linksColor: '#c2410c',
      navigationBgColor: '#422006',
      negativeColor: '#dc2626',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#ea580c',
      focusColor: '#fdba74',
      fontFamily: "Source Sans 3, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      headingsFontFamily: "Playfair Display, 'Times New Roman', serif",
      baseFontSize: 17,
      borderRadius: 12,
      buttonRadius: 20,
      spacing: 'comfortable',
      shadowStyle: 'medium',
      animationSpeed: 320
    }
  },
  {
    name: 'Eclipse Neon',
    description: 'Obsidian UI with electric teal actions and magenta detailing for analytics surfaces',
    colors: [
      '#0ea5e9',
      '#67e8f9',
      '#f472b6',
      '#080b16',
      '#101728',
      '#f4f4f5'
    ],
    palette: {
      mainColor: '#0ea5e9',
      mainColorLight: '#67e8f9',
      textColor: '#f4f4f5',
      secondaryColor: '#f472b6',
      thirdColor: '#a855f7',
      bgColor: '#080b16',
      bordersColor: '#1f2937',
      inputsTextColor: '#f8fafc',
      inputsBgColor: '#101728',
      linksColor: '#67e8f9',
      navigationBgColor: '#04060c',
      negativeColor: '#f87171',
      buttonTextColor: '#041019',
      buttonBgColor: '#0ea5e9',
      focusColor: '#67e8f9',
      fontFamily: "Sora, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      headingsFontFamily: "Space Grotesk, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      baseFontSize: 16,
      borderRadius: 8,
      buttonRadius: 10,
      spacing: 'normal',
      shadowStyle: 'medium',
      animationSpeed: 260
    }
  },
  {
    name: 'Verdant Flow',
    description: 'Fresh green system with editorial whites and soft elevation',
    colors: [
      '#0f9d58',
      '#34d399',
      '#065f46',
      '#f3f7f4',
      '#cbd5d1',
      '#0f172a'
    ],
    palette: {
      mainColor: '#0f9d58',
      mainColorLight: '#34d399',
      textColor: '#0f172a',
      secondaryColor: '#10b981',
      thirdColor: '#065f46',
      bgColor: '#f3f7f4',
      bordersColor: '#cbd5d1',
      inputsTextColor: '#0f172a',
      inputsBgColor: '#ffffff',
      linksColor: '#0f9d58',
      navigationBgColor: '#0b3b2a',
      negativeColor: '#f97316',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#0f9d58',
      focusColor: '#34d399',
      fontFamily: "Sora, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      headingsFontFamily: "Space Grotesk, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      baseFontSize: 16,
      borderRadius: 6,
      buttonRadius: 10,
      spacing: 'normal',
      shadowStyle: 'light',
      animationSpeed: 300
    }
  }
]