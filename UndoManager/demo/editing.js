"use strict";

function insertContentAtSelection(contentToInsert, undoLabel) {
    if (!contentToInsert.length) {
        console.error("Invalid argument to insertContentAtSelection.");
        return null;
    }

    const originalRange = getSelection().getRangeAt(0);
    const originalContent = replaceWithContent(originalRange, contentToInsert);
    if (!document.undoManager)
        return;

    document.undoManager.addItem(new UndoItem({
        label: undoLabel || "Editing",
        undo: () => {
            const rangeToUndo = rangeFromContent(contentToInsert);
            replaceWithContent(rangeToUndo, originalContent);
        },
        redo: () => {
            const rangeToRedo = rangeFromContent(originalContent) || originalRange;
            replaceWithContent(rangeToRedo, contentToInsert);
        }
    }));
}

// Returns the content being replaced.
function replaceWithContent(rangeToReplace, content) {
    if (!rangeToReplace || !content) {
        console.error("Invalid argument to replaceWithContent.");
        return null;
    }

    const replacedContent = rangeToReplace.cloneContents();
    rangeToReplace.deleteContents();
    for (let index = content.length - 1; index >= 0; index--)
        rangeToReplace.insertNode(content[index]);
    return Array.from(replacedContent.childNodes);
}

// Assumes that content is a list of DOM nodes in order.
function rangeFromContent(content) {
    const range = document.createRange();
    if (!content.length)
        return null;

    range.setStartBefore(content[0]);
    range.setEndAfter(content[content.length - 1]);
    return range;
}
