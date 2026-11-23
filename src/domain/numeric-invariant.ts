/** @internal Fail immediately when a required numerical condition is broken. */
export function assertNumeric(
  condition: boolean,
  message: string,
  Failure: new (message: string) => Error = Error,
): asserts condition {
  if (!condition) throw new Failure(message);
}
