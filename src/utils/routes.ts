/** Link target for a note, keeping folder segments in the URL. */
export function noteHref(path: string) {
  return {
    pathname: "/note/[...path]" as const,
    params: { path: path.split("/") },
  };
}

/** Link target for a folder in the Files tab ("" is the root). */
export function folderHref(path: string) {
  return path
    ? {
        pathname: "/files/[...folder]" as const,
        params: { folder: path.split("/") },
      }
    : ("/files" as const);
}
