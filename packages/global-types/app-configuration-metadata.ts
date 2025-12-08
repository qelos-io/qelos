
export interface IAppConfigurationMetadata {
  name: string;
  logoUrl: string;
  description: string;
  keywords: string;
  slogan: string;
  language: string;
  direction: string;
  themeStylesUrl: string;
  scriptUrl: string;
  homeScreen: string;
  colorsPalette: Record<string, string>;
  borderRadius: number;
  baseFontSize: number;
  websiteUrls: string[];
  layoutStyle?: 'classic' | 'main-bordered' | 'stacked-header';

  [key: string]: any;
}