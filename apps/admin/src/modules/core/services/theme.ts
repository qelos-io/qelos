// The theme is a pure function of the saved appearance settings. App.vue applies it to the whole app and the
// Appearance page applies the very same output to a preview, so what you see there is what gets published.

const HEX_COLOR_SHORT_LENGTH = 3;
const HEX_COLOR_FULL_LENGTH = 6;
const HEX_RADIX = 16;
const RGB_MAX_VALUE = 255;
const DARK_THRESHOLD = 0.5;

export const DEFAULT_BORDER_RADIUS = 5;
export const DEFAULT_BASE_FONT_SIZE = 16;
export const DEFAULT_ANIMATION_SPEED = 300;
const SPACING_COMPACT = '4px';
const SPACING_COMPACT_CONTENT = '8px';
const SPACING_COMFORTABLE = '12px';
const SPACING_COMFORTABLE_CONTENT = '24px';
const SPACING_DEFAULT = '8px';
const SPACING_DEFAULT_CONTENT = '16px';

export type ThemePalette = Record<string, any>;

export interface ThemeSettings {
  cssUrl?: string;
  palette?: ThemePalette;
  borderRadius: number | string;
  baseFontSize: number | string;
  fontFamily: string;
  headingsFontFamily: string;
  buttonRadius: number | string;
  spacing: string;
  shadowStyle: string;
  animationSpeed: number | string;
}

/** Parses #rgb / #rrggbb. Returns null for anything else. */
export function parseHex(hexColor: unknown): [number, number, number] | null {
  if (!hexColor || typeof hexColor !== 'string') return null;
  const hex = hexColor.replace('#', '').trim();
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  if (hex.length === HEX_COLOR_SHORT_LENGTH) {
    return [0, 1, 2].map((i) => parseInt(hex.charAt(i) + hex.charAt(i), HEX_RADIX)) as [number, number, number];
  }
  if (hex.length === HEX_COLOR_FULL_LENGTH) {
    return [0, 2, 4].map((i) => parseInt(hex.substring(i, i + 2), HEX_RADIX)) as [number, number, number];
  }
  return null;
}

/** Whether a colour is dark, by perceived brightness (0.299R + 0.587G + 0.114B). */
export function isColorDark(hexColor: string): boolean {
  const rgb = parseHex(hexColor);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return (0.299 * r + 0.587 * g + 0.114 * b) / RGB_MAX_VALUE < DARK_THRESHOLD;
}

/** The settings the theme is built from, with the same precedence the app has always used: top-level values win over the palette's own. */
export function resolveThemeSettings(config: Record<string, any>): ThemeSettings {
  const palette = config.colorsPalette;
  return {
    cssUrl: config.themeStylesUrl,
    palette,
    borderRadius: config.borderRadius || palette?.borderRadius || 0,
    baseFontSize: config.baseFontSize || palette?.baseFontSize || DEFAULT_BASE_FONT_SIZE,
    fontFamily: config.fontFamily || palette?.fontFamily || 'Arial, sans-serif',
    headingsFontFamily: config.headingsFontFamily || palette?.headingsFontFamily || 'Arial, sans-serif',
    buttonRadius: config.buttonRadius || palette?.buttonRadius || 0,
    spacing: config.spacing || palette?.spacing || '10px',
    shadowStyle: config.shadowStyle || palette?.shadowStyle || 'md',
    animationSpeed: config.animationSpeed || palette?.animationSpeed || 'normal',
  };
}

/** The stylesheet that themes the whole application. */
export function buildThemeCss(settings: ThemeSettings): string {
  const { cssUrl, borderRadius, baseFontSize, fontFamily, headingsFontFamily, buttonRadius, spacing, shadowStyle, animationSpeed } = settings;
  const palette = settings.palette || {};
  const importCss = cssUrl ? `@import "${cssUrl}";` : '';
  const isDarkTheme = palette?.bgColor ? isColorDark(palette.bgColor) : false;

  return `
    ${importCss}
    :root {
      /* Base design variables */
      --border-radius: ${typeof borderRadius === 'number' ? borderRadius : DEFAULT_BORDER_RADIUS}px;
      --base-font-size: ${typeof baseFontSize === 'number' && baseFontSize > 0 ? baseFontSize : DEFAULT_BASE_FONT_SIZE}px;
      --button-radius: ${typeof buttonRadius === 'number' ? buttonRadius : borderRadius || 0}px;
      
      /* Typography */
      --font-family: ${fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'};
      --headings-font-family: ${headingsFontFamily || fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'};
      
      /* Spacing and layout */
      --spacing: ${spacing?.includes('px') ? spacing : spacing === 'compact' ? SPACING_COMPACT : spacing === 'comfortable' ? SPACING_COMFORTABLE : SPACING_DEFAULT};
      --content-spacing: ${spacing?.includes('px') ? spacing : spacing === 'compact' ? SPACING_COMPACT_CONTENT : spacing === 'comfortable' ? SPACING_COMFORTABLE_CONTENT : SPACING_DEFAULT_CONTENT};
      --element-spacing: var(--spacing);
      
      /* Animation */
      --transition-speed: ${typeof animationSpeed === 'number' ? animationSpeed : DEFAULT_ANIMATION_SPEED}ms;
      
      /* Shadows */
      --box-shadow: ${shadowStyle === 'none' ? 'none' : 
                       shadowStyle === 'light' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 
                       shadowStyle === 'medium' ? '0 4px 8px rgba(0, 0, 0, 0.15)' : 
                       shadowStyle === 'heavy' ? '0 8px 16px rgba(0, 0, 0, 0.2)' : 
                       '0 2px 4px rgba(0, 0, 0, 0.1)'};
      
      /* Colors */
      ${palette.bgColor ? `--body-bg: ${palette.bgColor};` : ''}
      ${palette.mainColor ? `--main-color: ${palette.mainColor};` : ''}
      ${palette.mainColorLight ? `--main-color-light: ${palette.mainColorLight};` : ''}
      ${palette.textColor ? `--text-color: ${palette.textColor};` : ''}
      ${palette.secondaryColor ? `--secondary-color: ${palette.secondaryColor};` : ''}
      ${palette.thirdColor ? `--third-color: ${palette.thirdColor};` : '--third-color: #c6dccc;'}
      ${palette.linksColor ? `--link: ${palette.linksColor};` : ''}
      ${palette.bordersColor ? `--border-color: ${palette.bordersColor};` : ''}
      ${palette.inputsTextColor ? `--inputs-text-color: ${palette.inputsTextColor};` : ''}
      ${palette.inputsBgColor ? `--inputs-bg-color: ${palette.inputsBgColor};` : ''}
      ${palette.navigationBgColor ? `--nav-bg-color: ${palette.navigationBgColor};` : ''}
      ${palette.negativeColor ? `--negative-color: ${palette.negativeColor};` : '--negative-color: #254044;'}
      
      /* Surfaces and Element Plus tokens derived from the palette, so every component follows the theme */
      --surface: ${palette.surfaceColor || (isDarkTheme && palette.negativeColor ? palette.negativeColor : '#ffffff')};
      --el-bg-color: var(--surface);
      --el-bg-color-overlay: var(--surface);
      --el-bg-color-page: var(--body-bg, #f5f5f9);
      --el-fill-color-blank: var(--surface);
      --el-fill-color-lighter: color-mix(in srgb, var(--text-color, #000) 3%, var(--surface));
      --el-fill-color-light: color-mix(in srgb, var(--text-color, #000) 5%, var(--surface));
      --el-fill-color: color-mix(in srgb, var(--text-color, #000) 8%, var(--surface));
      --el-fill-color-dark: color-mix(in srgb, var(--text-color, #000) 12%, var(--surface));
      --el-border-color-extra-light: color-mix(in srgb, var(--border-color, #eee) 45%, var(--surface));
      --el-border-color-lighter: color-mix(in srgb, var(--border-color, #eee) 70%, var(--surface));
      --el-border-color-light: var(--border-color, #eee);
      --el-border-color: color-mix(in srgb, var(--border-color, #eee) 85%, var(--text-color, #000));
      --el-border-color-dark: color-mix(in srgb, var(--border-color, #eee) 65%, var(--text-color, #000));
      --el-text-color-secondary: color-mix(in srgb, var(--text-color, #000) 62%, var(--surface));
      --el-text-color-placeholder: color-mix(in srgb, var(--text-color, #000) 42%, var(--surface));
      --el-color-primary-light-3: color-mix(in srgb, var(--el-color-primary) 70%, var(--surface));
      --el-color-primary-light-5: color-mix(in srgb, var(--el-color-primary) 50%, var(--surface));
      --el-color-primary-light-7: color-mix(in srgb, var(--el-color-primary) 30%, var(--surface));
      --el-color-primary-light-8: color-mix(in srgb, var(--el-color-primary) 20%, var(--surface));
      --el-color-primary-light-9: color-mix(in srgb, var(--el-color-primary) 10%, var(--surface));
      --el-color-primary-dark-2: color-mix(in srgb, var(--el-color-primary) 80%, #000);
      --layout-header-bg: var(--surface);
      --nav-muted-color: ${isDarkTheme ? 'color-mix(in srgb, var(--secondary-color) 58%, var(--nav-bg-color))' : 'var(--negative-color)'};
      ${isDarkTheme ? '--el-color-white: var(--body-bg);' : ''}

      /* New color variables */
      --button-text-color: ${palette.buttonTextColor || '#ffffff'};
      ${palette.buttonBgColor ? `--button-bg-color: ${palette.buttonBgColor};` : palette.mainColor ? `--button-bg-color: ${palette.mainColor};` : '--button-bg-color: #409eff;'}
      ${palette.focusColor ? `--focus-color: ${palette.focusColor};` : palette.mainColor ? `--focus-color: ${palette.mainColor};` : '--focus-color: #409eff;'}
    }
    
    /* without an explicit button text colour, pick black or white from the button colour's lightness so light brand colours stay readable */
    ${palette.buttonTextColor ? '' : `@supports (color: oklch(from red l c h)) {
      :root {
        --button-text-color: oklch(from var(--button-bg-color) clamp(0, calc((0.66 - l) * 1000), 1) 0 0);
      }
    }`}

    /* Element Plus component overrides for dark themes */
    ${isDarkTheme ? `
      /* Tab styles for dark themes */
      .el-tabs__nav-scroll {
        background-color: var(--surface);
      }
      .el-tabs .el-tabs__header .el-tabs__item {
        background-color: var(--surface);
        color: var(--el-text-color-secondary);
      }
      .el-tabs .el-tabs__header .el-tabs__item.is-active {
        color: var(--text-color);
      }
      .el-tabs__active-bar {
        background-color: ${palette.mainColor || '#8b5cf6'} !important;
      }
      .el-tabs__nav-wrap::after {
        background-color: rgba(255, 255, 255, 0.1) !important;
      }
      
      /* Form elements */
      .el-form-item__label {
        color: rgba(255, 255, 255, 0.8);
      }
      
      /* Card styles */
      .el-card {
        background-color: var(--negative-color);
        border-color: rgba(255, 255, 255, 0.1) !important;
        color: var(--main-color);
      }
      .el-card .el-card__header, .el-card h3, .el-card .el-card__body, .el-card .el-card__body > :is(label, p, div), .el-card .el-card__body .el-form-item__label {
        color: var(--main-color);
      }
      
      /* Button styles */
      .el-button--default {
        background-color: var(--negative-color);
        border-color: rgba(255, 255, 255, 0.2) !important;
        color: rgba(255, 255, 255, 0.8) !important;
      }
      
      /* Input styles */
      .el-input__inner {
        border-color: rgba(255, 255, 255, 0.2) !important;
        color: var(--negative-color);
      }
      
      /* Select styles */
      .el-select-dropdown {
        background-color: var(--negative-color);
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      .el-select-dropdown__item.hover, .el-select-dropdown__item:hover {
        background-color: var(--negative-color);
      }
      .el-select-dropdown__list li {
        color: var(--main-color);
      }
      
      /* Dialog styles */
      .el-dialog {
        background-color: ${palette.bgColor || '#1e1e1e'} !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      .el-dialog__title {
        color: ${palette.textColor || '#ffffff'} !important;
      }
      
      /* Table styles */
      .el-table {
        background-color: ${palette.bgColor || '#1e1e1e'} !important;
        color: ${palette.textColor || '#ffffff'} !important;
      }
      .el-table th, .el-table tr {
        background-color: ${palette.bgColor || '#1e1e1e'} !important;
      }
      .el-table--border, .el-table--group, .el-table td, .el-table th.is-leaf {
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      
      /* Dropdown styles */
      .el-dropdown-menu {
        background-color: ${palette.navigationBgColor || '#2d2d2d'} !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      .el-dropdown-menu__item {
        color: var(--text-color);
      }
      .el-dropdown-menu__item:hover {
        background-color: var(--el-fill-color-light);
      }
    ` : ''}
  `;
}

/**
 * The custom properties a theme defines on :root, as an object. Used to scope a theme to a preview element:
 * the declarations come from the generated stylesheet itself, so the preview can never drift from the real thing.
 */
export function themeVariables(css: string): Record<string, string> {
  const variables: Record<string, string> = {};
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const block of withoutComments.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const declaration of block[1].split(';')) {
      const index = declaration.indexOf(':');
      if (index === -1) continue;
      const name = declaration.slice(0, index).trim();
      const value = declaration.slice(index + 1).trim();
      if (name.startsWith('--') && value) variables[name] = value;
    }
  }
  return variables;
}
