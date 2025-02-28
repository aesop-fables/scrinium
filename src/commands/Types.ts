/**
 * Represents a command that will be executed against the data cache layer.
 * @deprecated Use POJOs and the upcoming `ICommandHandler` interface instead.
 */
export interface IRelayCommand<Output = void> {
  execute(): Promise<Output>;
}

/**
 * Represents a parameterized command that will be executed against the data cache layer.
 * @deprecated Use POJOs and the upcoming `ICommandHandler` interface instead.
 */
export interface IDataCommand<Input, Output = void> {
  execute(input: Input): Promise<Output>;
}
