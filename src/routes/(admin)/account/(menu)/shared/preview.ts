import { activeDockItem, editorContent, editorFile, editorPreview, showFullScreenDiv } from '../stores/dock';
import * as yaml from 'js-yaml';

export function Preview(event, resource: string) {
    const parent = event.currentTarget.parentElement;
    const codeEl = parent.querySelector("pre > code");

    if (codeEl) {
        editorContent.set(codeEl.textContent.trim())
        editorPreview.set(true)
        editorFile.set(resource)
        showFullScreenDiv.set(true)
        activeDockItem.set("Editor")
    }
}

export function Edit(event, resource: string, content: any) {
    const parent = event.currentTarget.parentElement;
    const codeEl = parent.querySelector("pre > code");

    try {
        const parsed = yaml.dump(content);

        editorContent.set(parsed)
        editorPreview.set(false)
        editorFile.set(resource)
        showFullScreenDiv.set(true)
        activeDockItem.set("Editor")
    } catch (err) {
        console.log(err)
    }
}