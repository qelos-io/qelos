import type { Request } from 'express';

export interface ApiConfig {
  cors: boolean;
  bodyParser?: BodyParserType | false | null;
  port: string | number;
  ip: string;
  showLogs: boolean
}

export type BodyParserType = 'json' | 'urlencoded' | 'raw' | 'text';

export interface Service {
  url: string;
  port: number | string;
  protocol: ServiceProtocol;
}

export type ServiceProtocol = 'http' | 'https';

export interface RequestWithUser extends Omit<Request, 'headers'> {
  user?: Record<string, any>;
  headers?: RequestHeadersWithUser
}

type RequestHeadersWithUser = Request['headers'] | {
  user?: string
};

