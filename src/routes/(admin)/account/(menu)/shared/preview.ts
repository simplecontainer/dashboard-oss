import {activeDockItem, editorContent, editorPreview, showFullScreenDiv} from "../stores/dock";

export function Preview(event) {
    const parent = event.currentTarget.parentElement;
    const codeEl = parent.querySelector("pre > code");

    if (codeEl) {
        editorContent.set(codeEl.textContent.trim())
        editorPreview.set(true)
        showFullScreenDiv.set(true)
        activeDockItem.set("Editor")
    }
}