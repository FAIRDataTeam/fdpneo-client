/**
 * Shared lightweight types. Kept separate from `.vue` SFCs so consumers can
 * import them without going through Vue's script-setup type-export quirks.
 */

export type RecordKind =
  | "dataset"
  | "catalog"
  | "distribution"
  | "biobank"
  | "publication"
  | "fdp";

export type IconName =
  | "search"
  | "chevron-r"
  | "chevron-d"
  | "chevron-l"
  | "tree"
  | "download"
  | "code"
  | "link"
  | "shield"
  | "calendar"
  | "user"
  | "plus"
  | "edit"
  | "filter"
  | "x"
  | "dots"
  | "arrow-r"
  | "arrow-up"
  | "globe"
  | "check"
  | "lock"
  | "cog"
  | "book"
  | "sun"
  | "moon"
  | "monitor";
