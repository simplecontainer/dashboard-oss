<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import loader from '@monaco-editor/loader';

    // Define props to accept configuration for Monaco editor
    export let original: string = "// Start typing your definition here...";
    export let diff: string = "// Start typing your definition here...";
    export let language: string;
    export let theme: string
    export let automaticLayout: boolean = true;
    export let height: string = "height: 100vh;"

    let editorContainer: HTMLDivElement;
    let editor: Monaco.editor.IStandaloneCodeEditor | null = null;


    onMount(async () => {
        await loader.init();

        editor = await monaco.editor.createDiffEditor(editorContainer, {
            enableSplitViewResizing: true,
            readOnly: true,
            originalEditable: false,
            modifiedEditable: false,
            automaticLayout: automaticLayout,
        });

        var oModel = monaco.editor.createModel(JSON.stringify(original, null, 2), 'json');
        var mModel = monaco.editor.createModel(JSON.stringify(diff, null, 2), 'json');

        editor.setModel({
            original: oModel,
            modified: mModel
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
