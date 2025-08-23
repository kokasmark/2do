export type NoteType = "info" | "add" | "remove" | "code" | "bug" | "question" | "private" ;

export const NoteIcons: Record<NoteType, string> = {
  info: "comment",
  add: "diff-insert",
  remove: "diff-remove",
  code: "code",
  bug: "bug",
  question: "question",
  private: "lock"
};

export const NoteColors: Record<NoteType, string> = {
  info: "#4278ddff",
  add: "#17be4fff",
  remove: "#e48e3eff",
  code: "#7e42ddff",
  bug: "#dd4242ff",
  question: "#ddd342ff",
  private: "#455574ff"
};

export interface Note{
    path: string,
    line: number,
    timestamp: number,
    type: NoteType,
    message: string,
    author: string | null
}

export interface ListItem{
    label: string,
    description: string, 
    note: Note
}

export  const iconItems: { label: string; description: string; type: NoteType }[] = [
        { label: "$(comment)", description: "Informational note", type: "info" },
        { label: "$(diff-added)", description: "Add something", type: "add" },
        { label: "$(diff-removed)", description: "Remove something", type: "remove" },
        { label: "$(code)", description: "Code / Terminal command", type: "code" },
        { label: "$(bug)", description: "Bug / Error", type: "bug" },
        { label: "$(question)", description: "Question", type: "question" },
        { label: "$(lock)", description: "Private note", type: "private" },
];
