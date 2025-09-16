<script>
  import { onMount, onDestroy } from 'svelte';
  import { openOverlayStore } from '../stores/expandable.ts';

  export let value = "";
  export let placeholder = "b64";
  export let size = "text-base";
  export let join = " ";

  let containerEl;
  let inputEl;
  let overlayInputEl;
  let overlayVisible = false;
  let copied = false;
  let overlayLeft = 0;
  let overlayWidth = 0;

  const COPY_BUTTON_WIDTH = 40;

  // new state for edit tracking
  let editedValue = "";
  let isDirty = false;

  function normalizeValue(val) {
    return Array.isArray(val) ? val.join(join) : (val ?? "");
  }

  function encodeUTF8(str) {
    return btoa(encodeURIComponent(str));
  }

  function decodeUTF8(b64) {
    return decodeURIComponent(atob(b64));
  }

  function calculateWidth(text, inputEl, containerEl, placeholder, copyButtonWidth = 0) {
    const span = document.createElement("span");
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.whiteSpace = "pre";

    const inputStyle = getComputedStyle(inputEl);
    span.style.font = inputStyle.font;

    span.textContent = text || placeholder;
    document.body.appendChild(span);

    let width = span.offsetWidth;
    width += parseFloat(inputStyle.paddingLeft) + parseFloat(inputStyle.paddingRight);
    width += copyButtonWidth;

    document.body.removeChild(span);

    const minWidth = containerEl.offsetWidth;
    const maxWidth = containerEl.offsetWidth * 0.8; // 80% of parent
    return Math.max(minWidth, Math.min(width, maxWidth));
  }

  const toggleOverlay = () => {
    overlayWidth = calculateWidth(
      value,
      inputEl,
      containerEl,
      placeholder,
      COPY_BUTTON_WIDTH
    );

    const rect = containerEl.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.left;
    const spaceLeft = rect.left;

    overlayLeft = 0;
    if (overlayWidth > spaceRight) {
      overlayLeft = rect.width - overlayWidth;
      overlayLeft = Math.max(-spaceLeft, overlayLeft);
    }

    openOverlayStore.update(current => {
      if (current && current !== collapseOverlay) current();
      return collapseOverlay;
    });

    editedValue = normalizeValue(decodeUTF8(value));
    isDirty = false;
    overlayVisible = true;

    setTimeout(() => overlayInputEl?.focus(), 0);
  };

  const collapseOverlay = () => {
    overlayVisible = false;
    copied = false;
    isDirty = false;
    openOverlayStore.update(current => (current === collapseOverlay ? null : current));
  };

  const handleCopy = async () => {
    if (value) {
      await navigator.clipboard.writeText(value);
      copied = true;
      setTimeout(() => {
        copied = false;
        collapseOverlay();
      }, 500);
    }
  };

  const handleCancel = () => {
    editedValue = normalizeValue(decodeUTF8(value));
    isDirty = false;
  };

  const handleClickOutside = (event) => {
    if (overlayVisible && !containerEl.contains(event.target)) {
      collapseOverlay();
    }
  };

  onMount(() => document.addEventListener("click", handleClickOutside));
  onDestroy(() => document.removeEventListener("click", handleClickOutside));
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
        box-shadow: 0 0 0 1px #d1d5db;
    }

    .overlay-container:focus-within {
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6;
    }

    .overlay-container.dirty {
        border-color: #f97316; /* orange-500 */
        box-shadow: 0 0 0 1px #f97316;
    }

    .overlay-input {
        flex: 1;
        border: none;
        outline: none;
        cursor: text;
        background: transparent;
    }

    .copy-success svg {
        color: #10b981;
    }

    .copy-section svg {
        width: 18px;
        height: 18px;
        color: #6b7280;
    }

    .input, .label {
        outline: none !important;
        box-shadow: none !important;
    }
</style>

<div class="relative w-full" bind:this={containerEl}>
  <!-- Main input with left label -->
  <div class="join w-full">
    <label class="input w-full join-item focus-within:border-base-300 focus-within:outline-none focus-within:ring-0">
      <span class="label">{placeholder}</span>
      <input
        class="input input-bordered truncate-input w-full p-3 focus:outline-none focus:ring-0 cursor-pointer {size}"
        readonly
        value={normalizeValue(value)}
        bind:this={inputEl}
        on:click|stopPropagation={toggleOverlay}
      />
    </label>
  </div>

  {#if overlayVisible}
    <div
      class="overlay-container {isDirty ? 'dirty' : ''}"
      style="width: {overlayWidth}px; left: {overlayLeft}px;"
    >
      <div class="join w-full">
        <!-- Input -->
        <label class="input input-bordered join-item flex items-center {size} w-full
                   focus-within:outline-none focus-within:ring-0 focus-within:border-base-300">
          <span class="label mr-2">plain</span>
          <input
            bind:this={overlayInputEl}
            class="overlay-input w-full bg-transparent outline-none focus:outline-none focus:ring-0"
            bind:value={editedValue}
            on:input={() => { isDirty = editedValue !== normalizeValue(decodeUTF8(value)); }}
            on:keydown={(e) => e.key === 'Escape' && collapseOverlay()}
          />
        </label>

        <!-- Copy button -->
        <button
          type="button"
          class="join-item w-10 p-0 rounded-none border-l border-base-300 flex items-center justify-center hover:bg-base-200 focus:outline-none focus:ring-0 focus:border-base-300 cursor-pointer"
          on:click|stopPropagation={handleCopy}
          aria-label="Copy value"
        >
          {#if copied}
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-success">
              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-gray-500">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2
                     2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/>
            </svg>
          {/if}
        </button>

        {#if isDirty}
<!--          &lt;!&ndash; Save button &ndash;&gt;-->
<!--          <button-->
<!--            type="button"-->
<!--            class="join-item px-3 bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-0 cursor-pointer"-->
<!--            on:click|stopPropagation={handleSave}-->
<!--          >-->
<!--            Save-->
<!--          </button>-->

          <!-- Cancel button -->
          <button
            type="button"
            class="join-item px-3 bg-base-200 text-base-content hover:bg-base-300 focus:outline-none focus:ring-0 cursor-pointer"
            on:click|stopPropagation={handleCancel}
          >
            Cancel
          </button>
        {/if}
      </div>
    </div>
  {/if}

</div>
