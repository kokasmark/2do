import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { iconItems, ListItem, Note, NoteColors, NoteIcons, NoteType } from "./types";
import { timeAgo } from "./utils";
import { execSync } from "child_process";

let notes: Record<string, Note[]> = {};
let activeHighlight: vscode.TextEditorDecorationType | null = null;

const author = getGitUserName()

function getNotes(context: vscode.ExtensionContext) {
	let listItems: ListItem[] = []

	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		Object.values(notes).map((file: Note[]) => {
			file.forEach(n => {
				listItems.push({ label: `$(${NoteIcons[n.type]})`, description: `${n.message.length > 50 ? (`${n.message.slice(0, 50)}...`) : n.message} - ${n.path}`, note: n })
			});
		})

		if (listItems.length === 0) vscode.window.showInformationMessage(`This project doesn't have any notes!`);
	}
	else {
		if (notes[editor.document.fileName]) {
			notes[editor.document.fileName].forEach(n => {
				listItems.push({ label: `$(${NoteIcons[n.type]})`, description: `${n.message.length > 50 ? (`${n.message.slice(0, 50)}...`) : n.message} - ${timeAgo(n.timestamp)}`, note: n })
			});

			if (listItems.length === 0) vscode.window.showInformationMessage(`${editor.document.fileName} doesn't have any notes!`);
		}
		else {
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

function highlightNote(editor: vscode.TextEditor, note: Note) {
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
			color: "white",
		},
	});

	const decoration = {
		range,
		renderOptions: {
			after: {
				contentText: note.author ? ` ${note.message} - ${note.author}` : ` ${note.message}`,
				color: NoteColors[note.type],
				fontStyle: "italic",
			},
		},
	};

	editor.setDecorations(activeHighlight, [decoration]);
	editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}

function getNotesFilePath(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;
  return path.join(folders[0].uri.fsPath, ".2do");
}

export function loadNotes(): Record<string, Note[]> {
  const notesFile = getNotesFilePath();
  if (!notesFile || !fs.existsSync(notesFile)) return {};
  try {
    const raw = fs.readFileSync(notesFile, "utf8");
    return JSON.parse(raw) as Record<string, Note[]>;
  } catch (err) {
    vscode.window.showErrorMessage("Failed to read notes file: " + err);
    return {};
  }
}

export function saveNotes() {
  const notesFile = getNotesFilePath();
  if (!notesFile) {
    vscode.window.showErrorMessage("No workspace open — cannot save notes.");
    return;
  }
  try {
    fs.writeFileSync(notesFile, JSON.stringify(notes, null, 2), "utf8");
  } catch (err) {
    vscode.window.showErrorMessage("Failed to save notes: " + err);
  }
}

function getGitUserName(): string | null {
  try {
    const name = execSync("git config user.name", { encoding: "utf8" }).trim();
    return name || null;
  } catch (err) {
    return null;
  }
}

async function listNotes(context: vscode.ExtensionContext): Promise<ListItem | null>{
	const notes = getNotes(context)

	const items = [
		{label: "$(filter-filled)", description: "Filter Notes",note: null},
		{label: "$(list-ordered)", description: "Order Notes",note: null},
		...notes
	]

	const picked = await vscode.window.showQuickPick(
			items,
			{ placeHolder: "Select Note" }
	);

	if(picked){
		if(picked.note){
			return picked
		}
		else{
			const index = items.indexOf(picked);

			if(index === 0){
				const picked = await listFilters(context)
				if(picked){
					return picked
				}
			}

			if(index === 1){
				const picked = await listOrderings(context)
				if(picked){
					return picked
				}
			}
			return null
		}
	}

	return null
}

async function listFilters(context: vscode.ExtensionContext): Promise<ListItem | null>{
	const items = [
		{ label: "$(clear-all)", description: "Clear Filter", filter: null },
		...Object.entries(NoteIcons).map(([type, icon]) => ({
			label: `$(${icon})`,
			description: `Filter ${type.charAt(0).toUpperCase()}${type.slice(1)}`,
			filter: type as NoteType
		}))
	];

	const pickedFilter = await vscode.window.showQuickPick(
			items,
			{ placeHolder: "Select Filter" }
	);

	if(pickedFilter){
		
	}

	const picked = await listNotes(context);

	if(picked){
		if(picked.note){
			return picked
		}
		else{
			//Do actions
			return null
		}
	}

	return null
}

async function listOrderings(context: vscode.ExtensionContext): Promise<ListItem | null>{
	const items = [
		{ label: "$(clear-all)", description: "By None", order: null },
		{ label: "$(account)", description: "By Author", order: null},
		{ label: "$(fold-up)", description: "By Latest", order: null},
		{ label: "$(fold-down)", description: "By Oldest", order: null},
	];

	const pickedOrder = await vscode.window.showQuickPick(
			items,
			{ placeHolder: "Select Order" }
	);

	if(pickedOrder){
		
	}

	const picked = await listNotes(context);

	if(picked){
		if(picked.note){
			return picked
		}
		else{
			//Do actions
			return null
		}
	}

	return null
}

export function activate(context: vscode.ExtensionContext) {

	notes = loadNotes();

	//2do ADD
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
				const type: NoteType = pickedTypeIcon?.type;

				if (!notes[editor.document.fileName]) notes[editor.document.fileName] = []

				notes[editor.document.fileName].push({
					path: editor.document.fileName,
					timestamp: Date.now(),
					line: selection.start.line,
					type: type,
					message: text,
					author: author
				});
				
				saveNotes();

				editor.edit(editBuilder => {
					editBuilder.delete(selection);
				});
			}
	}));

	//2do GOTO
	context.subscriptions.push(
		vscode.commands.registerCommand("2do.goto", (note: Note) => {
			const uri = vscode.Uri.file(note.path);

			vscode.workspace.openTextDocument(uri).then(doc => {
				vscode.window.showTextDocument(doc).then(editor => {
					const position = new vscode.Position(note.line, 0);
					const range = new vscode.Range(position, position);

					editor.selection = new vscode.Selection(position, position);
					editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
				});
			});
		})
	);

	//2do LIST
	context.subscriptions.push(
		vscode.commands.registerCommand("2do.list", async () => {

			const notes = getNotes(context);

			if (!notes || notes.length === 0) return;

			const picked = await listNotes(context);

			if (picked) {
				const uri = vscode.Uri.file(picked.note.path);

				vscode.workspace.openTextDocument(uri).then(doc => {
					vscode.window.showTextDocument(doc).then(editor => {
						const position = new vscode.Position(picked.note.line, 0);
						const range = new vscode.Range(position, position);

						editor.selection = new vscode.Selection(position, position);
						editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

						highlightNote(editor, picked.note);
					});
				});
			}
	}));

	//2do DELETE
	context.subscriptions.push(
		vscode.commands.registerCommand("2do.delete", async () => {

			const notesList: ListItem[] = getNotes(context);
			
			if (!notesList || notesList.length === 0) return;

			const picked = await listNotes(context);

			if (picked) {
				
				const index = notes[picked.note.path].indexOf(picked.note);
				if (index !== -1) {
					notes[picked.note.path].splice(index, 1);
					saveNotes()
				}
			}

			clearHighlight();
		})
	);

	vscode.workspace.onDidChangeTextDocument(event => {
		clearHighlight();
	});

	vscode.window.onDidChangeActiveTextEditor(editor => {
		clearHighlight();
	});

}
export function deactivate() { }

