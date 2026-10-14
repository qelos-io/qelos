import { isColorDark, parseHex } from '../../core/services/theme';

// ---------- the draft ----------

export type AppearanceArea = 'brand' | 'colors' | 'type' | 'shape' | 'layout' | 'advanced';

/** Every appearance setting the page edits. The page works on a copy of these and publishes them together. */
export interface ThemeDraft {
  colorsPalette: Record<string, string>;
  fontFamily: string;
  headingsFontFamily: string;
  baseFontSize: number;
  borderRadius: number;
  buttonRadius: number;
  spacing: 'compact' | 'normal' | 'comfortable';
  shadowStyle: 'none' | 'light' | 'medium' | 'heavy';
  animationSpeed: number;
  layoutStyle: 'classic' | 'main-bordered' | 'stacked-header';
  navigationLayout: 'icon-text' | 'icon-above' | 'icons-only' | 'text-only' | 'compact';
  logoUrl: string;
  smallLogoUrl: string;
  themeStylesUrl: string;
  scriptUrl: string;
}

const AREA_KEYS: Record<AppearanceArea, (keyof ThemeDraft)[]> = {
  brand: ['logoUrl', 'smallLogoUrl'],
  colors: ['colorsPalette'],
  type: ['fontFamily', 'headingsFontFamily', 'baseFontSize'],
  shape: ['borderRadius', 'buttonRadius', 'spacing', 'shadowStyle', 'animationSpeed'],
  layout: ['layoutStyle', 'navigationLayout'],
  advanced: ['themeStylesUrl', 'scriptUrl'],
};

export const DEFAULT_SYSTEM_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function draftFromConfig(config: Record<string, any>): ThemeDraft {
  const palette = config.colorsPalette || {};
  return {
    colorsPalette: clone(palette),
    fontFamily: config.fontFamily || palette.fontFamily || DEFAULT_SYSTEM_FONT,
    headingsFontFamily: config.headingsFontFamily || config.fontFamily || palette.headingsFontFamily || palette.fontFamily || DEFAULT_SYSTEM_FONT,
    baseFontSize: config.baseFontSize || palette.baseFontSize || 16,
    borderRadius: config.borderRadius ?? palette.borderRadius ?? 5,
    buttonRadius: config.buttonRadius ?? palette.buttonRadius ?? config.borderRadius ?? 5,
    spacing: config.spacing || palette.spacing || 'normal',
    shadowStyle: config.shadowStyle || palette.shadowStyle || 'light',
    animationSpeed: config.animationSpeed ?? palette.animationSpeed ?? 300,
    layoutStyle: config.layoutStyle || 'classic',
    navigationLayout: config.navigationLayout || 'icon-text',
    logoUrl: config.logoUrl || '',
    smallLogoUrl: config.smallLogoUrl || '',
    themeStylesUrl: config.themeStylesUrl || '',
    scriptUrl: config.scriptUrl || '',
  };
}

/** The app configuration with the draft written over it; this is exactly what gets saved on publish. */
export function configWithDraft(config: Record<string, any>, draft: ThemeDraft) {
  return { ...config, ...clone(draft) };
}

// the web-font stylesheet lives inside the palette but belongs to typography
const colorsOf = (draft: ThemeDraft) => {
  const { fontsUrl, ...colors } = draft.colorsPalette;
  return colors;
};

export function changedAreas(base: ThemeDraft, draft: ThemeDraft): AppearanceArea[] {
  const differs = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
  return (Object.keys(AREA_KEYS) as AppearanceArea[]).filter((area) => {
    if (area === 'colors') return differs(colorsOf(base), colorsOf(draft));
    const fontsChanged = area === 'type' && differs(base.colorsPalette.fontsUrl, draft.colorsPalette.fontsUrl);
    return fontsChanged || AREA_KEYS[area].some((key) => differs(base[key], draft[key]));
  });
}

/** A preset theme replaces colours, fonts and shape; brand assets and layout are left as they are. */
export function applyPresetToDraft(draft: ThemeDraft, palette: Record<string, any>): ThemeDraft {
  return {
    ...draft,
    colorsPalette: clone(palette),
    borderRadius: palette.borderRadius ?? draft.borderRadius,
    buttonRadius: palette.buttonRadius ?? palette.borderRadius ?? draft.buttonRadius,
    baseFontSize: palette.baseFontSize ?? draft.baseFontSize,
    fontFamily: palette.fontFamily ?? draft.fontFamily,
    headingsFontFamily: palette.headingsFontFamily ?? palette.fontFamily ?? draft.headingsFontFamily,
    spacing: palette.spacing ?? draft.spacing,
    shadowStyle: palette.shadowStyle ?? draft.shadowStyle,
    animationSpeed: palette.animationSpeed ?? draft.animationSpeed,
  };
}

// ---------- colours ----------

export type ColorGroup = 'brand' | 'surfaces' | 'text' | 'navigation' | 'buttons';

export interface ColorField {
  key: string;
  label: string;
  hint: string;
  group: ColorGroup;
  /** optional colours fall back to another one when empty */
  optional?: boolean;
}

export const COLOR_GROUPS: { key: ColorGroup; label: string }[] = [
  { key: 'brand', label: 'Brand' },
  { key: 'surfaces', label: 'Page and cards' },
  { key: 'text', label: 'Text and inputs' },
  { key: 'navigation', label: 'Navigation' },
  { key: 'buttons', label: 'Buttons and focus' },
];

export const COLOR_FIELDS: ColorField[] = [
  { key: 'mainColor', label: 'Main color', hint: 'Primary actions, active tabs and highlights', group: 'brand' },
  { key: 'mainColorLight', label: 'Main color, light', hint: 'Soft backgrounds behind brand elements', group: 'brand' },
  { key: 'secondaryColor', label: 'Secondary color', hint: 'Navigation text and accents', group: 'brand' },
  { key: 'thirdColor', label: 'Accent color', hint: 'Highlights in the navigation', group: 'brand' },
  { key: 'bgColor', label: 'Page background', hint: 'Behind everything', group: 'surfaces' },
  { key: 'surfaceColor', label: 'Card background', hint: 'Cards, panels and dialogs. Empty: white, or the dark tone on dark themes', group: 'surfaces', optional: true },
  { key: 'negativeColor', label: 'Dark tone', hint: 'Strong surfaces and muted navigation text', group: 'surfaces' },
  { key: 'bordersColor', label: 'Borders', hint: 'Dividers and outlines', group: 'surfaces' },
  { key: 'textColor', label: 'Text', hint: 'Body text and headings', group: 'text' },
  { key: 'linksColor', label: 'Links', hint: 'Text links', group: 'text' },
  { key: 'inputsTextColor', label: 'Input text', hint: 'Text typed into fields', group: 'text' },
  { key: 'inputsBgColor', label: 'Input background', hint: 'Fields and selects', group: 'text' },
  { key: 'navigationBgColor', label: 'Navigation background', hint: 'The sidebar and the mobile menu', group: 'navigation' },
  { key: 'buttonBgColor', label: 'Button background', hint: 'Empty: the main color', group: 'buttons', optional: true },
  { key: 'buttonTextColor', label: 'Button text', hint: 'Empty: black or white, picked for readability', group: 'buttons', optional: true },
  { key: 'focusColor', label: 'Focus outline', hint: 'Keyboard focus rings. Empty: the main color', group: 'buttons', optional: true },
];

/** #rgb or #rrggbb, normalised to lowercase #rrggbb; null when it is not a valid colour. */
export function normalizeHex(value: string): string | null {
  const rgb = parseHex((value || '').trim().startsWith('#') ? value.trim() : `#${(value || '').trim()}`);
  if (!rgb) return null;
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours (1 to 21), or null when either is not a valid hex colour. */
export function contrastRatio(foreground: string, background: string): number | null {
  const a = luminance(foreground);
  const b = luminance(background);
  if (a === null || b === null) return null;
  const [light, dark] = a >= b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** Black or white, whichever reads better on the background. */
export function readableOn(background: string): '#000000' | '#ffffff' {
  const onWhite = contrastRatio('#ffffff', background) ?? 0;
  const onBlack = contrastRatio('#000000', background) ?? 0;
  return onBlack >= onWhite ? '#000000' : '#ffffff';
}

export interface ThemeCheck {
  key: string;
  label: string;
  foreground: string;
  background: string;
  ratio: number;
  minimum: number;
  pass: boolean;
}

/** The readability checks for the colours that actually meet on screen. Pairs with a missing colour are skipped. */
export function themeChecks(palette: Record<string, string>): ThemeCheck[] {
  const bg = palette.bgColor;
  const surface = palette.surfaceColor || (bg && isColorDark(bg) && palette.negativeColor ? palette.negativeColor : '#ffffff');
  const buttonBg = palette.buttonBgColor || palette.mainColor;
  const pairs: [string, string, string | undefined, string | undefined, number][] = [
    ['text-page', 'Text on the page', palette.textColor, bg, 4.5],
    ['text-card', 'Text on cards', palette.textColor, surface, 4.5],
    ['links', 'Links on the page', palette.linksColor, bg, 4.5],
    ['buttons', 'Button text', palette.buttonTextColor || (buttonBg ? readableOn(buttonBg) : undefined), buttonBg, 4.5],
    ['navigation', 'Navigation text', palette.secondaryColor, palette.navigationBgColor, 4.5],
    ['inputs', 'Text in fields', palette.inputsTextColor, palette.inputsBgColor, 4.5],
    ['focus', 'Focus outline', palette.focusColor || palette.mainColor, bg, 3],
  ];
  return pairs.flatMap(([key, label, foreground, background, minimum]) => {
    if (!foreground || !background) return [];
    const ratio = contrastRatio(foreground, background);
    if (ratio === null) return [];
    return [{ key, label, foreground, background, ratio, minimum, pass: ratio >= minimum }];
  });
}

// ---------- fonts ----------

export interface FontChoice {
  /** shown in the picker */
  label: string;
  /** the CSS font-family stack that gets saved */
  family: string;
  /** the Google Fonts family spec; fonts without it are expected to be installed on the device */
  google?: string;
}

const SANS_FALLBACK = "'Segoe UI', Roboto, sans-serif";

export const FONT_CHOICES: FontChoice[] = [
  { label: 'System UI', family: DEFAULT_SYSTEM_FONT },
  { label: 'Inter', family: `Inter, -apple-system, BlinkMacSystemFont, ${SANS_FALLBACK}`, google: 'Inter:wght@400;500;600;700' },
  { label: 'Plus Jakarta Sans', family: `'Plus Jakarta Sans', ${SANS_FALLBACK}`, google: 'Plus+Jakarta+Sans:wght@400;500;600;700' },
  { label: 'Manrope', family: `Manrope, ${SANS_FALLBACK}`, google: 'Manrope:wght@400;500;600;700' },
  { label: 'Sora', family: `Sora, ${SANS_FALLBACK}`, google: 'Sora:wght@400;500;600;700' },
  { label: 'Space Grotesk', family: `'Space Grotesk', ${SANS_FALLBACK}`, google: 'Space+Grotesk:wght@400;500;600;700' },
  { label: 'IBM Plex Sans', family: `'IBM Plex Sans', ${SANS_FALLBACK}`, google: 'IBM+Plex+Sans:wght@400;500;600;700' },
  { label: 'Source Sans 3', family: `'Source Sans 3', ${SANS_FALLBACK}`, google: 'Source+Sans+3:wght@400;500;600;700' },
  { label: 'Fraunces', family: "Fraunces, Georgia, 'Times New Roman', serif", google: 'Fraunces:wght@400;600;700' },
  { label: 'Playfair Display', family: "'Playfair Display', 'Times New Roman', serif", google: 'Playfair+Display:wght@400;600;700' },
  { label: 'Arial', family: 'Arial, sans-serif' },
  { label: 'Helvetica', family: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', family: 'Verdana, Geneva, sans-serif' },
  { label: 'Georgia', family: 'Georgia, serif' },
  { label: 'Times New Roman', family: 'Times New Roman, serif' },
  { label: 'Courier New', family: 'Courier New, monospace' },
];

/** The first family of a font stack, without quotes: "'Space Grotesk', sans-serif" becomes "Space Grotesk". */
export function firstFamily(stack: string): string {
  return (stack || '').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
}

export function findFontChoice(stack: string): FontChoice | undefined {
  const name = firstFamily(stack).toLowerCase();
  if (!name) return undefined;
  return FONT_CHOICES.find((choice) => firstFamily(choice.family).toLowerCase() === name) ?? (name.startsWith('-apple-system') ? FONT_CHOICES[0] : undefined);
}

/**
 * The Google Fonts stylesheet that provides the given font stacks, or '' when none of them needs one.
 * Fonts that are not in the catalog keep the stylesheet the theme already has.
 */
export function fontsUrlFor(stacks: string[], currentUrl = ''): string {
  const choices = stacks.map(findFontChoice);
  if (choices.some((choice) => !choice) && currentUrl) return currentUrl;
  const specs = [...new Set(choices.flatMap((choice) => (choice?.google ? [choice.google] : [])))];
  return specs.length ? `https://fonts.googleapis.com/css2?${specs.map((spec) => `family=${spec}`).join('&')}&display=swap` : '';
}

export const isHttpUrl = (value: string) => !value || /^https?:\/\/\S+$/i.test(value.trim());
