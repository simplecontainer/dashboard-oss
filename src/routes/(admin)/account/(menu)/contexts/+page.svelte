<script lang="ts">
  import {getContext, onMount} from "svelte"
  import {get, writable, type Writable} from "svelte/store"
  import {connections, connection, RemoveConnection} from "../stores/connections";
  import ClusterModule from "./context.module.svelte"
  import ToastModule from "../shared/toast.module.svelte";
  import { type Connection, fetchWithTimeout } from '../../types/context/connection';
  import ConfirmationModal from "../shared/confirm.svelte";
  import NoContexts from "../skeletons/nocontexts.module.svelte";
  import DockModule from "../dock/dock.module.svelte";
  import toastStore from '../../toasts';

  let clusterRef: ClusterModule
  let confirmRef: ConfirmationModal

  let confirm = writable(false)

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("contexts")

  let { data } = $props()
  let { clusters, proxyDomain, proxyApiDomain } = data

  let selectedConnection = writable<Connection | null>(null);

  const handleConfirm = async () => {
    const formData = new FormData();
    formData.append('id', $selectedConnection.Context.Name);

    document.getElementById('confirm-delete-context-modal').close()

    const res = await fetchWithTimeout('/account/api?/deleteCluster', {
      method: 'POST',
      body: formData,
    });

    const result = await res.json();

    if (res.ok) {
      if (result.status == 200) {
        toastStore.addToast({'message': "Context removed", "type": "success"})
        RemoveConnection($selectedConnection.Context.Name)
      } else {
        const data = JSON.parse(result.data)
        toastStore.addToast({'message': data[1], "type": "error"})
      }
    } else {
      toastStore.addToast({'message': "Failed to remove context. Try again.", "type": "error"})
    }
  }

  const handleCancel = () => {
    document.getElementById('confirm-delete-context-modal').close()
  };

  function ShowModal(c: Connection) {
    selectedConnection.set(c)
    document.getElementById('confirm-delete-context-modal').showModal()
    $confirm = true
  }

  let isMobile = writable(false)

  onMount(() => {
    isMobile.set(window.innerWidth < 1024);

    window.addEventListener('resize', () => {
      isMobile.set(window.innerWidth < 1024);
    });
  });
</script>

<svelte:head>
  <title>Contexts</title>
</svelte:head>

{#if !$isMobile}
<div class="navbar bg-base-100">
  <div class="flex-1">
    <a href="/account/contexts" class="btn btn-ghost text-xl">Contexts</a>
  </div>
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1">
      <ClusterModule bind:this={clusterRef}
                     clusters={clusters}
                     proxyApiDomain={proxyApiDomain}
                     proxyDomain={proxyDomain}
      ></ClusterModule>
    </ul>
  </div>
</div>
{:else}
<div class="navbar bg-base-100 md:max-w-none md:w-full">
  <div class="navbar-start">
    <a href="/account/contexts" class="btn btn-ghost text-xl">Contexts</a>
  </div>
  <div class="navbar-end">
    <ul class="menu menu-horizontal px-1">
      <ClusterModule bind:this={clusterRef}
                     clusters={clusters}
                     proxyApiDomain={proxyApiDomain}
                     proxyDomain={proxyDomain}
      ></ClusterModule>
    </ul>
  </div>
</div>
{/if}

{#if Array.from($connections.entries()).length == 0 }
  <div class="alert alert-success mt-5">It seems that you haven't added any contexts? <a href="https://docs.simplecontainer.io/installation/running-single" target="_blank" class="link">Try running simplecontainer node</a> and import the context.</div>
  <NoContexts></NoContexts>
{:else }
  <div class="container w-full max-w-none mt-5 pb-14">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-5">
      {#each $connections.entries() as [key, c]}
        <div class="card bg-base-100 w-full shadow-xl">
          <div class="card-body">
            <h2 class="card-title">
              <button class="btn btn-square btn-ghost" onclick={() => clusterRef.ShowModal(c)}>
                <svg class="size-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.859 16.4999L12.3975 14.0385L11.6459 14.7902C10.8764 15.5597 10.4916 15.9444 10.0781 15.8536C9.66452 15.7628 9.47641 15.2522 9.10019 14.231L7.84544 10.8253C7.09492 8.78816 6.71966 7.7696 7.24463 7.24463C7.7696 6.71966 8.78816 7.09492 10.8253 7.84544L14.231 9.10019C15.2522 9.47641 15.7628 9.66451 15.8536 10.0781C15.9444 10.4916 15.5597 10.8764 14.7902 11.6459L14.0385 12.3975L16.4999 14.859C16.7548 15.1138 16.8822 15.2413 16.9411 15.3834C17.0196 15.573 17.0196 15.7859 16.9411 15.9755C16.8822 16.1176 16.7548 16.2451 16.4999 16.4999C16.2451 16.7548 16.1176 16.8822 15.9755 16.9411C15.7859 17.0196 15.573 17.0196 15.3834 16.9411C15.2413 16.8822 15.1138 16.7548 14.859 16.4999Z" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" stroke="#1C274C" stroke-width="1.5"/>
                </svg>
              </button>
              {c.Context.Name}
            </h2>
            <div class="h-4/6">
              {#if c.State.Offline}
                <div class="badge badge-neutral">Offline</div>
              {/if}
              {#if c.State.WSS}
                <div class="badge badge-success">Connected</div>
              {/if}
              {#if $connection !== undefined && $connection.Context !== undefined && $connection.Context.Name === c.Context.Name}
                <div class="badge badge-success">Active</div>
              {/if}
              <div>
                <ul class="list bg-base-100 rounded-box shadow-md mt-2">

                  <li class="p-4 pb-2 text-xs opacity-60 tracking-wide">Context</li>

                  <li class="list-row">
                    <div>
                      <svg class="size-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="9" r="3" stroke="#1C274C" stroke-width="1.5" />
                        <circle cx="12" cy="12" r="10" stroke="#1C274C" stroke-width="1.5" />
                        <path d="M17.9691 20C17.81 17.1085 16.9247 15 11.9999 15C7.07521 15 6.18991 17.1085 6.03076 20"
                              stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" />
                      </svg>
                    </div>
                    <div class="w-full">
                      <div>{c.Context.API }</div>
                        <div class="text-xs uppercase font-semibold opacity-60">CONTROL PLANE URL</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            <div class="card-actions justify-end">
              {#if c.State.Offline}
                <span class="text-neutral">Offline node</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<DockModule></DockModule>
<ToastModule></ToastModule>