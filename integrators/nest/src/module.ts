import {
  type DynamicModule,
  type FactoryProvider,
  type MiddlewareConsumer,
  Module,
  type ModuleMetadata,
  type NestModule,
  type Provider,
  Scope,
  type Type,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { QELOS_MODULE_OPTIONS, QELOS_SDK } from './constants';
import { normalizeModuleOptions } from './module-options';
import { QelosMiddleware } from './middleware';
import type { AnyRequest, QelosModuleOptions, QelosNestConfig } from './types';

export interface QelosModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (
    ...args: unknown[]
  ) =>
    | Promise<QelosNestConfig | QelosModuleOptions>
    | QelosNestConfig
    | QelosModuleOptions;
  inject?: FactoryProvider['inject'];
  useExisting?: Type<QelosOptionsFactory>;
  useClass?: Type<QelosOptionsFactory>;
}

export interface QelosOptionsFactory {
  createQelosOptions():
    | Promise<QelosNestConfig | QelosModuleOptions>
    | QelosNestConfig
    | QelosModuleOptions;
}

@Module({})
export class QelosModule implements NestModule {
  private static readonly sdkProvider: Provider = {
    provide: QELOS_SDK,
    scope: Scope.REQUEST,
    useFactory: (request: AnyRequest) => request.qelos?.sdk,
    inject: [REQUEST],
  };

  /**
   * Register the module with statically-known options.
   *
   * Pass either a full {@link QelosModuleOptions} object or a shorthand
   * {@link QelosNestConfig} (e.g. `{ appUrl, apiToken }`).
   *
   * The middleware is wired to `forRoutes('*')` by default. Override by
   * importing the module without `forRoot` and applying `QelosMiddleware`
   * directly inside your own `MiddlewareConsumer`.
   */
  static forRoot(config: QelosNestConfig): DynamicModule;
  static forRoot(options: QelosModuleOptions): DynamicModule;
  static forRoot(configOrOptions: QelosNestConfig | QelosModuleOptions): DynamicModule {
    const options = normalizeModuleOptions(configOrOptions);
    const optionsProvider: Provider = {
      provide: QELOS_MODULE_OPTIONS,
      useValue: options,
    };
    return {
      module: QelosModule,
      providers: [optionsProvider, QelosMiddleware, QelosModule.sdkProvider],
      exports: [optionsProvider, QelosMiddleware, QELOS_SDK],
      global: true,
    };
  }

  /**
   * Register the module with options resolved asynchronously (e.g. via
   * `ConfigService`).
   */
  static forRootAsync(options: QelosModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      ...this.createAsyncProviders(options),
      QelosMiddleware,
      QelosModule.sdkProvider,
    ];
    return {
      module: QelosModule,
      imports: options.imports || [],
      providers,
      exports: [QELOS_MODULE_OPTIONS, QelosMiddleware, QELOS_SDK],
      global: true,
    };
  }

  private static createAsyncProviders(
    options: QelosModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      const factoryProvider: FactoryProvider<QelosModuleOptions> = {
        provide: QELOS_MODULE_OPTIONS,
        useFactory: async (...args: unknown[]) =>
          normalizeModuleOptions(await options.useFactory!(...args)),
        inject: options.inject || [],
      };
      return [factoryProvider];
    }
    const factoryClass = options.useExisting || options.useClass;
    if (!factoryClass) {
      throw new Error(
        '@qelos/integrator-nest: forRootAsync requires useFactory, useClass or useExisting',
      );
    }
    const optionsProvider: FactoryProvider<QelosModuleOptions> = {
      provide: QELOS_MODULE_OPTIONS,
      useFactory: async (factory: QelosOptionsFactory) =>
        normalizeModuleOptions(await factory.createQelosOptions()),
      inject: [factoryClass],
    };
    if (options.useClass) {
      return [
        optionsProvider,
        { provide: factoryClass, useClass: factoryClass } as Provider,
      ];
    }
    return [optionsProvider];
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(QelosMiddleware).forRoutes('*');
  }
}
