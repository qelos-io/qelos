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
    name: 'Modern Blue',
    description: 'Clean and professional design with blue accents',
    colors: [
      '#2563eb', // Main blue
      '#3b82f6', // Light blue
      '#1e40af', // Dark blue
      '#f8fafc', // Light background
      '#e2e8f0', // Border color
      '#94a3b8', // Muted text
      '#0f172a', // Dark text
    ],
    palette: {
      mainColor: '#2563eb',
      mainColorLight: '#3b82f6',
      textColor: '#0f172a',
      secondaryColor: '#f8fafc',
      thirdColor: '#93c5fd',
      bgColor: '#f8fafc',
      bordersColor: '#e2e8f0',
      inputsTextColor: '#0f172a',
      inputsBgColor: '#ffffff',
      linksColor: '#2563eb',
      navigationBgColor: '#1e3a8a',
      negativeColor: '#29dfff',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#2563eb',
      focusColor: '#3b82f6',
      fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, \'Open Sans\', \'Helvetica Neue\', sans-serif',
      headingsFontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, \'Open Sans\', \'Helvetica Neue\', sans-serif',
      baseFontSize: 16,
      borderRadius: 6,
      buttonRadius: 6,
      spacing: 'normal',
      shadowStyle: 'light',
      animationSpeed: 300
    }
  },
  {
    name: 'Velocitech Brand',
    description: 'Qelos brand colors with modern typography',
    colors: [
      '#264653', // Main color
      '#1c4252', // Main color light
      '#2a9d8f', // Secondary color
      '#e9c46a', // Accent color
      '#f4a261', // Highlight
      '#ffffff', // Background
    ],
    palette: {
      mainColor: '#264653',
      mainColorLight: '#1c4252',
      textColor: '#1c4252',
      secondaryColor: '#2a9d8f',
      thirdColor: '#e9c46a',
      bgColor: '#ffffff',
      bordersColor: '#e2e8f0',
      inputsTextColor: '#1c4252',
      inputsBgColor: '#f8fafc',
      linksColor: '#2a9d8f',
      navigationBgColor: '#1c4252',
      negativeColor: '#9b7a3a',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#264653',
      focusColor: '#2a9d8f',
      fontFamily: 'Helvetica, Arial, sans-serif',
      headingsFontFamily: 'Helvetica, Arial, sans-serif',
      baseFontSize: 16,
      borderRadius: 4,
      buttonRadius: 4,
      spacing: 'normal',
      shadowStyle: 'light',
      animationSpeed: 250
    }
  },
  {
    name: 'Minimal Light',
    description: 'Clean, minimal design with subtle shadows',
    colors: [
      '#8389f7', // Main color (indigo)
      '#818cf8', // Light indigo
      '#4f46e5', // Dark indigo
      '#160461', // Third color
      '#dcdcfa', // Background
      '#f9fafb', // Secondary background
      '#111827', // Text
    ],
    palette: {
      mainColor: '#8389f7',
      mainColorLight: '#818cf8',
      textColor: '#111827',
      secondaryColor: '#4f46e5',
      thirdColor: '#160461',
      bgColor: '#dcdcfa',
      bordersColor: '#e5e7eb',
      inputsTextColor: '#111827',
      inputsBgColor: '#f9fafb',
      linksColor: '#4f46e5',
      navigationBgColor: '#cdd1fa',
      negativeColor: '#ebf2ce',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#6366f1',
      focusColor: '#818cf8',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
      headingsFontFamily: 'Inter, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
      baseFontSize: 16,
      borderRadius: 8,
      buttonRadius: 8,
      spacing: 'comfortable',
      shadowStyle: 'medium',
      animationSpeed: 350
    }
  },
  {
    name: 'Dark Mode',
    description: 'Modern dark theme with vibrant accents',
    colors: [
      '#8b5cf6', // Main color (violet)
      '#a78bfa', // Light violet
      '#7c3aed', // Dark violet
      '#1e1e1e', // Background
      '#2d2d2d', // Secondary background
      '#ffffff', // Text
    ],
    palette: {
      mainColor: '#8b5cf6',
      mainColorLight: '#a78bfa',
      textColor: '#ffffff', // Brighter text for better contrast
      secondaryColor: '#7c3aed',
      thirdColor: '#c4b5fd',
      bgColor: '#1e1e1e',
      bordersColor: '#4b5563',
      inputsTextColor: '#ffffff', // Brighter text for better contrast
      inputsBgColor: '#2d2d2d',
      linksColor: '#a78bfa',
      navigationBgColor: '#171717',
      negativeColor: '#f87171',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#8b5cf6',
      focusColor: '#a78bfa',
      fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
      headingsFontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
      baseFontSize: 16,
      borderRadius: 6,
      buttonRadius: 6,
      spacing: 'normal',
      shadowStyle: 'medium',
      animationSpeed: 300
    }
  },
  {
    name: 'Soft Pastel',
    description: 'Gentle pastel colors with rounded elements',
    colors: [
      '#06b6d4', // Main color (cyan)
      '#22d3ee', // Light cyan
      '#0891b2', // Dark cyan
      '#0b4f57', // Third color
      '#f0fdfa', // Background
      '#ccfbf1', // Secondary background
      '#134e4a', // Text
    ],
    palette: {
      mainColor: '#06b6d4',
      mainColorLight: '#22d3ee',
      textColor: '#134e4a',
      secondaryColor: '#0891b2',
      thirdColor: '#0b4f57',
      bgColor: '#f0fdfa',
      bordersColor: '#99f6e4',
      inputsTextColor: '#134e4a',
      inputsBgColor: '#ffffff',
      linksColor: '#0891b2',
      navigationBgColor: '#ecfeff',
      negativeColor: '#e7f598',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#06b6d4',
      focusColor: '#22d3ee',
      fontFamily: 'Quicksand, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
      headingsFontFamily: 'Quicksand, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
      baseFontSize: 16,
      borderRadius: 12,
      buttonRadius: 24,
      spacing: 'comfortable',
      shadowStyle: 'light',
      animationSpeed: 400
    }
  },
  {
    name: 'Corporate Green',
    description: 'Professional green palette with clean typography',
    colors: [
      '#3ba884', // Main color (emerald)
      '#34d399', // Light emerald
      '#059669', // Dark emerald
      '#f9fafb', // Background
      '#ecfdf5', // Secondary background
      '#064e3b', // Text
    ],
    palette: {
      mainColor: '#3ba884',
      mainColorLight: '#34d399',
      textColor: '#064e3b',
      secondaryColor: '#059669',
      thirdColor: '#082b1b',
      bgColor: '#e9f0ce',
      bordersColor: '#d1d5db',
      inputsTextColor: '#064e3b',
      inputsBgColor: '#ffffff',
      linksColor: '#059669',
      navigationBgColor: '#ecfdf5',
      negativeColor: '#ebebeb',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#10b981',
      focusColor: '#34d399',
      fontFamily: 'Georgia, serif',
      headingsFontFamily: 'Georgia, serif',
      baseFontSize: 16,
      borderRadius: 4,
      buttonRadius: 4,
      spacing: 'normal',
      shadowStyle: 'light',
      animationSpeed: 300
    }
  },
  {
    name: 'Warm Sunset',
    description: 'Warm orange and red tones with comfortable spacing',
    colors: [
      '#f97316', // Main color (orange)
      '#fb923c', // Light orange
      '#ea580c', // Dark orange
      '#c26e08', // Background
      '#ffedd5', // Secondary background
      '#7c2d12', // Text
    ],
    palette: {
      mainColor: '#f97316',
      mainColorLight: '#fb923c',
      textColor: '#7c2d12',
      secondaryColor: '#ea580c',
      thirdColor: '#7c2d12',
      bgColor: '#c26e08',
      bordersColor: '#fed7aa',
      inputsTextColor: '#7c2d12',
      inputsBgColor: '#ffffff',
      linksColor: '#ea580c',
      navigationBgColor: '#ffedd5',
      negativeColor: '#f8fae8',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#f97316',
      focusColor: '#fb923c',
      fontFamily: 'Verdana, Geneva, sans-serif',
      headingsFontFamily: 'Verdana, Geneva, sans-serif',
      baseFontSize: 16,
      borderRadius: 8,
      buttonRadius: 8,
      spacing: 'comfortable',
      shadowStyle: 'medium',
      animationSpeed: 350
    }
  },
  {
    name: 'Tech Purple',
    description: 'Bold purple theme with sharp edges for tech products',
    colors: [
      '#9333ea', // Main color (purple)
      '#a855f7', // Light purple
      '#7e22ce', // Dark purple
      '#faf5ff', // Background
      '#f3e8ff', // Secondary background
      '#581c87', // Text
    ],
    palette: {
      mainColor: '#9333ea',
      mainColorLight: '#a855f7',
      textColor: '#581c87',
      secondaryColor: '#7e22ce',
      thirdColor: '#581c87',
      bgColor: '#faf5ff',
      bordersColor: '#e9d5ff',
      inputsTextColor: '#581c87',
      inputsBgColor: '#ffffff',
      linksColor: '#7e22ce',
      navigationBgColor: '#f3e8ff',
      negativeColor: '#fcf2b3',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#9333ea',
      focusColor: '#a855f7',
      fontFamily: 'Arial, sans-serif',
      headingsFontFamily: 'Arial, sans-serif',
      baseFontSize: 16,
      borderRadius: 2,
      buttonRadius: 2,
      spacing: 'compact',
      shadowStyle: 'medium',
      animationSpeed: 250
    }
  }
]