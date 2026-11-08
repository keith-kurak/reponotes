/** Link target for a note, keeping folder segments in the URL. */
export function noteHref(path: string) {
  return {
    pathname: "/note/[...path]" as const,
    params: { path: path.split("/") },
  };
}
