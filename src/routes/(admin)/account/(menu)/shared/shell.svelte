<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import toastStore from '../../toasts';
  import { connection } from '../stores/connections';
  import {
    activeDockItem,
    showFullScreenDiv,
    activeContent,
    editorContent,
    editorFile,
    editorPreview
  } from '../stores/dock';

  // Enhanced props with proper types and defaults
  export let wsUrl: string = 'ws://localhost:3001/terminal';
  export let shell: string = '/bin/bash'; // Renamed from 'command' for clarity
  export let containerFormat: string = ''; // New prop for container format
  export let initialCommand: string = ''; // Command to run on connection
  export let reconnectInterval: number = 5000;
  export let maxReconnectAttempts: number = 3;
  export let autoReconnect: boolean = true;
  export let theme: 'dark' | 'light' = 'dark';

  // Event dispatcher for parent communication
  const dispatch = createEventDispatcher<{
    connected: void;
    disconnected: { code: number; reason?: string };
    error: { message: string; error?: any };
    data: { data: string };
    resize: { cols: number; rows: number };
  }>();

  // Component state
  let terminalContainer: HTMLDivElement;
  let terminal: any;
  let fitAddon: any;
  let searchAddon: any;
  let websocket: WebSocket | null = null;
  let isConnected = false;
  let isConnecting = false;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let connectionId = '';

  // Dynamic imports
  let Terminal: any;
  let FitAddon: any;
  let WebLinksAddon: any;
  let SearchAddon: any;

  // Terminal themes
  const THEMES = {
    dark: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
      selection: '#264f78',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff'
    },
    light: {
      background: '#ffffff',
      foreground: '#333333',
      cursor: '#000000',
      selection: '#add6ff',
      black: '#000000',
      red: '#cd3131',
      green: '#00bc00',
      yellow: '#949800',
      blue: '#0451a5',
      magenta: '#bc05bc',
      cyan: '#0598bc',
      white: '#555555',
      brightBlack: '#666666',
      brightRed: '#cd3131',
      brightGreen: '#14ce14',
      brightYellow: '#b5ba00',
      brightBlue: '#0451a5',
      brightMagenta: '#bc05bc',
      brightCyan: '#0598bc',
      brightWhite: '#a5a5a5'
    }
  };

  const TERMINAL_CONFIG = {
    cursorBlink: true,
    cursorStyle: 'block' as const,
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
    lineHeight: 1.2,
    rows: 30,
    cols: 80,
    theme: THEMES[theme],
    allowTransparency: false,
    convertEol: true,
    scrollback: 5000,
    fastScrollModifier: 'alt',
    macOptionIsMeta: true,
    rightClickSelectsWord: true
  };

  // Lifecycle management
  onMount(async () => {
    try {
      await loadXtermAddons();
      initializeTerminal();
      await connectWebSocket();
      window.addEventListener('resize', handleResize);
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      dispatch('error', { message: 'Failed to initialize terminal', error });
    }
  });

  onDestroy(() => {
    cleanup();
    window.removeEventListener('resize', handleResize);
  });

  // Dynamic imports with error handling
  async function loadXtermAddons() {
    try {
      const xtermModule = await import('xterm');
      Terminal = xtermModule.Terminal;

      const fitModule = await import('xterm-addon-fit');
      FitAddon = fitModule.FitAddon;

      const webLinksModule = await import('xterm-addon-web-links');
      WebLinksAddon = webLinksModule.WebLinksAddon;

      const searchModule = await import('xterm-addon-search');
      SearchAddon = searchModule.SearchAddon;

      await import('xterm/css/xterm.css');
    } catch (error) {
      throw new Error(`Failed to load terminal addons: ${error}`);
    }
  }

  // Terminal initialization
  function initializeTerminal() {
    terminal = new Terminal(TERMINAL_CONFIG);
    fitAddon = new FitAddon();
    searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.loadAddon(searchAddon);

    terminal.open(terminalContainer);

    // Fit terminal after DOM is ready
    setTimeout(() => {
      fitAddon.fit();
      terminal.focus();
    }, 100);

    // Terminal event handlers
    terminal.onData(handleTerminalData);
    terminal.onResize(handleTerminalResize);
    terminal.onBinary(handleTerminalBinary);

    // Show initial message
    terminal.writeln('\x1b[33m⚡ Initializing terminal connection...\x1b[0m');
  }

  function handleResize() {
    if (fitAddon && terminal) {
      try {
        fitAddon.fit();
      } catch (error) {
        console.warn('Error fitting terminal:', error);
      }
    }
  }

  function handleTerminalData(data: string) {
    sendData(data);
    dispatch('data', { data });
  }

  function handleTerminalResize({ cols, rows }: { cols: number; rows: number }) {
    sendResize(cols, rows);
    dispatch('resize', { cols, rows });
  }

  function handleTerminalBinary(data: string) {
    if (isConnected && websocket?.readyState === WebSocket.OPEN) {
      websocket.send(new TextEncoder().encode(data));
    }
  }

  // WebSocket connection management
  async function connectWebSocket(): Promise<void> {
    if (isConnecting || isConnected) return;

    isConnecting = true;
    connectionId = generateConnectionId();

    try {
      const wsAddress = normalizeWebSocketUrl(wsUrl);
      const url = buildWebSocketUrl(wsAddress);

      websocket = new WebSocket(url.toString(), ["Upstream", btoa($connection.Context.API).replace(/=+$/,'')]);

      websocket.binaryType = 'arraybuffer';
      setupWebSocketHandlers();

    } catch (error) {
      isConnecting = false;
      console.error('Failed to initialize WebSocket:', error);
      terminal?.writeln('\x1b[31m✗ Failed to establish connection\x1b[0m');
      dispatch('error', { message: 'Failed to connect to terminal', error });
    }
  }

  function normalizeWebSocketUrl(url: string): string {
    if (url.startsWith('http://')) return url.replace('http://', 'ws://');
    if (url.startsWith('https://')) return url.replace('https://', 'wss://');
    return url;
  }

  function buildWebSocketUrl(wsAddress: string): URL {
    const url = new URL(wsAddress);

    // Set query parameters
    url.searchParams.set('command', shell);
    url.searchParams.set('width', String(terminal?.cols ?? 80));
    url.searchParams.set('height', String(terminal?.rows ?? 24));

    if (containerFormat) {
      url.searchParams.set('format', containerFormat);
    }

    if (initialCommand) {
      url.searchParams.set('command', initialCommand);
    }

    return url;
  }

  function generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function setupWebSocketHandlers() {
    if (!websocket) return;

    websocket.onopen = handleWebSocketOpen;
    websocket.onmessage = handleWebSocketMessage;
    websocket.onclose = handleWebSocketClose;
    websocket.onerror = handleWebSocketError;
  }

  function handleWebSocketOpen() {
    isConnected = true;
    isConnecting = false;
    reconnectAttempts = 0;

    terminal?.clear();
    terminal?.writeln('\x1b[32m✓ Terminal connection established\x1b[0m');

    if (initialCommand) {
      setTimeout(() => sendCommand(initialCommand), 500);
    }

    dispatch('connected');
  }

  function handleWebSocketMessage(event: MessageEvent) {
    try {
      if (event.data instanceof ArrayBuffer) {
        const buffer = new Uint8Array(event.data);
        const messages = parseDockerStdcopy(buffer);

        messages.forEach(({ stream, data }) => {
          const text = new TextDecoder().decode(data);

          // Apply different styling based on stream type
          if (stream === 'stderr') {
            // Write stderr in red color
            terminal?.write(`\x1b[31m${text}\x1b[0m`);
          } else {
            // Write stdout normally
            terminal?.write(text);
          }
        });
      } else if (typeof event.data === 'string') {
        // Fallback for string messages
        console.log(event.data);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      // Fallback: write raw data if parsing fails
      if (event.data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(event.data);
        terminal?.write(text);
      } else if (typeof event.data === 'string') {
        terminal?.write(event.data);
      }
    }
  }

  function parseDockerStdcopy(buffer: Uint8Array): Array<{ stream: 'stdout' | 'stderr'; data: Uint8Array }> {
    const messages: Array<{ stream: 'stdout' | 'stderr'; data: Uint8Array }> = [];
    let offset = 0;

    while (offset < buffer.length) {
      // Docker stdcopy format:
      // [stream_type][0x00][0x00][0x00][size_byte_1][size_byte_2][size_byte_3][size_byte_4][data...]

      if (offset + 8 > buffer.length) {
        // Not enough data for header
        break;
      }

      // Read header (8 bytes)
      const streamType = buffer[offset];
      const padding = buffer.subarray(offset + 1, offset + 4); // Should be [0x00, 0x00, 0x00]
      const size = (buffer[offset + 4] << 24) |
        (buffer[offset + 5] << 16) |
        (buffer[offset + 6] << 8) |
        buffer[offset + 7];

      offset += 8;

      // Validate header
      if (size < 0 || offset + size > buffer.length) {
        console.warn('Invalid Docker stdcopy frame size:', size);
        break;
      }

      // Extract data
      const data = buffer.subarray(offset, offset + size);
      offset += size;

      // Map stream type
      let stream: 'stdout' | 'stderr';
      switch (streamType) {
        case 0x01: // STDIN (not typically used in exec output)
        case 0x00: // STDOUT fallback
          stream = 'stdout';
          break;
        case 0x02: // STDERR
          stream = 'stderr';
          break;
        default:
          console.warn('Unknown Docker stream type:', streamType);
          stream = 'stdout';
          break;
      }

      messages.push({ stream, data });
    }

    return messages;
  }

  function handleWebSocketClose(event: CloseEvent) {
    isConnected = false;
    isConnecting = false;

    const reason = getCloseReason(event.code);
    terminal?.writeln(`\r\n\x1b[31m✗ Connection closed: ${reason} (${event.code})\x1b[0m`);

    dispatch('disconnected', { code: event.code, reason });

    // Handle reconnection
    if (autoReconnect && shouldAttemptReconnect(event.code)) {
      scheduleReconnect();
    }
  }

  function handleWebSocketError(event: Event) {
    console.error('WebSocket error:', event);
    if (!isConnected) {
      terminal?.writeln('\x1b[31m✗ Connection failed\x1b[0m');
    }
    dispatch('error', { message: 'WebSocket connection error', error: event });
  }

  function getCloseReason(code: number): string {
    const reasons: Record<number, string> = {
      1000: 'Normal closure',
      1001: 'Going away',
      1002: 'Protocol error',
      1003: 'Unsupported data',
      1006: 'Abnormal closure',
      1007: 'Invalid frame payload data',
      1008: 'Policy violation',
      1009: 'Message too big',
      1010: 'Mandatory extension',
      1011: 'Internal server error',
      1015: 'TLS handshake failure'
    };
    return reasons[code] || 'Unknown error';
  }

  function shouldAttemptReconnect(code: number): boolean {
    // Don't reconnect on normal closure or certain error codes
    const noReconnectCodes = [1000, 1001, 1008, 1011];
    return !noReconnectCodes.includes(code) && reconnectAttempts < maxReconnectAttempts;
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);

    reconnectAttempts++;
    const delay = Math.min(reconnectInterval * Math.pow(1.5, reconnectAttempts - 1), 30000);

    terminal?.writeln(`\x1b[33m⟳ Reconnecting in ${delay/1000}s... (attempt ${reconnectAttempts}/${maxReconnectAttempts})\x1b[0m`);

    reconnectTimer = setTimeout(() => {
      cleanupWebSocket();
      connectWebSocket();
    }, delay);
  }

  // Data transmission
  function sendData(data: string) {
    if (isConnected && websocket?.readyState === WebSocket.OPEN) {
      websocket.send(new TextEncoder().encode(data));
    }
  }

  function sendResize(cols: number, rows: number) {
    if (isConnected && websocket?.readyState === WebSocket.OPEN) {
      const resizeCmd = JSON.stringify({
        type: 1,
        data: { "width": cols, "height": rows }
      });
      websocket.send(resizeCmd);
    }
  }

  // Public methods
  export function sendCommand(command: string) {
    sendData(command + '\n');
  }

  export function clear() {
    terminal?.clear();
  }

  export function focus() {
    terminal?.focus();
  }

  export function search(term: string) {
    searchAddon?.findNext(term);
  }

  export function reconnect() {
    cleanup();
    reconnectAttempts = 0;
    connectWebSocket();
  }

  // Cleanup
  function cleanupWebSocket() {
    if (websocket) {
      websocket.onopen = null;
      websocket.onmessage = null;
      websocket.onclose = null;
      websocket.onerror = null;

      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close(1000, 'Component cleanup');
      }
      websocket = null;
    }
  }

  function cleanup() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    cleanupWebSocket();

    if (terminal) {
      terminal.dispose();
      terminal = null;
    }

    isConnected = false;
    isConnecting = false;
  }

  function exit() {
    cleanup();
    showFullScreenDiv.set(false);
    activeDockItem.set(null);
  }

  // Reactive updates
  $: if (terminal && theme) {
    terminal.options.theme = THEMES[theme];
  }
</script>

<div class="terminal-wrapper">
  <!-- Terminal Header -->
  <div class="terminal-header">
    <div class="connection-info">
      <div class="connection-status">
        <span
          class="status-indicator"
          class:connected={isConnected}
          class:connecting={isConnecting}
        ></span>
        <span class="status-text">
          {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {#if containerFormat}
        <div class="container-info">
          <span class="container-format">{containerFormat}</span>
        </div>
      {/if}
    </div>

    <div class="terminal-controls">
      <button
        on:click={reconnect}
        disabled={isConnecting || isConnected}
        class="control-btn"
        title="Reconnect"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      <button
        on:click={clear}
        class="control-btn"
        title="Clear terminal"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      <button
        on:click={exit}
        class="control-btn exit-btn"
        title="Exit terminal"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Terminal Container -->
  <div bind:this={terminalContainer} class="terminal-container"></div>
</div>

<style>
    .terminal-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 400px;
        border: 1px solid #333;
        border-radius: 8px;
        overflow: hidden;
        background: #1e1e1e;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .terminal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #2d2d2d;
        border-bottom: 1px solid #333;
    }

    .connection-info {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .connection-status {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .status-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #cd3131;
        transition: all 0.3s ease;
        position: relative;
    }

    .status-indicator.connecting {
        background: #e5e510;
        animation: pulse 1.5s ease-in-out infinite;
    }

    .status-indicator.connected {
        background: #0dbc79;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.5;
            transform: scale(1.1);
        }
    }

    .status-text {
        color: #d4d4d4;
        font-size: 13px;
        font-family: 'Consolas', monospace;
        font-weight: 500;
    }

    .container-info {
        display: flex;
        align-items: center;
    }

    .container-format {
        color: #569cd6;
        font-size: 11px;
        font-family: 'Consolas', monospace;
        background: rgba(86, 156, 214, 0.1);
        padding: 2px 6px;
        border-radius: 3px;
        border: 1px solid rgba(86, 156, 214, 0.3);
    }

    .terminal-controls {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .control-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        font-size: 11px;
        border: 1px solid #555;
        background: #3c3c3c;
        color: #d4d4d4;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 32px;
        height: 32px;
    }

    .control-btn:hover:not(:disabled) {
        background: #4a4a4a;
        border-color: #666;
    }

    .control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .exit-btn:hover:not(:disabled) {
        background: #cd3131;
        border-color: #cd3131;
    }

    .terminal-container {
        flex: 1;
        padding: 12px;
        overflow: hidden;
        background: #1e1e1e;
    }

    :global(.terminal-wrapper .xterm) {
        height: 100% !important;
    }

    :global(.terminal-wrapper .xterm-viewport) {
        overflow-y: auto !important;
    }

    :global(.terminal-wrapper .xterm-screen) {
        padding-bottom: 10px;
    }
</style>