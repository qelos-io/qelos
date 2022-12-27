import { QelosSDKOptions } from "./types";
import BaseSDK from "./base-sdk";

export interface IAppConfiguration {
  name: string;
  logoUrl: string;
  description: string;
  keywords: string;
  slogan: string;
  language: string;
  direction: string;
  titleSuffix: string;
  themeStylesUrl: string;
  homeScreen: string;
  colorsPalette: Record<string, string>;
  websiteUrls: string[];

  [key: string]: any;
}

export default class QlAppConfigurations extends BaseSDK {
  private relativePath = "/api/configurations/app-configuration";

  constructor(options: QelosSDKOptions) {
    super(options);
  }

  getAppConfiguration(extra?: Partial<RequestInit>) {
    return this.callJsonApi<{metadata: IAppConfiguration}>(this.relativePath, extra);
  }

  update(changes: Partial<IAppConfiguration>, extra?: Partial<RequestInit>): Promise<{metadata: IAppConfiguration}> {
    return this.callJsonApi<{metadata: IAppConfiguration}>(this.relativePath, {
      method: "put",
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({metadata: changes}),
      ...(extra || {}),
    });
  }
}
