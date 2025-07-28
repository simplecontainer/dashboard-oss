<script lang="ts">
  import { onMount } from 'svelte';

  export let state: string;
  export let time: string = '';
  export let maxHistory: number = 3;
  export let transitionDuration: number = 3000; // ms to show each state

  interface StateEntry {
    id: string;
    state: string;
    time: string;
    timestamp: number;
  }

  let stateHistory: StateEntry[] = [];
  let currentStateId = 0;

  function getStatusInfo(state: string) {
    switch (state) {
      case 'initial':
        return {
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          dotColor: 'bg-gray-400',
          label: 'Initial',
        };
      case 'transfering':
        return {
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          dotColor: 'bg-blue-500',
          label: 'Transferring',
        };
      case 'dependency_updated':
        return {
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-700',
          dotColor: 'bg-purple-500',
          label: 'Dependency Updated',
        };
      case 'created':
        return {
          bgColor: 'bg-indigo-50',
          textColor: 'text-indigo-700',
          dotColor: 'bg-indigo-500',
          label: 'Created',
        };
      case 'clean':
        return {
          bgColor: 'bg-teal-50',
          textColor: 'text-teal-700',
          dotColor: 'bg-teal-500',
          label: 'Clean',
        };
      case 'prepare':
        return {
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          dotColor: 'bg-blue-500',
          label: 'Preparing',
        };
      case 'init':
        return {
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          dotColor: 'bg-blue-500',
          label: 'Initializing',
        };
      case 'init_failed':
        return {
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          dotColor: 'bg-red-500',
          label: 'Init Failed',
        };
      case 'depends_checking':
        return {
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
          dotColor: 'bg-orange-500',
          label: 'Checking Dependencies',
        };
      case 'depends_solved':
        return {
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          dotColor: 'bg-green-500',
          label: 'Dependencies Solved',
        };
      case 'readiness_check':
        return {
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          dotColor: 'bg-yellow-500',
          label: 'Readiness Check',
        };
      case 'readiness_ready':
        return {
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          dotColor: 'bg-emerald-500',
          label: 'Ready',
        };
      case 'running':
        return {
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          dotColor: 'bg-green-500',
          label: 'Running',
        };
      case 'dead':
        return {
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          dotColor: 'bg-gray-500',
          label: 'Dead',
        };
      case 'backoff':
        return {
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          dotColor: 'bg-yellow-500',
          label: 'Backoff',
        };
      case 'daemon_failure':
        return {
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          dotColor: 'bg-red-500',
          label: 'Daemon Failure',
        };
      case 'restart':
        return {
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          dotColor: 'bg-amber-500',
          label: 'Restarting',
        };
      // Legacy states for backward compatibility
      case 'stopped':
        return {
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          dotColor: 'bg-red-500',
          label: 'Stopped',
        };
      case 'paused':
        return {
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          dotColor: 'bg-yellow-500',
          label: 'Paused',
        };
      case 'pending':
        return {
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          dotColor: 'bg-blue-500',
          label: 'Pending',
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          dotColor: 'bg-red-500',
          label: 'Error',
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          dotColor: 'bg-gray-400',
          label: state,
        };
    }
  }

  function addStateToHistory(newState: string, newTime: string) {
    // Don't add if it's the same state as the most recent one
    if (stateHistory.length > 0 && stateHistory[0].state === newState) {
      // Update the time of the current state instead
      stateHistory[0].time = newTime;
      stateHistory = [...stateHistory]; // Trigger reactivity
      return;
    }

    const newEntry: StateEntry = {
      id: `state-${currentStateId++}`,
      state: newState,
      time: newTime,
      timestamp: Date.now()
    };

    // Add new state to the beginning
    stateHistory = [newEntry, ...stateHistory.slice(0, maxHistory - 1)];

    // Auto-remove old states after transition duration (but keep at least the latest one)
    setTimeout(() => {
      stateHistory = stateHistory.filter((entry, index) =>
        entry.id !== newEntry.id || index === 0
      );
    }, transitionDuration);
  }

  // Watch for state changes
  $: if (state && time) {
    // Only add if it's different from the current first state or if no history exists
    if (stateHistory.length === 0 || stateHistory[0].state !== state) {
      addStateToHistory(state, time);
    } else if (stateHistory.length > 0 && stateHistory[0].state === state) {
      // Just update the time if same state
      stateHistory[0].time = time;
      stateHistory = [...stateHistory]; // Trigger reactivity
    }
  }

  onMount(() => {
    // Add initial state
    if (state) {
      addStateToHistory(state, time);
    }
  });
</script>

<div class="flex flex-col gap-1">
  {#if stateHistory.length === 0}
    {@const statusInfo = getStatusInfo(state)}
    <div class="inline-flex flex-col items-start gap-1 px-3 py-1.5 rounded-full {statusInfo.bgColor} border border-gray-300 border-opacity-20 {statusInfo.textColor.replace('text-', 'border-')} transition-all duration-500 ease-in-out">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full {statusInfo.dotColor} {(state === 'running' || state === 'pending') ? 'animate-pulse' : ''}"></div>
        <span class="text-xs font-medium {statusInfo.textColor}">{statusInfo.label}</span>
      </div>
      {#if time}
        <div class="text-xs {statusInfo.textColor} opacity-75 ml-4 truncate">{time}</div>
      {/if}
    </div>
  {:else}
    {#each stateHistory as entry, index (entry.id)}
      {@const statusInfo = getStatusInfo(entry.state)}
      {@const isLatest = index === 0}
      {@const age = Date.now() - entry.timestamp}
      {@const opacity = isLatest ? 1 : Math.max(0.3, 1 - (age / transitionDuration))}

      <div class="flex flex-col gap-1">
        <div
          class="inline-flex items-center justify-between gap-3 px-3 py-1.5 rounded-full border text-sm font-medium shadow-sm
          {statusInfo.bgColor} {statusInfo.textColor} border-gray-200 transition-all duration-500 ease-in-out"
          style="opacity: {opacity}; transform: translateY({index * 2}px) scale({isLatest ? 1 : 0.97})"
        >
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full {statusInfo.dotColor} {(entry.state === 'running' || entry.state === 'pending') && isLatest ? 'animate-pulse' : ''}"></div>
            <span>{statusInfo.label}</span>
            {#if !isLatest}
              <span class="text-xs opacity-50">↓</span>
            {/if}
          </div>
          {#if entry.time}
            <div class="text-xs opacity-60 truncate">{entry.time}</div>
          {/if}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
    .truncate {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>