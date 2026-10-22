/** Track each finger/key independently; releasing one must not release another. */
export class HeldInputs {
  private held = new Map<string, string>();
  press(source: string, padId: string) {
    if (this.held.has(source)) return false;
    this.held.set(source, padId);
    return true;
  }
  release(source: string) {
    return this.held.delete(source);
  }
  clear() {
    this.held.clear();
  }
  active() {
    return new Set(this.held.values());
  }
}
