<script lang="ts">
  import { derived, writable } from 'svelte/store';
  import { wiggle } from '../shared.ts/actions/wiggle';
  import loader from '@monaco-editor/loader';
  import { connection } from "../stores/connections";
  import {
    activeDockItem,
    showFullScreenDiv,
    activeContent,
    editorContent,
    editorFile,
    editorPreview
  } from "../stores/dock";
  import EditorModule from '../shared/editor.svelte';
  import XtermTerminal from '../shared/shell.svelte';
  import { onMount, onDestroy } from 'svelte';
  import toastStore from '../../toasts';
  import yaml from 'js-yaml';
  import { containersMap, LoadContainers } from '../stores/containers';

  // Component state
  let editorRef: any;
  let terminalRef: any;

  // Editor configuration
  let code = "// Your code here...";
  let lang = "yaml";
  let theme = "vs-light";
  let autoLayout = false;

  // Terminal configuration - these will be passed to the terminal component
  let selectedContainer: any = null;
  let terminalShell = '/bin/bash';
  let terminalFormat = '';
  let terminalInitialCommand = '';

  // Search and filtering
  let searchQuery = '';
  let customCommands: Record<string, string> = {};

  // Reactive filtered containers
  $: filteredContainers = Object.values($containersMap).filter(container =>
    container.Platform.GeneratedName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Container interface
  interface Container {
    Platform: {
      GeneratedName: string;
      Image: string;
      Tag: string;
    };
    General: {
      Status: {
        state: {
          state: string;
        };
      };
    };
  }

  // Lifecycle
  onMount(async () => {
    await loader.init();
    document.addEventListener('keydown', handleEscKey);
    LoadContainers($connection);
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', handleEscKey);
    }
  });

  // Event handlers
  function handleDockItemClick(event: Event, itemName: string, content: string) {
    if ($activeDockItem === itemName) {
      activeDockItem.set(null);
      activeContent.set("");
      showFullScreenDiv.set(false);
    } else {
      activeDockItem.set(itemName);
      activeContent.set(content);
      editorPreview.set(false);
      showFullScreenDiv.set(true);
    }
  }

  function handleEscKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && $showFullScreenDiv) {
      showFullScreenDiv.set(false);
      activeDockItem.set(null);
    }
  }

  function handleContainerDockClick(event: Event) {
    if ($activeDockItem === 'Shell') {
      activeDockItem.set(null);
      activeContent.set("");
      showFullScreenDiv.set(false);
    } else {
      activeDockItem.set('Shell');
      activeContent.set('shell');
      showFullScreenDiv.set(true);
    }
  }

  // Container shell execution
  function executeShell(container: Container, shell: string, customCommand: string = '') {
    selectedContainer = container;
    terminalShell = shell;
    terminalFormat = `simplecontainer.io/v1/kind/containers/${container.Platform.Group}/${container.Platform.GeneratedName}`;

    // Set initial command if provided
    if (customCommand) {
      terminalInitialCommand = customCommand;
    } else {
      terminalInitialCommand = '';
    }

    console.log(`Executing: docker exec -it ${container.Platform.GeneratedName} ${shell}`);
    console.log(`Terminal format: ${terminalFormat}`);

    // Switch to terminal view
    activeDockItem.set('Terminal');
    activeContent.set('terminal');
    showFullScreenDiv.set(true);

    // Optional: Send command directly to terminal if it's already mounted
    if (terminalRef && customCommand) {
      setTimeout(() => {
        terminalRef.sendCommand(customCommand);
      }, 1000); // Wait for terminal to be ready
    }
  }

  function handleCustomCommand(container: Container, value: string) {
    customCommands[container.Platform.GeneratedName] = value;
  }

  function handleKeydown(event: KeyboardEvent, container: Container, shell: string) {
    if (event.key === 'Enter') {
      const customCommand = customCommands[container.Platform.GeneratedName] || '';
      executeShell(container, shell, customCommand);
    }
  }

  // YAML application
  const Apply = async () => {
    try {
      const resp = await fetch(`${$connection.GetProxyURL()}/api/v1/propose/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Upstream': btoa($connection.Context.API).replace(/=+$/, ''),
        },
        body: JSON.stringify(yaml.load($editorContent))
      });

      const result = await resp.json();

      if (resp.ok) {
        toastStore.addToast({
          message: result.Explanation || 'Applied successfully',
          type: 'success'
        });
      } else {
        toastStore.addToast({
          message: result.ErrorExplanation || 'Failed to apply',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Apply error:', error);
      toastStore.addToast({
        message: 'Failed to apply configuration',
        type: 'error'
      });
    }
  };

  // Terminal event handlers
  function handleTerminalConnected() {
    console.log('Terminal connected');
    toastStore.addToast({
      message: 'Terminal connected successfully',
      type: 'success'
    });
  }

  function handleTerminalDisconnected(event: CustomEvent) {
    console.log('Terminal disconnected:', event.detail);
    toastStore.addToast({
      message: `Terminal disconnected: ${event.detail.reason || 'Unknown reason'}`,
      type: 'warning'
    });
  }

  function handleTerminalError(event: CustomEvent) {
    console.error('Terminal error:', event.detail);
    toastStore.addToast({
      message: event.detail.message || 'Terminal error occurred',
      type: 'error'
    });
  }

  // Helper function for container status
  function getContainerStatus(container: Container): 'running' | 'stopped' | 'error' {
    const state = container.General?.Status?.state?.state;
    if (state === 'running') return 'running';
    if (state === 'exited' || state === 'stopped') return 'stopped';
    return 'error';
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'running': return 'badge-success';
      case 'stopped': return 'badge-warning';
      case 'error': return 'badge-error';
      default: return 'badge-ghost';
    }
  }
</script>

<!-- Container Dropdown (only show when dock is at bottom and Containers is active) -->
{#if $activeDockItem === 'Shell' && !$showFullScreenDiv}
  <div class="fixed bottom-16 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-50">
    <div class="dropdown-content card compact w-full p-0 shadow-2xl bg-base-100 border border-base-300">
      <!-- Fixed Search Bar -->
      <div class="card-body p-4 border-b border-base-300 bg-base-200">
        <div class="form-control">
          <label class="input input-bordered flex items-center gap-2">
            <input
              type="text"
              class="grow"
              placeholder="Search containers..."
              bind:value={searchQuery}
            />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 opacity-70">
              <path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
            </svg>
          </label>
        </div>
      </div>

      <!-- Container List -->
      <div class="max-h-96 overflow-y-auto">
        {#each filteredContainers as container (container.Platform.GeneratedName)}
          {@const containerStatus = getContainerStatus(container)}
          <div class="card-body p-4 border-b border-base-300">
            <!-- Container Info -->
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="card-title text-sm">{container.Platform.GeneratedName}</h3>
                <p class="text-xs opacity-70">{container.Platform.Image}:{container.Platform.Tag}</p>
              </div>
              <div class="badge {getStatusBadgeClass(containerStatus)} badge-sm">
                {containerStatus}
              </div>
            </div>

            <!-- Shell Buttons -->
            <div class="card-actions justify-start mb-2">
              <button
                class="btn btn-outline btn-xs"
                on:click={() => executeShell(container, '/bin/bash')}
                disabled={containerStatus !== 'running'}
              >
                /bin/bash
              </button>
              <button
                class="btn btn-outline btn-xs"
                on:click={() => executeShell(container, '/bin/sh')}
                disabled={containerStatus !== 'running'}
              >
                /bin/sh
              </button>
            </div>

            <!-- Custom Command Input -->
            <div class="form-control">
              <div class="join">
                <input
                  type="text"
                  placeholder="Optional command..."
                  class="input input-bordered input-xs join-item flex-1"
                  on:input={(e) => handleCustomCommand(container, e.target.value)}
                  on:keydown={(e) => handleKeydown(e, container, '/bin/bash')}
                  disabled={containerStatus !== 'running'}
                />
                <button
                  class="btn btn-xs join-item"
                  on:click={() => executeShell(container, '/bin/bash', customCommands[container.Platform.GeneratedName])}
                  disabled={containerStatus !== 'running'}
                >
                  Run
                </button>
              </div>
            </div>
          </div>
        {/each}

        {#if filteredContainers.length === 0}
          <div class="card-body p-4 text-center">
            <div class="hero">
              <div class="hero-content text-center">
                <div class="max-w-md">
                  <p class="text-base-content/50">No containers found</p>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Main Dock -->
<div class="dock dock-md w-full bg-base-100"
     class:fixed={!!$activeDockItem}
     class:top-0={!!$activeDockItem}
     class:dock-full={!!$activeDockItem}>

  <button on:click={handleContainerDockClick}
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

<!-- Fullscreen Content -->
{#if $showFullScreenDiv}
  <div class="fullscreen-overlay">
    <!-- Editor View -->
    {#if $activeDockItem === "Editor"}
      <div class="flex w-full flex-col mt-2 mb-2">
        <div class="navbar bg-base-100 shadow-sm mb-5">
          <div class="navbar-start">
            <div class="dropdown">
              <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" />
                </svg>
              </div>
            </div>
            <a class="btn btn-ghost text-xl">{$editorFile || 'Untitled'}</a>
          </div>
          <div class="navbar-end">
            {#if $connection?.State?.WSS && !$editorPreview}
              <button class="btn btn-success" on:click={Apply}>Apply</button>
            {/if}
          </div>
        </div>

        <EditorModule bind:this={editorRef} code={$editorContent} language={lang} theme={theme} automaticLayout={autoLayout} />
      </div>
    {/if}

    <!-- Shell Container Selection View -->
    {#if $activeDockItem === "Shell"}
      <div class="flex w-full flex-col mt-2 mb-2">
        <div class="navbar bg-base-100 shadow-sm mb-5">
          <div class="navbar-start">
            <a class="btn btn-ghost text-xl">Select Container for Shell</a>
          </div>
          <div class="navbar-end">
            <div class="form-control">
              <input
                type="text"
                placeholder="Search containers..."
                class="input input-bordered input-sm w-64"
                bind:value={searchQuery}
              />
            </div>
          </div>
        </div>

        <!-- Container Grid -->
        <div class="container mx-auto p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each filteredContainers as container (container.Platform.GeneratedName)}
              {@const containerStatus = getContainerStatus(container)}
              <div class="card bg-base-100 shadow-xl border {containerStatus === 'running' ? 'border-success' : 'border-base-300'}">
                <div class="card-body">
                  <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                      <h2 class="card-title text-lg truncate">{container.Platform.GeneratedName}</h2>
                      <p class="text-sm opacity-70 truncate">{container.Platform.Image}:{container.Platform.Tag}</p>
                    </div>
                    <div class="badge {getStatusBadgeClass(containerStatus)} badge-lg">
                      {containerStatus}
                    </div>
                  </div>

                  <!-- Shell Buttons -->
                  <div class="card-actions justify-start mb-4 gap-2">
                    <button
                      class="btn btn-outline btn-sm flex-1"
                      on:click={() => executeShell(container, '/bin/bash')}
                      disabled={containerStatus !== 'running'}
                      title="Connect with Bash shell"
                    >
                      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z"/>
                      </svg>
                      bash
                    </button>
                    <button
                      class="btn btn-outline btn-sm flex-1"
                      on:click={() => executeShell(container, '/bin/sh')}
                      disabled={containerStatus !== 'running'}
                      title="Connect with sh shell"
                    >
                      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z"/>
                      </svg>
                      sh
                    </button>
                  </div>

                  <!-- Custom Command Input -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text text-xs">Custom command (optional)</span>
                    </label>
                    <div class="join">
                      <input
                        type="text"
                        placeholder="e.g., ls -la, top, ps aux..."
                        class="input input-bordered input-sm join-item flex-1"
                        bind:value={customCommands[container.Platform.GeneratedName]}
                        on:keydown={(e) => handleKeydown(e, container, '/bin/bash')}
                        disabled={containerStatus !== 'running'}
                      />
                      <button
                        class="btn btn-primary btn-sm join-item"
                        on:click={() => executeShell(container, '/bin/bash', customCommands[container.Platform.GeneratedName])}
                        disabled={containerStatus !== 'running'}
                        title="Execute with custom command"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>

          {#if filteredContainers.length === 0}
            <div class="hero min-h-96">
              <div class="hero-content text-center">
                <div class="max-w-md">
                  <svg class="w-24 h-24 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7H5m10 10v2m-4-2v6m-2-4h8"/>
                  </svg>
                  <h1 class="text-3xl font-bold">No containers found</h1>
                  <p class="py-6">
                    {searchQuery ? 'Try adjusting your search criteria' : 'No containers are currently available'}
                  </p>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Terminal View with Proper Props -->
    {#if $activeDockItem === "Terminal" && selectedContainer}
      <div class="flex w-full flex-col mt-2 mb-2">
        <div class="navbar bg-base-100 shadow-sm mb-5">
          <div class="navbar-start">
            <button
              class="btn btn-ghost btn-sm mr-2"
              on:click={() => {
                activeDockItem.set('Shell');
                activeContent.set('shell');
              }}
              title="Back to container selection"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <a class="btn btn-ghost text-xl">
              {selectedContainer.Platform.GeneratedName} - {terminalShell}
            </a>
          </div>
          <div class="navbar-end">
            <div class="badge badge-outline badge-sm">
              {terminalFormat}
            </div>
          </div>
        </div>

        <!-- Terminal Component with Proper Props -->
        <XtermTerminal
          bind:this={terminalRef}
          wsUrl="{$connection.GetProxyURL()}/api/v1/exec/{terminalFormat}/true"
          shell={terminalShell}
          containerFormat={terminalFormat}
          initialCommand={terminalInitialCommand}
          reconnectInterval={3000}
          maxReconnectAttempts={5}
          autoReconnect={true}
          theme="dark"
          on:connected={handleTerminalConnected}
          on:disconnected={handleTerminalDisconnected}
          on:error={handleTerminalError}
        />
      </div>
    {/if}
  </div>
{/if}

<style>
    .dock {
        transition: top 0.5s ease-in-out;
        z-index: 1070;
    }

    .dock-full {
        border-bottom: 0.5px solid color-mix(in srgb, var(--color-base-content) 5%, #0000);
    }

    .fullscreen-overlay {
        position: fixed;
        top: 56px;
        left: 0;
        right: 0;
        bottom: 0;
        height: calc(100% - 56px);
        background-color: rgba(255, 255, 255, 1);
        display: block;
        z-index: 1090;
        overflow-y: auto;
    }

    .fixed {
        position: fixed;
        width: 100%;
        z-index: 1060;
    }

    .top-0 {
        top: 0;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
        .fullscreen-overlay {
            background-color: rgba(255, 255, 255, 1);
        }
    }

    /* Container card hover effects */
    .card {
        transition: all 0.2s ease;
    }

    .card:hover {
        transform: translateY(-2px);
        shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    /* Custom scrollbar for container list */
    .max-h-96 {
        scrollbar-width: thin;
        scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
    }

    .max-h-96::-webkit-scrollbar {
        width: 6px;
    }

    .max-h-96::-webkit-scrollbar-track {
        background: transparent;
    }

    .max-h-96::-webkit-scrollbar-thumb {
        background-color: rgba(155, 155, 155, 0.5);
        border-radius: 3px;
    }

    .max-h-96::-webkit-scrollbar-thumb:hover {
        background-color: rgba(155, 155, 155, 0.7);
    }
</style>