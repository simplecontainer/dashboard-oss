<script lang="ts">
  import {getContext, onMount, onDestroy} from "svelte"
  import { writable, type Writable } from "svelte/store"
  import {connection} from "../stores/connections";
  import ClusterModule from "../contexts/context.module.svelte"
  import EmptyModule from "../skeletons/empty.module.svelte"
  import LoadingModule from "../skeletons/loading.module.svelte"
  import NoCtxModule from "../skeletons/noctx.module.svelte"
  import toastStore from '../../toasts';
  import {httpauthsMap, AddHttpAuth} from "../stores/httpauths";
  import ToastModule from "../shared/toast.module.svelte";
  import DockModule from "../dock/dock.module.svelte";
  import type {Connection} from "../../types/context/connection";
  import {isEmptyObject} from "../../helpers/objects";
  import {Preview} from "../shared/preview";

  let openModal = writable(false);

  let toasts = [];
  toastStore.subscribe((value) => {
    toasts = value;
  });

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("httpauths")

  let { data } = $props()
  let { clusters, proxyApiDomain, proxyDomain } = data

  let checkedItems = writable<Record<string, boolean>>({});

  let once = false

  const unsubscribe = connection.subscribe(async (c:Connection) => {
    if (isEmptyObject(c)) {
      return
    }

    if (c.GetProxyURL() !== "" && !once) {
      once = true

      const resp = await fetch(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/kind/httpauth`, {
        method: 'GET',
        headers: {
        Upstream: btoa(c.Context.API).replace(/=+$/,''),
      },
      });

      const httpauths = (await resp.json()).Data

      for (let httpauth of httpauths) {
        AddHttpAuth(httpauth);
      }
    }
  });

  onMount(async () => {});

  onDestroy(() => {
    unsubscribe()
    once = false
  })

  let openItem = writable<string | null>(null);
</script>

<svelte:head>
  <title>HttpAuths</title>
</svelte:head>

<style>
  .code-container {
    @apply whitespace-normal break-words overflow-hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3; /* Limit to 3 lines */
    -webkit-box-orient: vertical;
  }
</style>


<div class="navbar bg-base-100">
  <div class="flex-1">
    <a href="/account/resources" class="btn btn-ghost text-xl">HttpAuths</a>
  </div>
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1">
      <ClusterModule clusters={clusters}
                     proxyApiDomain={proxyApiDomain}
                     proxyDomain={proxyDomain}
      ></ClusterModule>
    </ul>
  </div>
</div>

<div class="pb-14">
{#if isEmptyObject($connection) }
  <NoCtxModule></NoCtxModule>
{:else if !$connection.IsConnected()}
  <LoadingModule></LoadingModule>
{:else}
  <div class="overflow-x-auto">
  {#if Object.entries($httpauthsMap).length == 0}
    <EmptyModule></EmptyModule>
  {:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-5">
  {#each Object.entries($httpauthsMap) as [key, resource]}
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body">
      <h2 class="card-title">
        {resource.meta.group}/{resource.meta.name}
      </h2>
      <div class="overflow-x-auto">
        <table class="table">
          <tbody>
          <tr>
            <th>Group</th>
            <td>{resource.meta.group}</td>
          </tr>
          <tr>
            <th>Name</th>
            <td>{resource.meta.name}</td>
          </tr>
          </tbody>
        </table>
      </div>
      <ul class="list bg-base-100 rounded-box shadow-md">
        <li class="p-4 pb-2 text-xs opacity-60 tracking-wide">CONTENT</li>
        {#each Object.entries(resource.spec.data) as [key,value]}
          <li class="list-row">
            <div>
              <svg class="size-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H13C16.7712 2 18.6569 2 19.8284 3.17157C21 4.34315 21 6.22876 21 10V14C21 17.7712 21 19.6569 19.8284 20.8284C18.6569 22 16.7712 22 13 22H11C7.22876 22 5.34315 22 4.17157 20.8284C3 19.6569 3 17.7712 3 14V10Z" stroke="#1C274C" stroke-width="1.5"/>
                <path d="M8 12H16" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M8 8H16" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M8 16H13" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <div>{key}</div>
              <div class="text-xs uppercase font-semibold opacity-60">Resource</div>
            </div>
            <pre class="list-col-wrap text-xs code-container"><code>{value}</code></pre>
            <button class="btn btn-square btn-ghost" on:click={(e) => Preview(e, `${key}`)}>
              <svg class="size-[1.2em]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="16" r="4" stroke="#1C274C" stroke-width="1.5"/>
                <circle cx="6" cy="16" r="4" stroke="#1C274C" stroke-width="1.5"/>
                <path d="M14 16.2137L13.3441 15.9797C12.4749 15.6695 11.5252 15.6695 10.6559 15.9797L10 16.2137" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M2 16L2.76315 7.60532C2.87807 6.34121 2.93553 5.70916 3.30554 5.24199C3.67554 4.77482 4.27763 4.57412 5.48181 4.17273L6 4" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M22 16L21.2368 7.60532C21.1219 6.34121 21.0645 5.70916 20.6945 5.24199C20.3245 4.77482 19.7224 4.57412 18.5182 4.17273L18 4" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </li>
        {/each}
      </ul>
    </div>
  </div>
  {/each}
  </div>
  {/if}
</div>
{/if}
</div>

<DockModule></DockModule>

<ToastModule></ToastModule>