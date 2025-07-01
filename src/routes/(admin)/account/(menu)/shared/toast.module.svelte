<script>
import toastStore from "../../toasts";
</script>

<div class="toast toast-end" style="z-index:9999">
    {#each $toastStore as { id, message, type }}
        <div
                class="alert alert-{type} cursor-pointer"
                on:click={() => toastStore.removeToast(id)}
        >
            {message}
        </div>
    {/each}
</div>
