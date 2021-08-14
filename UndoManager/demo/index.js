"use strict";

function parseRGBFromHex(sixDigitHex) {
    const match = sixDigitHex.match(/^#([0-9a-f]{6})$/i)[1];
    if (!match) {
        console.error(`Failed to parse ${sixDigitHex}`);
        return [0, 0, 0];
    }
    return [
        parseInt(match.substr(0, 2),16),
        parseInt(match.substr(2, 2),16),
        parseInt(match.substr(4, 2),16)
    ];
}

function insertDrawableCanvas() {
    if (document.activeElement !== editor){
        editor.focus();
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse();
        getSelection().removeAllRanges();
        getSelection().addRange(range);
    }

    const drawableTemplateChildren = document.querySelector("template#drawable").content.children;
    const [container, lineBreak] = Array.from(drawableTemplateChildren).map(child => child.cloneNode(true));
    insertContentAtSelection([container, lineBreak], "New Drawing");
    getSelection().setPosition(lineBreak, 1);
    setupCanvasForDrawing(container);
}

function createLineBreak() {
    const div = document.createElement("div");
    const br = document.createElement("br");
    div.appendChild(br);
    return div;
}

addEventListener("DOMContentLoaded", () => {
    function setupToolbarItem(className, callback) {
        document.querySelector(`.toolbar-item.${className}`).addEventListener("mousedown", event => {
            callback();
            event.preventDefault();
        });
    }

    setupToolbarItem("toggle-bold", () => document.execCommand("Bold"));
    setupToolbarItem("toggle-italic", () => document.execCommand("Italic"));
    setupToolbarItem("toggle-underline", () => document.execCommand("Underline"));
    setupToolbarItem("toggle-strikethrough", () => document.execCommand("Strikethrough"));
    setupToolbarItem("insert-drawing", insertDrawableCanvas);
    setupToolbarItem("undo", () => document.execCommand("Undo"));
    setupToolbarItem("redo", () => document.execCommand("Redo"));
    setupToolbarItem("clear", () => {
        const editor = document.querySelector("#editor");
        getSelection().selectAllChildren(editor);
        insertContentAtSelection([createLineBreak()], "Clear all");
        editor.focus();
    });
});
