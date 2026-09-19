// A process dependency check, not a business Repository or task queue.
export interface HealthDependency {
  check(): Promise<boolean>;
  close(): Promise<void>;
}
