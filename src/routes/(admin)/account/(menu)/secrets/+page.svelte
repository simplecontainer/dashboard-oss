<script lang="ts">
  import { getContext, onDestroy } from 'svelte';
  import { writable, type Writable } from 'svelte/store';
  import { connection } from '../stores/connections';
  import ClusterModule from '../contexts/context.module.svelte';
  import EmptyModule from '../skeletons/empty.module.svelte';
  import LoadingModule from '../skeletons/loading.module.svelte';
  import NoCtxModule from '../skeletons/noctx.module.svelte';
  import { AddSecret, secretsMap } from '../stores/secrets';
  import ToastModule from '../shared/toast.module.svelte';
  import DockModule from '../dock/dock.module.svelte';
  import { type Connection, fetchWithTimeout } from '../../types/context/connection';
  import { isEmptyObject } from '../../helpers/objects';
  import { activeDockItem, editorContent, showFullScreenDiv } from '../stores/dock';
  import { Edit, Preview } from '../shared/preview';

  let checkedItems = writable<Record<string, boolean>>({});
  let openItem = writable<string | null>(null);
  let adminSection: Writable<string> = getContext('adminSection');
  adminSection.set('secrets');

  function toggleItem(id: string) {
    openItem.update(current => (current === id ? null : id));

    checkedItems.update(items => {
      if (items[id]) {
        return { [id]: false };
      }

      return { [id]: true };
    });
  }

  let { data } = $props();
  let { clusters, proxyApiDomain, proxyDomain } = data;
  let once = false;

  const unsubscribe = connection.subscribe(async (c: Connection) => {
    if (isEmptyObject(c)) return;

    if (c.GetProxyURL() !== '' && !once) {
      once = true;
      const resp = await fetchWithTimeout(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/kind/secret`, {
        method: 'GET',
        headers: { Upstream: btoa(c.Context.API).replace(/=+$/, '') }
      });
      const secrets = (await resp.json()).Data;
      for (let secret of secrets) AddSecret(secret);
    }
  });

  onDestroy(() => {
    unsubscribe();
    once = false;
  });

  function Code(event) {
    const parent = event.currentTarget.parentElement;
    const codeEl = parent.querySelector('pre > code');
    if (codeEl) {
      editorContent.set(codeEl.textContent.trim());
      showFullScreenDiv.set(true);
      activeDockItem.set('Editor');
    }
  }

  function toggleRow(secretKey) {
    openItem.update(current => current === secretKey ? null : secretKey);
  }

  function renderDataKeys(keys) {
    const maxVisible = 3;
    const maxLength = 20;
    if (keys.length <= maxVisible) {
      return {
        visible: keys.map(key => key.length > maxLength ? key.slice(0, maxLength) + '...' : key),
        hidden: [],
        hasMore: false
      };
    }
    return {
      visible: keys.slice(0, maxVisible).map(key => key.length > maxLength ? key.slice(0, maxLength) + '...' : key),
      hidden: keys.slice(maxVisible),
      hasMore: true
    };
  }

  let searchTerm = "";
</script>

<svelte:head><title>Secrets</title></svelte:head>

<div class="navbar bg-base-100">
  <div class="flex-1">
    <a href="/account/secrets" class="btn btn-ghost border-0 text-xl">Secrets</a>
  </div>
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1">
      <ClusterModule {clusters} {proxyApiDomain} {proxyDomain} />
    </ul>
  </div>
</div>

<div class="pb-14">
  {#if isEmptyObject($connection)}
    <NoCtxModule />
  {:else if !$connection.IsConnected()}
    <LoadingModule />
  {:else}
    {#if Object.entries($secretsMap).length === 0}
      <EmptyModule />
    {:else}
      <div class="w-full mt-5 p-10 bg-base-100 flex flex-col justify-center rounded-lg shadow-md">
        <div class="overflow-hidden w-full">
          <table class="min-w-full text-sm">
            <thead>
            <tr class="border-b border-gray-200">
              <th class="px-3 py-2 text-left text-gray-500">Name</th>
              <th class="px-3 py-2 text-left text-gray-500">Group</th>
              <th class="px-3 py-2 text-left text-gray-500">Data Keys</th>
              <th class="px-3 py-2 text-left text-gray-500">Actions</th>
            </tr>
            </thead>
            <tbody>
            {#each Object.entries($secretsMap).filter(([key, resource]) => {
              const query = searchTerm.toLowerCase();
              return (
                resource.meta.name.toLowerCase().includes(query) ||
                resource.meta.group.toLowerCase().includes(query) ||
                Object.keys(resource.spec.data).some(k => k.toLowerCase().includes(query))
              );
            }) as [key, resource]}
              {@const dataKeys = Object.keys(resource.spec.data)}
              {@const keyData = renderDataKeys(dataKeys)}

              <tr class="hover:bg-gray-60 cursor-pointer">
                <td class="px-3 py-2 font-medium text-gray-900 truncate">{resource.meta.name}</td>
                <td class="px-3 py-2 text-gray-700 truncate">{resource.meta.group}</td>
                <td class="px-3 py-2">
                  <div class="flex flex-wrap gap-1 max-w-[280px]">
                    {#each keyData.visible as dataKey}
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-blue-800 border border-blue-200 max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap hover:border-blue-300" title={dataKeys.find(k => k.startsWith(dataKey.replace('...', '')))}>
                          {dataKey}
                        </span>
                    {/each}
                    {#if keyData.hasMore}
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-gray-600 border border-gray-300 cursor-help" title={keyData.hidden.join(', ')}>
                          +{keyData.hidden.length} more
                        </span>
                    {/if}
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    {dataKeys.length} key{dataKeys.length !== 1 ? 's' : ''}
                  </div>
                </td>
                <td class="px-3 py-2">
                  <div class="flex items-center space-x-2">
                    <label class="btn btn-circle" on:click={(e) => Edit(e, `${resource.kind}/${resource.meta.group}/${resource.meta.name}`, resource)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.3601 4.07866L15.2869 3.15178C16.8226 1.61607 19.3125 1.61607 20.8482 3.15178C22.3839 4.68748 22.3839 7.17735 20.8482 8.71306L19.9213 9.63993M14.3601 4.07866C14.3601 4.07866 14.4759 6.04828 16.2138 7.78618C17.9517 9.52407 19.9213 9.63993 19.9213 9.63993M14.3601 4.07866L5.83882 12.5999C5.26166 13.1771 4.97308 13.4656 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.32181 19.8021M19.9213 9.63993L11.4001 18.1612C10.8229 18.7383 10.5344 19.0269 10.2162 19.2751C9.84082 19.5679 9.43469 19.8189 9.00498 20.0237C8.6407 20.1973 8.25352 20.3263 7.47918 20.5844L4.19792 21.6782M4.19792 21.6782L3.39584 21.9456C3.01478 22.0726 2.59466 21.9734 2.31063 21.6894C2.0266 21.4053 1.92743 20.9852 2.05445 20.6042L2.32181 19.8021M4.19792 21.6782L2.32181 19.8021" stroke="#1C274C" stroke-width="1.5"/>
                      </svg>
                    </label>

                    <label
                      id="label-swap-{key}"
                      class="btn btn-circle swap swap-rotate">
                      <input
                        id="{key}-swap"
                        on:change={() => toggleItem(key)}
                        bind:checked={$checkedItems[key]}
                        type="checkbox"
                      />

                      <!-- hamburger icon -->
                      <svg
                        class="swap-off fill-current"
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 512 512">
                        <path d="M64,384H448V341.33H64Zm0-106.67H448V234.67H64ZM64,128v42.67H448V128Z" />
                      </svg>

                      <!-- close icon -->
                      <svg
                        class="swap-on fill-current"
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 512 512">
                        <polygon
                          points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49" />
                      </svg>
                    </label>
                  </div>
                </td>
<!--                <td class="px-3 py-2">-->
<!--                  {#if $openItem === key}-->
<!--                    <svg class="w-4 h-4 rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />-->
<!--                    </svg>-->
<!--                  {:else}-->
<!--                    <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />-->
<!--                    </svg>-->
<!--                  {/if}-->
<!--                </td>-->
              </tr>

              {#if $openItem === key}
                <tr>
                  <td colspan="5" class="px-3 py-4">
                    <h4 class="text-sm font-semibold text-gray-600 mb-3">Secret Data</h4>
                    <div class="grid gap-3">
                      {#each Object.entries(resource.spec.data) as [dataKey, value]}
                        <div class="border border-gray-300 rounded-lg p-4">
                          <div class="flex justify-between items-center mb-2">
                            <span class="font-medium text-gray-700 break-all">{dataKey}</span>
                            <!--<button class="btn btn-xs btn-ghost" on:click={Code}>Edit</button>!-->
                          </div>
                          <input
                            type="text"
                            class="input input-bordered w-full bg-base-100 text-base-content opacity-60 cursor-default focus:border focus:border-base-100"
                            readonly
                            value="{value}"
                          >
                        </div>
                      {/each}
                    </div>
                  </td>
                </tr>
              {/if}
            {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/if}
</div>

<DockModule />
<ToastModule />
