// Change notification for local notes and their metadata. Any write to a note
// file or to note metadata calls notifyNotesChanged(), so every screen that
// uses useNotesVersion() updates at once (no stale lists or badges).

type Listener = () => void;

const listeners = new Set<Listener>();
let version = 0;

export function notifyNotesChanged(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeNotes(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotesVersion(): number {
  return version;
}
