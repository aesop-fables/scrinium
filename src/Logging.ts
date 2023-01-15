/* eslint-disable @typescript-eslint/no-explicit-any */
declare type LogFunc = (message?: any, ...optionalParams: any[]) => void;

export enum LogLevel {
  Debug,
  Info,
  Warn,
}

let configuredLevel = LogLevel.Warn;
export function configureLogging(level: LogLevel): void {
  configuredLevel = level;
}

export interface ILogger {
  debug: LogFunc;
  info: LogFunc;
  warn: LogFunc;
  error: LogFunc;
}

export class ConsoleLogger implements ILogger {
  debug(message?: any, ...optionalParams: any[]): void {
    if (configuredLevel !== LogLevel.Debug) return;
    console.log(message, optionalParams);
  }

  info(message?: any, ...optionalParams: any[]): void {
    if (configuredLevel < LogLevel.Info) return;
    console.log(message, optionalParams);
  }

  warn(message?: any, ...optionalParams: any[]): void {
    if (configuredLevel < LogLevel.Warn) return;
    console.log(message, optionalParams);
  }

  error(message?: any, ...optionalParams: any[]): void {
    console.log(message, optionalParams);
  }
}

export const consoleLogger = new ConsoleLogger();
