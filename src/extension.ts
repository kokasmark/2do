import * as vscode from "vscode";
import * as path from "path";
import { iconItems, ListItem, Note, NoteColors, NoteIcons, NoteType } from "./types";
import { timeAgo } from "./utils";

const notes: Record<string, Note[]> = {};
let activeHighlight: vscode.TextEditorDecorationType | null = null;

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
				contentText: ` ${note.message}`,
				color: NoteColors[note.type],
				fontStyle: "italic",
			},
		},
	};

	editor.setDecorations(activeHighlight, [decoration]);
	editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}

export function activate(context: vscode.ExtensionContext) {

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
				});

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

			const picked = await vscode.window.showQuickPick(
				notes,
				{ placeHolder: "Select Note" }
			);

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

			const picked = await vscode.window.showQuickPick(notesList, { placeHolder: "Select Note to be Deleted" });

			if (picked) {
				
				const index = notes[picked.note.path].indexOf(picked.note);
				if (index !== -1) {
					notes[picked.note.path].splice(index, 1);
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

