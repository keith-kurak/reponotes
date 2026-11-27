export interface AddFabProps {
  onNewNote: () => void;
  onNewFolder: () => void;
}

/**
 * Android shows a floating action button (AddFab.android.tsx). On iOS the
 * same actions are in the header's + menu, so this renders nothing.
 */
export function AddFab(_props: AddFabProps) {
  return null;
}
