import { ScriniumToken } from './AppStorageToken';

export class DependencyGraph {
  private graph = new Map<ScriniumToken, Set<ScriniumToken>>();

  // Add a dependency
  addDependency(sourceToken: ScriniumToken, dependentToken: ScriniumToken): void {
    if (!this.graph.has(sourceToken)) {
      this.graph.set(sourceToken, new Set());
    }
    this.graph.get(sourceToken)!.add(dependentToken);
  }

  // Get dependents of a token
  getDependents(token: ScriniumToken): Set<ScriniumToken> {
    return this.graph.get(token) ?? new Set();
  }

  // Remove a dependency
  removeDependency(sourceToken: ScriniumToken, dependentToken: ScriniumToken): void {
    this.getDependents(sourceToken).delete(dependentToken);
  }

  // Clear the entire graph
  clear(): void {
    this.graph.clear();
  }
}
