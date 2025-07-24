import {writable} from "svelte/store";

export const activeDockItem = writable(null);
export const showFullScreenDiv = writable(false);
export const activeContent = writable("");

export const editorContent = writable("")
export const editorFile = writable("")
export const editorPreview = writable(false)