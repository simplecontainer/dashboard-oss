<script lang="ts">
    import { type Writable } from "svelte/store";
    import {onDestroy} from "svelte";

    export let type: string = "success";
    export let message: string = "Are you sure?";
    export let open: Writable<boolean>
    export let showResponse: string = "";
    export let messageResponse: string = "";
    export let onConfirm: () => void;
    export let onCancel: () => void;

    async function WrapOnCancel(fn: () => void) {
        open.set(false);
        fn();
    }

    async function WrapOnConfirm(fn: () => void) {
        open.set(false)
        fn();
    }
</script>

{#if $open}
    <div role="alert" class="alert alert-{type} mt-5">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span id="confirm-msg">{message}</span>
        <div id="confirm-btns">
            <button class="btn btn-sm" on:click={() => WrapOnCancel(onCancel)}>Cancel</button>
            <button class="btn btn-sm btn-{type}" on:click={() => WrapOnConfirm(onConfirm)}>Confirm</button>
        </div>
    </div>
{/if}

{#if showResponse}
    <div role="alert" class="alert mt-5" class:alert-success={showResponse === "success"} class:alert-error={showResponse === "error"}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            {#if showResponse === "success"}
                <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            {:else if showResponse === "error"}
                <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            {/if}
        </svg>
        <span>{messageResponse}</span>
    </div>
{/if}
