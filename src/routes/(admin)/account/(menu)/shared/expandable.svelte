<script>
  import { onMount, onDestroy } from 'svelte';
  import { openOverlayStore } from '../stores/expandable.ts';

  export let value = "";
  export let placeholder = "Click to expand...";
  export let size= "text-base"
  export let join = " ";

  let containerEl;
  let overlayVisible = false;
  let copied = false;
  let overlayLeft = 0;
  let overlayInputEl;
  let overlayWidth = 0;

  const COPY_BUTTON_WIDTH = 40;

  function normalizeValue(val) {
    if (Array.isArray(val)) return val.join(join);
    return val ?? "";
  }

  function calculateWidth(text) {
    const span = document.createElement("span");
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.whiteSpace = "pre";
    span.style.font = "16px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    span.textContent = text || placeholder;
    document.body.appendChild(span);
    const width = span.offsetWidth + 24 + COPY_BUTTON_WIDTH;
    document.body.removeChild(span);
    const maxWidth = window.innerWidth - containerEl.getBoundingClientRect().left - 20;
    return Math.max(containerEl.offsetWidth, Math.min(width, maxWidth));
  }

  const toggleOverlay = () => {
    overlayWidth = calculateWidth(value);

    const rect = containerEl.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;

    if (spaceRight >= overlayWidth) overlayLeft = 0;
    else if (spaceLeft >= overlayWidth) overlayLeft = rect.width - overlayWidth;
    else overlayLeft = Math.max(-spaceLeft, Math.min(spaceRight - overlayWidth + rect.width, 0));

    // Close any other overlay using the shared store
    openOverlayStore.update(current => {
      if (current && current !== collapseOverlay) current();
      return collapseOverlay;
    });

    overlayVisible = true;
    setTimeout(() => overlayInputEl?.focus(), 0);
  };

  const collapseOverlay = () => {
    overlayVisible = false;
    copied = false;
    openOverlayStore.update(current => (current === collapseOverlay ? null : current));
  };

  const handleCopy = async () => {
    if (value) {
      await navigator.clipboard.writeText(value);
      copied = true;
      setTimeout(() => {
        copied = false
        collapseOverlay()
      }, 230);
    }
  };

  const handleClickOutside = (event) => {
    if (overlayVisible && !containerEl.contains(event.target)) {
      collapseOverlay();
    }
  };

  onMount(() => document.addEventListener('click', handleClickOutside));
  onDestroy(() => document.removeEventListener('click', handleClickOutside));
</script>

<style>
    .truncate-input {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .overlay-container {
        position: absolute;
        top: 0;
        z-index: 50;
        display: flex;
        background: white;
        overflow: hidden;
        border-radius: 0.25rem;
        box-shadow: 0 0 0 1px;
        transition: box-shadow 0.2s;
    }

    .overlay-container:focus-within {
        box-shadow: 0 0 0 1px #3b82f6;
    }

    .overlay-input {
        flex: 1;
        border: none;
        outline: none;
        cursor: text;
        background: transparent;
    }

    .copy-section {
        width: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-left: 1px solid #d1d5db;
        cursor: pointer;
        transition: background 0.2s;
    }

    .copy-section:hover {
        background-color: #f3f4f6;
    }

    .copy-success svg {
        color: #10b981;
    }

    .copy-section svg {
        width: 18px;
        height: 18px;
        color: #6b7280;
    }
</style>

<div class="relative" bind:this={containerEl}>
  <!-- Original input -->
  <input
    class="input input-bordered truncate-input w-full p-3 cursor-pointer focus:outline-none focus:ring-0 {size}"
    readonly
    value={normalizeValue(value)}
    placeholder={placeholder}
    title={value}
    on:click|stopPropagation={toggleOverlay}
  />

  {#if overlayVisible}
    <div
      class="overlay-container"
      style="width: {overlayWidth}px; left: {overlayLeft}px;"
    >
      <input
        bind:this={overlayInputEl}
        class="input overlay-input focus:outline-none focus:ring-0 {size}"
        readonly
        value={normalizeValue(value)}
        on:keydown={(e) => e.key === 'Escape' && collapseOverlay()}
      />
      <div
        class="copy-section {copied ? 'copy-success' : ''}"
        on:click|stopPropagation={handleCopy}
        aria-label="Copy text"
      >
        {#if copied}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z" />
          </svg>
        {/if}
      </div>
    </div>
  {/if}
</div>
