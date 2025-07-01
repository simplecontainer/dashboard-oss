<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    // Define props to accept configuration for Monaco editor
    export let content: any
    export let code: string = "// Start typing your definition here...";
    export let language: string;
    export let theme: string
    export let automaticLayout: boolean = true;
    export let height: string = "height: 100vh;"

    let editorContainer: HTMLDivElement;
    let editor: Monaco.editor.IStandaloneCodeEditor | null = null;


    onMount(async () => {
        editor = await monaco.editor.create(editorContainer, {
            value: code,
            language,
            theme,
            automaticLayout,
        });

        editor.onDidChangeModelContent(() => {
            content.set(editor.getValue());
        });
    });

    onDestroy(() => {
        if (editor) {
            editor.dispose();
        }
    });
</script>

<div style="width: 100%; {height}">
    <div bind:this={editorContainer} style="width: 100%; {height}"></div>
</div>

<style>
    div {
        position: relative;
    }
</style>
