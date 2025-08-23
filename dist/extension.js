"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate,
  loadNotes: () => loadNotes,
  saveNotes: () => saveNotes
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));

// src/types.ts
var NoteIcons = {
  info: "comment",
  add: "diff-insert",
  remove: "diff-remove",
  code: "code",
  bug: "bug",
  question: "question",
  private: "lock"
};
var NoteColors = {
  info: "#4278ddff",
  add: "#17be4fff",
  remove: "#e48e3eff",
  code: "#7e42ddff",
  bug: "#dd4242ff",
  question: "#ddd342ff",
  private: "#455574ff"
};
var iconItems = [
  { label: "$(comment)", description: "Informational note", type: "info" },
  { label: "$(diff-added)", description: "Add something", type: "add" },
  { label: "$(diff-removed)", description: "Remove something", type: "remove" },
  { label: "$(code)", description: "Code / Terminal command", type: "code" },
  { label: "$(bug)", description: "Bug / Error", type: "bug" },
  { label: "$(question)", description: "Question", type: "question" },
  { label: "$(lock)", description: "Private note", type: "private" }
];

// src/utils.ts
function timeAgo(timestamp) {
  const now = Date.now();
  let delta = Math.floor((now - timestamp) / 1e3);
  if (delta < 60) {
    return `${delta} second${delta !== 1 ? "s" : ""} ago`;
  }
  delta = Math.floor(delta / 60);
  if (delta < 60) {
    return `${delta} minute${delta !== 1 ? "s" : ""} ago`;
  }
  delta = Math.floor(delta / 60);
  if (delta < 24) {
    return `${delta} hour${delta !== 1 ? "s" : ""} ago`;
  }
  delta = Math.floor(delta / 24);
  if (delta < 30) {
    return `${delta} day${delta !== 1 ? "s" : ""} ago`;
  }
  delta = Math.floor(delta / 30);
  if (delta < 12) {
    return `${delta} month${delta !== 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(delta / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

// src/extension.ts
var import_child_process = require("child_process");
var notes = {};
var activeHighlight = null;
var author = getGitUserName();
function getNotes(context) {
  let listItems = [];
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    Object.values(notes).map((file) => {
      file.forEach((n) => {
        listItems.push({ label: `$(${NoteIcons[n.type]})`, description: `${n.message.length > 50 ? `${n.message.slice(0, 50)}...` : n.message} - ${n.path}`, note: n });
      });
    });
    if (listItems.length === 0) vscode.window.showInformationMessage(`This project doesn't have any notes!`);
  } else {
    if (notes[editor.document.fileName]) {
      notes[editor.document.fileName].forEach((n) => {
        listItems.push({ label: `$(${NoteIcons[n.type]})`, description: `${n.message.length > 50 ? `${n.message.slice(0, 50)}...` : n.message} - ${timeAgo(n.timestamp)}`, note: n });
      });
      if (listItems.length === 0) vscode.window.showInformationMessage(`${editor.document.fileName} doesn't have any notes!`);
    } else {
      vscode.window.showInformationMessage(`${editor.document.fileName} doesn't have any notes!`);
    }
  }
  return listItems;
}
function clearHighlight() {
  if (activeHighlight) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.setDecorations(activeHighlight, []);
    }
    activeHighlight.dispose();
    activeHighlight = null;
  }
}
function highlightNote(editor, note) {
  clearHighlight();
  const line = note.line;
  const range = editor.document.lineAt(line).range;
  const iconPath = vscode.Uri.file(path.join(__dirname, "assets", `${note.type}.png`));
  activeHighlight = vscode.window.createTextEditorDecorationType({
    backgroundColor: "transparent",
    isWholeLine: true,
    gutterIconPath: iconPath,
    gutterIconSize: "contain",
    after: {
      margin: "0 0 0 1rem",
      color: "white"
    }
  });
  const decoration = {
    range,
    renderOptions: {
      after: {
        contentText: note.author ? ` ${note.message} - ${note.author}` : ` ${note.message}`,
        color: NoteColors[note.type],
        fontStyle: "italic"
      }
    }
  };
  editor.setDecorations(activeHighlight, [decoration]);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}
function getNotesFilePath() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;
  return path.join(folders[0].uri.fsPath, ".2do");
}
function loadNotes() {
  const notesFile = getNotesFilePath();
  if (!notesFile || !fs.existsSync(notesFile)) return {};
  try {
    const raw = fs.readFileSync(notesFile, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    vscode.window.showErrorMessage("Failed to read notes file: " + err);
    return {};
  }
}
function saveNotes() {
  const notesFile = getNotesFilePath();
  if (!notesFile) {
    vscode.window.showErrorMessage("No workspace open \u2014 cannot save notes.");
    return;
  }
  try {
    fs.writeFileSync(notesFile, JSON.stringify(notes, null, 2), "utf8");
  } catch (err) {
    vscode.window.showErrorMessage("Failed to save notes: " + err);
  }
}
function getGitUserName() {
  try {
    const name = (0, import_child_process.execSync)("git config user.name", { encoding: "utf8" }).trim();
    return name || null;
  } catch (err) {
    return null;
  }
}
async function listNotes(context) {
  const notes2 = getNotes(context);
  const items = [
    { label: "$(filter-filled)", description: "Filter Notes", note: null },
    { label: "$(list-ordered)", description: "Order Notes", note: null },
    ...notes2
  ];
  const picked = await vscode.window.showQuickPick(
    items,
    { placeHolder: "Select Note" }
  );
  if (picked) {
    if (picked.note) {
      return picked;
    } else {
      const index = items.indexOf(picked);
      if (index === 0) {
        const picked2 = await listFilters(context);
        if (picked2) {
          return picked2;
        }
      }
      if (index === 1) {
        const picked2 = await listOrderings(context);
        if (picked2) {
          return picked2;
        }
      }
      return null;
    }
  }
  return null;
}
async function listFilters(context) {
  const items = [
    { label: "$(clear-all)", description: "Clear Filter", filter: null },
    ...Object.entries(NoteIcons).map(([type, icon]) => ({
      label: `$(${icon})`,
      description: `Filter ${type.charAt(0).toUpperCase()}${type.slice(1)}`,
      filter: type
    }))
  ];
  const pickedFilter = await vscode.window.showQuickPick(
    items,
    { placeHolder: "Select Filter" }
  );
  if (pickedFilter) {
  }
  const picked = await listNotes(context);
  if (picked) {
    if (picked.note) {
      return picked;
    } else {
      return null;
    }
  }
  return null;
}
async function listOrderings(context) {
  const items = [
    { label: "$(clear-all)", description: "By None", order: null },
    { label: "$(account)", description: "By Author", order: null },
    { label: "$(fold-up)", description: "By Latest", order: null },
    { label: "$(fold-down)", description: "By Oldest", order: null }
  ];
  const pickedOrder = await vscode.window.showQuickPick(
    items,
    { placeHolder: "Select Order" }
  );
  if (pickedOrder) {
  }
  const picked = await listNotes(context);
  if (picked) {
    if (picked.note) {
      return picked;
    } else {
      return null;
    }
  }
  return null;
}
function activate(context) {
  notes = loadNotes();
  context.subscriptions.push(
    vscode.commands.registerCommand("2do.add", async () => {
      const pickedTypeIcon = await vscode.window.showQuickPick(
        iconItems,
        { placeHolder: "Note tyoe" }
      );
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active editor");
        return;
      }
      const selection = editor.selection;
      const text = editor.document.getText(selection);
      if (!text) {
        vscode.window.showInformationMessage("No text selected");
        return;
      }
      if (pickedTypeIcon) {
        const type = pickedTypeIcon?.type;
        if (!notes[editor.document.fileName]) notes[editor.document.fileName] = [];
        notes[editor.document.fileName].push({
          path: editor.document.fileName,
          timestamp: Date.now(),
          line: selection.start.line,
          type,
          message: text,
          author
        });
        saveNotes();
        editor.edit((editBuilder) => {
          editBuilder.delete(selection);
        });
      }
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("2do.goto", (note) => {
      const uri = vscode.Uri.file(note.path);
      vscode.workspace.openTextDocument(uri).then((doc) => {
        vscode.window.showTextDocument(doc).then((editor) => {
          const position = new vscode.Position(note.line, 0);
          const range = new vscode.Range(position, position);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        });
      });
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("2do.list", async () => {
      const notes2 = getNotes(context);
      if (!notes2 || notes2.length === 0) return;
      const picked = await listNotes(context);
      if (picked) {
        const uri = vscode.Uri.file(picked.note.path);
        vscode.workspace.openTextDocument(uri).then((doc) => {
          vscode.window.showTextDocument(doc).then((editor) => {
            const position = new vscode.Position(picked.note.line, 0);
            const range = new vscode.Range(position, position);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            highlightNote(editor, picked.note);
          });
        });
      }
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("2do.delete", async () => {
      const notesList = getNotes(context);
      if (!notesList || notesList.length === 0) return;
      const picked = await listNotes(context);
      if (picked) {
        const index = notes[picked.note.path].indexOf(picked.note);
        if (index !== -1) {
          notes[picked.note.path].splice(index, 1);
          saveNotes();
        }
      }
      clearHighlight();
    })
  );
  vscode.workspace.onDidChangeTextDocument((event) => {
    clearHighlight();
  });
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    clearHighlight();
  });
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate,
  loadNotes,
  saveNotes
});
//# sourceMappingURL=extension.js.map
