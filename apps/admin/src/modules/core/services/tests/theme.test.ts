import { describe, expect, it } from 'vitest';
import { buildThemeCss, isColorDark, parseHex, resolveThemeSettings, themeVariables } from '../theme';

const light = { colorsPalette: { mainColor: '#3730a3', bgColor: '#f7f8fc', textColor: '#1b1f3b', navigationBgColor: '#151833', buttonBgColor: '#4f46e5' }, borderRadius: 8, baseFontSize: 15, fontFamily: 'Inter, sans-serif', spacing: 'compact' };
const dark = { colorsPalette: { mainColor: '#a5b4fc', bgColor: '#0b0e1f', textColor: '#e5e7ff', negativeColor: '#161a33', buttonTextColor: '#0b0e1f' } };

describe('parseHex / isColorDark', () => {
  it('parses short and long hex', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#0b0e1f')).toEqual([11, 14, 31]);
    expect(parseHex('red')).toBeNull();
    expect(parseHex('#12')).toBeNull();
  });

  it('detects dark backgrounds', () => {
    expect(isColorDark('#0b0e1f')).toBe(true);
    expect(isColorDark('#f7f8fc')).toBe(false);
    expect(isColorDark('nope')).toBe(false);
  });
});

describe('resolveThemeSettings', () => {
  it('lets top-level settings win over the palette', () => {
    const settings = resolveThemeSettings({ colorsPalette: { borderRadius: 3, fontFamily: 'Georgia, serif' }, borderRadius: 12 });
    expect(settings.borderRadius).toBe(12);
    expect(settings.fontFamily).toBe('Georgia, serif');
  });
});

describe('buildThemeCss / themeVariables', () => {
  it('writes the palette and design settings as custom properties', () => {
    const variables = themeVariables(buildThemeCss(resolveThemeSettings(light)));
    expect(variables['--main-color']).toBe('#3730a3');
    expect(variables['--body-bg']).toBe('#f7f8fc');
    expect(variables['--border-radius']).toBe('8px');
    expect(variables['--base-font-size']).toBe('15px');
    expect(variables['--font-family']).toBe('Inter, sans-serif');
    expect(variables['--spacing']).toBe('4px');
    expect(variables['--surface']).toBe('#ffffff');
  });

  it('derives the surface from the dark palette and adds the dark overrides', () => {
    const css = buildThemeCss(resolveThemeSettings(dark));
    expect(themeVariables(css)['--surface']).toBe('#161a33');
    expect(css).toContain('.el-card');
    expect(buildThemeCss(resolveThemeSettings(light))).not.toContain('.el-card {');
  });

  it('picks the button text colour automatically only when the palette has none', () => {
    expect(themeVariables(buildThemeCss(resolveThemeSettings(light)))['--button-text-color']).toContain('oklch(from var(--button-bg-color)');
    expect(themeVariables(buildThemeCss(resolveThemeSettings(dark)))['--button-text-color']).toBe('#0b0e1f');
  });

  it('includes the custom stylesheet import', () => {
    expect(buildThemeCss(resolveThemeSettings({ ...light, themeStylesUrl: 'https://x.test/a.css' }))).toContain('@import "https://x.test/a.css";');
  });
});
