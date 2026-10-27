import { type DynamicModule, Global, Module } from '@nestjs/common';
import type { AppConfig } from './env.js';

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Provides the already-validated AppConfig under the APP_CONFIG token. */
@Global()
@Module({})
export class ConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
