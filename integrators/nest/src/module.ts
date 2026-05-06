import {
  type DynamicModule,
  type FactoryProvider,
  type MiddlewareConsumer,
  Module,
  type ModuleMetadata,
  type NestModule,
  type Provider,
  type Type,
} from '@nestjs/common';
import { QELOS_MODULE_OPTIONS } from './constants';
import { QelosMiddleware } from './middleware';
import type { QelosModuleOptions } from './types';

export interface QelosModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (
    ...args: unknown[]
  ) => Promise<QelosModuleOptions> | QelosModuleOptions;
  inject?: FactoryProvider['inject'];
  useExisting?: Type<QelosOptionsFactory>;
  useClass?: Type<QelosOptionsFactory>;
}

export interface QelosOptionsFactory {
  createQelosOptions(): Promise<QelosModuleOptions> | QelosModuleOptions;
}

@Module({})
export class QelosModule implements NestModule {
  /**
   * Register the module with statically-known options.
   *
   * The middleware is wired to `forRoutes('*')` by default. Override by
   * importing the module without `forRoot` and applying `QelosMiddleware`
   * directly inside your own `MiddlewareConsumer`.
   */
  static forRoot(options: QelosModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: QELOS_MODULE_OPTIONS,
      useValue: options,
    };
    return {
      module: QelosModule,
      providers: [optionsProvider, QelosMiddleware],
      exports: [optionsProvider, QelosMiddleware],
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
    ];
    return {
      module: QelosModule,
      imports: options.imports || [],
      providers,
      exports: [QELOS_MODULE_OPTIONS, QelosMiddleware],
      global: true,
    };
  }

  private static createAsyncProviders(
    options: QelosModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      const factoryProvider: FactoryProvider<
        Promise<QelosModuleOptions> | QelosModuleOptions
      > = {
        provide: QELOS_MODULE_OPTIONS,
        useFactory: options.useFactory,
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
    const optionsProvider: FactoryProvider<
      Promise<QelosModuleOptions> | QelosModuleOptions
    > = {
      provide: QELOS_MODULE_OPTIONS,
      useFactory: (factory: QelosOptionsFactory) => factory.createQelosOptions(),
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
