<script lang="ts">
    import { writable } from 'svelte/store';
    import { wiggle } from '../shared.ts/actions/wiggle';
    import loader from '@monaco-editor/loader';
    import {connection} from "../stores/connections"
    import {activeDockItem, showFullScreenDiv, activeContent, editorContent, editorPreview} from "../stores/dock"
    import EditorModule from '../shared/editor.svelte'
    import { onMount, onDestroy } from 'svelte';
    import toastStore from '../../toasts';
    import yaml from 'js-yaml';

    let editorRef: any

    let code = "// Your code here...";
    let lang = "yaml";
    let theme = "vs-light";
    let autoLayout = false;

    function handleDockItemClick(event, itemName, content) {
        if ($activeDockItem === itemName) {
            activeDockItem.set(null);
            activeContent.set("");
            showFullScreenDiv.set(false);
        } else {
            activeDockItem.set(itemName);
            activeContent.set(content);
            editorPreview.set(false)
            showFullScreenDiv.set(true);
        }
    }

    function handleEscKey(event) {
        if (event.key === 'Escape' && $showFullScreenDiv) {
            showFullScreenDiv.set(false);
            activeDockItem.set(null);
        }
    }

    const Apply = async (object) => {
        const resp = await fetch(`${$connection.GetProxyURL()}/api/v1/propose/apply`, {
            method: 'POST',
            headers: {
                Upstream: btoa($connection.Context.API).replace(/=+$/,''),
            },
            body: JSON.stringify(yaml.load($editorContent))
        });

        const result = await resp.json();

        if (resp.ok) {
            toastStore.addToast({ message: result.Explanation, type: 'success' });
        } else {
            toastStore.addToast({ message: result.ErrorExplanation, type: 'error' });
        }
    }

    onMount(async () => {
        await loader.init();
        document.addEventListener('keydown', handleEscKey);

        onDestroy(() => {
            document.removeEventListener('keydown', handleEscKey);
        });
    });
</script>

<div class="dock dock-md w-full bg-base-200"
     class:fixed={!!$activeDockItem}
     class:top-0={!!$activeDockItem}
     class:dock-full={!!$activeDockItem}>

    <button use:wiggle
            class="inline-flex items-center gap-1"
            class:dock-active={$activeDockItem === 'Shell'}>
        <svg class="size-[1.2em]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" stroke="#1C274C" stroke-width="1.5"/>
            <path d="M17 15H14.5H12" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M7 10L7.2344 10.1953C8.51608 11.2634 9.15693 11.7974 9.15693 12.5C9.15693 13.2026 8.51608 13.7366 7.2344 14.8047L7 15" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="dock-label">Shell</span>
    </button>

    <button use:wiggle
            class="inline-flex items-center gap-1"
            class:dock-active={$activeDockItem === 'Packs'}>
        <svg class="size-[1.2em]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 10.9112C3 10.8182 3 10.7717 3.00057 10.7303C3.0385 7.98021 4.94139 5.60803 7.61778 4.97443C7.65803 4.9649 7.70344 4.95481 7.79425 4.93463C7.87787 4.91605 7.91968 4.90675 7.96109 4.89775C10.6226 4.31875 13.3774 4.31875 16.0389 4.89775C16.0803 4.90675 16.1221 4.91605 16.2057 4.93463C16.2966 4.95481 16.342 4.9649 16.3822 4.97443C19.0586 5.60803 20.9615 7.98021 20.9994 10.7303C21 10.7717 21 10.8182 21 10.9112V16.3752C21 18.4931 19.529 20.3269 17.4615 20.7864C13.8644 21.5857 10.1356 21.5857 6.53853 20.7864C4.47101 20.3269 3 18.4931 3 16.3752V10.9112Z"
                  stroke="#1C274D" stroke-width="1.5"/>
            <path d="M17.5 15.5V17" stroke="#1C274D" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M15.9585 4.5C15.7205 3.08114 14.4865 2 13 2H11C9.51353 2 8.27954 3.08114 8.0415 4.5"
                  stroke="#1C274D" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M3 14C8.72979 16.5466 15.2702 16.5466 21 14" stroke="#1C274D" stroke-width="1.5"
                  stroke-linecap="round"/>
            <path d="M10 13H14" stroke="#1C274D" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="dock-label">Packs</span>
    </button>

    <button on:click={(event) => handleDockItemClick(event, 'Editor', '<div id="editor"></div>')}
            class="inline-flex items-center gap-1"
            class:dock-active={$activeDockItem === 'Editor'}>
        <svg class="size-[1.2em]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.5 9L15.6716 9.17157C17.0049 10.5049 17.6716 11.1716 17.6716 12C17.6716 12.8284 17.0049 13.4951 15.6716 14.8284L15.5 15"
                  stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M13.2939 7.17041L11.9998 12L10.7058 16.8297" stroke="#1C274C" stroke-width="1.5"
                  stroke-linecap="round"/>
            <path d="M8.50019 9L8.32861 9.17157C6.99528 10.5049 6.32861 11.1716 6.32861 12C6.32861 12.8284 6.99528 13.4951 8.32861 14.8284L8.50019 15"
                  stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z"
                  stroke="#1C274C" stroke-width="1.5"/>
        </svg>
        <span class="dock-label">Editor</span>
    </button>
</div>

{#if $showFullScreenDiv}
    <div class="fullscreen-overlay">
        {#if $activeDockItem == "Editor"}
            <div class="flex w-full flex-col mt-2 mb-2">
                <div class="navbar bg-base-200 shadow-sm mb-5">
                    <div class="navbar-start">
                        <div class="dropdown">
                            <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" /> </svg>
                            </div>
                        </div>
                        <a class="btn btn-ghost text-xl">Empty file</a>
                    </div>
                    <div class="navbar-end">
                        {#if $connection != undefined && $connection.State != null && $connection.State.WSS == true && $editorPreview === false}
                        <a class="btn btn-success" on:click={() => Apply()}>Apply</a>
                        {/if}
                    </div>
                </div>

                <EditorModule bind:this={editorRef} code={$editorContent} language={lang} theme={theme} automaticLayout={autoLayout} />
            </div>
        {/if}
    </div>
{/if}

<style>
    .dock {
        transition: top 0.5s ease-in-out;
        z-index: 1050;
    }

    .dock-full {
       border-bottom: 0.5px solid color-mix(in srgb, var(--color-base-content) 5%, #0000)
    }

    .fullscreen-overlay {
        position: fixed;
        top: 56px; /* Adjust the margin-top based on the fixed dock height */
        left: 0;
        right: 0;
        bottom: 0;
        height: calc(100% - 56px); /* 56px is the typical dock height */
        background-color: rgba(255, 255, 255, 1);
        display: block;
        z-index: 1000;
    }

    .fixed {
        position: fixed;
        width: 100%;
        z-index: 1060;
    }

    .top-0 {
        top: 0;
    }
</style>
