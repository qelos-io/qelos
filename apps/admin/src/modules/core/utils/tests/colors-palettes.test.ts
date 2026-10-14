import { PALETTES } from '../colors-palettes';

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

const isDark = (hex: string) => luminance(hex) < 0.18;

describe('theme palettes', () => {
  it('ships unique, named themes', () => {
    const names = PALETTES.map((palette) => palette.name);
    expect(new Set(names).size).toBe(names.length);
    expect(PALETTES.length).toBeGreaterThanOrEqual(6);
  });

  PALETTES.forEach(({ name, palette: p }) => {
    describe(name, () => {
      const dark = isDark(p.bgColor);

      // [label, foreground, background, minimum ratio]
      const pairs: [string, string, string, number][] = [
        ['text on page', p.textColor, p.bgColor, 4.5],
        ['headings (main color) on page', p.mainColor, p.bgColor, 4.5],
        ['links on page', p.linksColor, p.bgColor, 4.5],
        ['button text on button', p.buttonTextColor!, p.buttonBgColor!, 4.5],
        // the app paints primary buttons with the main color
        ['button text on main color', p.buttonTextColor!, p.mainColor, 4.5],
        ['sidebar text on sidebar', p.secondaryColor, p.navigationBgColor, 4.5],
        ['active sidebar item on sidebar', p.thirdColor, p.navigationBgColor, 4.5],
        ['input text on input', p.inputsTextColor, p.inputsBgColor, 4.5],
      ];
      if (dark) {
        // dark themes use negativeColor as the card surface
        pairs.push(['text on card', p.textColor, p.negativeColor, 4.5], ['main color on card', p.mainColor, p.negativeColor, 4.5]);
      } else {
        pairs.push(['sidebar titles on sidebar', p.negativeColor, p.navigationBgColor, 4.5]);
      }

      it.each(pairs)('%s is readable', (_label, foreground, background, minimum) => {
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(minimum);
      });

      it('only asks for Google Fonts', () => {
        if (p.fontsUrl) {
          expect(p.fontsUrl.startsWith('https://fonts.googleapis.com/')).toBe(true);
        }
      });
    });
  });
});
