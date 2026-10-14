import { describe, expect, it } from 'vitest';
import {
  applyPresetToDraft,
  changedAreas,
  configWithDraft,
  contrastRatio,
  draftFromConfig,
  firstFamily,
  fontsUrlFor,
  isHttpUrl,
  normalizeHex,
  readableOn,
  themeChecks,
} from '../appearance';

const config = {
  name: 'Acme',
  colorsPalette: { mainColor: '#3730a3', bgColor: '#ffffff', textColor: '#111111', fontFamily: 'Georgia, serif', borderRadius: 4 },
  borderRadius: 8,
  layoutStyle: 'classic',
};

describe('draft', () => {
  it('reads top-level values first, then the palette, then defaults', () => {
    const draft = draftFromConfig(config);
    expect(draft.borderRadius).toBe(8);
    expect(draft.fontFamily).toBe('Georgia, serif');
    expect(draft.navigationLayout).toBe('icon-text');
    expect(draft.smallLogoUrl).toBe('');
  });

  it('does not share state with the config', () => {
    const draft = draftFromConfig(config);
    draft.colorsPalette.mainColor = '#000000';
    expect(config.colorsPalette.mainColor).toBe('#3730a3');
  });

  it('writes the draft over the config and keeps unrelated keys', () => {
    const draft = draftFromConfig(config);
    draft.logoUrl = 'https://x.test/logo.png';
    const result = configWithDraft(config, draft);
    expect(result.name).toBe('Acme');
    expect(result.logoUrl).toBe('https://x.test/logo.png');
  });

  it('reports which areas changed', () => {
    const base = draftFromConfig(config);
    const draft = { ...base, borderRadius: 12, smallLogoUrl: 'https://x.test/s.png', colorsPalette: { ...base.colorsPalette, mainColor: '#000000' } };
    expect(changedAreas(base, draft).sort()).toEqual(['brand', 'colors', 'shape']);
    expect(changedAreas(base, base)).toEqual([]);
  });

  it('counts a changed web-font stylesheet as typography, not colours', () => {
    const base = draftFromConfig(config);
    const draft = { ...base, colorsPalette: { ...base.colorsPalette, fontsUrl: 'https://fonts.googleapis.com/css2?family=Inter' } };
    expect(changedAreas(base, draft)).toEqual(['type']);
  });

  it('applies a preset to colours, fonts and shape but not to brand or layout', () => {
    const base = { ...draftFromConfig(config), logoUrl: 'https://x.test/logo.png', layoutStyle: 'stacked-header' as const };
    const result = applyPresetToDraft(base, { mainColor: '#000000', fontFamily: 'Inter, sans-serif', borderRadius: 14, spacing: 'comfortable' });
    expect(result.colorsPalette.mainColor).toBe('#000000');
    expect(result.fontFamily).toBe('Inter, sans-serif');
    expect(result.borderRadius).toBe(14);
    expect(result.spacing).toBe('comfortable');
    expect(result.logoUrl).toBe('https://x.test/logo.png');
    expect(result.layoutStyle).toBe('stacked-header');
  });
});

describe('colours', () => {
  it('normalises hex colours', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('3730A3')).toBe('#3730a3');
    expect(normalizeHex('blue')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });

  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
    expect(contrastRatio('nope', '#ffffff')).toBeNull();
  });

  it('picks a readable text colour', () => {
    expect(readableOn('#ffffff')).toBe('#000000');
    expect(readableOn('#101010')).toBe('#ffffff');
    expect(readableOn('#a5b4fc')).toBe('#000000');
  });

  it('checks the pairs that meet on screen and flags failures', () => {
    const checks = themeChecks({ bgColor: '#ffffff', textColor: '#777777', mainColor: '#a5b4fc', linksColor: '#0000ee' });
    const byKey = Object.fromEntries(checks.map((check) => [check.key, check]));
    expect(byKey['text-page'].pass).toBe(false);
    expect(byKey.links.pass).toBe(true);
    expect(byKey.buttons.pass).toBe(true); // auto text colour on the main colour
    expect(byKey.navigation).toBeUndefined(); // no navigation colours given
  });

  it('uses the dark tone as the card colour on dark themes', () => {
    const checks = themeChecks({ bgColor: '#0b0e1f', negativeColor: '#161a33', textColor: '#e5e7ff' });
    expect(checks.find((check) => check.key === 'text-card')?.background).toBe('#161a33');
  });
});

describe('fonts', () => {
  it('reads the first family', () => {
    expect(firstFamily("'Space Grotesk', sans-serif")).toBe('Space Grotesk');
  });

  it('builds one Google Fonts stylesheet for the chosen fonts', () => {
    expect(fontsUrlFor(['Inter, sans-serif', "'Space Grotesk', sans-serif"])).toBe(
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap',
    );
    expect(fontsUrlFor(['Arial, sans-serif', 'Georgia, serif'])).toBe('');
  });

  it('keeps the current stylesheet when a font is not in the catalog', () => {
    expect(fontsUrlFor(['Inter, sans-serif', 'Mystery Font, serif'], 'https://fonts.googleapis.com/css2?family=Mystery')).toBe('https://fonts.googleapis.com/css2?family=Mystery');
  });
});

describe('isHttpUrl', () => {
  it('accepts empty and http(s) urls only', () => {
    expect(isHttpUrl('')).toBe(true);
    expect(isHttpUrl('https://x.test/a.css')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('ftp://x.test')).toBe(false);
  });
});
