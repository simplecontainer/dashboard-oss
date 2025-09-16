<script lang="ts">
  import { getContext, onDestroy, onMount } from 'svelte';
  import { writable, type Writable } from 'svelte/store';
  import { connection } from '../stores/connections';
  import ClusterModule from '../contexts/context.module.svelte';
  import EmptyModule from '../skeletons/empty.module.svelte';
  import LoadingModule from '../skeletons/loading.module.svelte';
  import NoCtxModule from '../skeletons/noctx.module.svelte';
  import { convertToShortGitIdFromArray } from './dag/helpers';
  import { AddGitops, gitopsIds, gitopsMap } from '../stores/gitops';
  import { goto } from '$app/navigation';
  import * as jsonpatch from 'fast-json-patch/index.mjs';
  import { EVENT_REFRESH, EVENT_SYNC, New, ToJson } from '../events';

  import { KIND_GITOPS } from '../../types/simplecontainer/static';
  import toastStore from '../../toasts';
  import ConfirmationModal from '../shared/confirm.svelte';
  import ToastModule from '../shared/toast.module.svelte';
  import DockModule from '../dock/dock.module.svelte';
  import { type Connection, fetchWithTimeout } from '../../types/context/connection';
  import { isEmptyObject } from '../../helpers/objects';
  import EditorModule from '../shared/editor.svelte';
  import EditorDiffModule from '../shared/editor.diff.svelte';
  import DagModule from './dag.module.svelte';
  import ExpandableInput from '../shared/expandable.svelte';
  import { timeSinceDuration } from '../time';
  import StateBadge from '../shared/statebadge.module.svelte';
  import { elapsedTimerStore } from '../stores/time';

  let openModal = writable(false);

  const handleConfirm = () => {
    openModal.set(false); // Close the modal after confirmation
    DeleteGitops($openItem);
    document.getElementById(`label-swap-${$openItem}`).click();
  };
  const handleCancel = () => {
    openModal.set(false); // Close the modal after cancellation
    document.getElementById(`label-swap-${$openItem}`).click();
  };

  const triggerAction = (gitopsId) => {
    if ($openItem !== gitopsId) {
      document.getElementById(`label-swap-${gitopsId}`).click();
    }
    openModal.set(true); // Open the confirmation modal
  };


  let adminSection: Writable<string> = getContext('adminSection');
  adminSection.set('gitops');

  let { data } = $props();
  let { clusters, proxyApiDomain, proxyDomain } = data;

  let checkedItems = writable<Record<string, boolean>>({});
  let openItem = writable<string | null>(null);
  let modalItem = writable<string | null>(null);
  let diffItem = writable<string>('');

  function toggleItem(id: string) {
    openItem.update(current => (current === id ? null : id));
    modalItem.set('');

    checkedItems.update(items => {
      if (items[id]) {
        return { [id]: false };
      }

      return { [id]: true };
    });
  }

  let selectedTabModal = writable('');

  let once = false;

  const unsubscribe = connection.subscribe(async (c: Connection) => {
    if (isEmptyObject(c)) {
      return;
    }

    if (c.GetProxyURL() !== '' && !once) {
      once = true;

      const resp = await fetchWithTimeout(`${c.GetProxyURL()}/api/v1/state/simplecontainer.io/v1/state/gitops`, {
        method: 'GET',
        headers: {
          Upstream: btoa(c.Context.API).replace(/=+$/, '')
        }
      });

      const states = (await resp.json()).Data;
      for (let state of states) {
        AddGitops(state);
      }
    }
  });

  onMount(async () => {
  });

  onDestroy(() => {
    unsubscribe();
    once = false;
  });

  async function Diff(original) {
    var diff = JSON.parse(JSON.stringify(original));

    const resp = await fetchWithTimeout(`${$connection.GetProxyURL()}/api/v1/kind/compare/${original.prefix}/kind/${original.kind}/${original.meta.group}/${original.meta.name}`, {
      method: 'POST',
      body: JSON.stringify(original),
      headers: {
        Upstream: btoa($connection.Context.API).replace(/=+$/, '')
      }
    });

    const changes = (await resp.json()).Data;

    if (original.state.gitops.missing == true) {
      diff = {};
    } else {
      if (changes != null) {
        diff = jsonpatch.applyPatch(diff, changes).newDocument;
      }
    }

    return diff;
  }

  async function handleTabChange(tab: string) {
    if (tab === 'Raw') {

    } else if (tab == 'Diff') {

    }
  }

  function Hide() {
  }

  async function handleNodeClick(data) {
    if (data.data.kind !== undefined) {
      const diff = await Diff(data.data);
      diffItem.set(diff);

      modalItem.set(`${data.data.kind}-${data.data.meta.group}-${data.data.meta.name}`);

      if ($modalItem == '') {
        selectedTabModal.set('raw');
      } else {
        selectedTabModal.set('messages');
      }

      document.getElementById('details').showModal();
    } else {
      await goto(`/account/containers/${data.data.Platform.Group}/${data.data.Platform.GeneratedName}`);
    }
  }

  async function SyncGitops(gitops: object) {
    try {
      const event = New(EVENT_SYNC, KIND_GITOPS, KIND_GITOPS, gitops.Definition.meta.group, gitops.Definition.meta.name, null);

      const resp = await fetchWithTimeout(`${$connection.GetProxyURL()}/api/v1/kind/propose/simplecontainer.io/v1/event/gitops/${gitops.Definition.meta.group}/${gitops.Definition.meta.name}`, {
        method: 'POST',
        body: ToJson(event),
        headers: {
          Upstream: btoa($connection.Context.API).replace(/=+$/, '')
        }
      });

      const state = await resp.json();

      if (state.HttpStatus === 200) {
        toastStore.addToast({ message: 'Sync triggered', type: 'success' });
      } else {
        toastStore.addToast({ message: 'Error during fetch or processing response', type: 'error' });
      }
    } catch (error) {
      toastStore.addToast({ message: error, type: 'error' });
    }
  }

  async function RefreshGitops(gitops: object) {
    try {
      const event = New(EVENT_REFRESH, KIND_GITOPS, KIND_GITOPS, gitops.Definition.meta.group, gitops.Definition.meta.name, null);

      const resp = await fetchWithTimeout(`${$connection.GetProxyURL()}/api/v1/kind/propose/simplecontainer.io/v1/event/gitops/${gitops.Definition.meta.group}/${gitops.Definition.meta.name}`, {
        method: 'POST',
        body: ToJson(event),
        headers: {
          Upstream: btoa($connection.Context.API).replace(/=+$/, '')
        }
      });

      if (resp.status == 200) {
        const state = await resp.json();

        if (state.HttpStatus === 200) {
          toastStore.addToast({ message: 'Refresh triggered', type: 'success' });
        } else {
          toastStore.addToast({ message: 'Error during fetch or processing response', type: 'error' });
        }
      }
    } catch (error) {
      toastStore.addToast({ message: error, type: 'error' });
    }
  }

  async function DeleteGitops(gitopsId: object) {
    try {
      const resp = await fetchWithTimeout(`${$connection.GetProxyURL()}/api/v1/propose/remove`, {
        method: 'DELETE',
        body: ToJson($gitopsMap[gitopsId].Definition),
        headers: {
          Upstream: btoa($connection.Context.API).replace(/=+$/, '')
        }
      });

      if (resp.status == 200) {
        const state = await resp.json();

        if (state.HttpStatus === 200) {
          toastStore.addToast({ message: 'Delete triggered', type: 'success' });
        } else {
          toastStore.addToast({ message: 'Failed to delete gitops object', type: 'error' });
        }
      } else {
        toastStore.addToast({ message: `Server returned non ok response: ${resp.status}`, type: 'error' });
      }
    } catch (error) {
      toastStore.addToast({ message: error, type: 'error' });
    }
  }
</script>

<svelte:head>
  <title>Gitops</title>
</svelte:head>

<div class="navbar bg-base-100">
  <div class="flex-1">
    <a class="text-xl font-bold pl-2" href="/account/gitops">Gitops</a>
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
    <div class="overflow-x-auto pb-12">
      {#if Object.entries($gitopsMap).length == 0}
        <EmptyModule></EmptyModule>
      {:else}
        <div class="w-full mt-5 p-10 bg-base-100 flex flex-col items-center justify-center rounded-lg shadow-md">
          <table class="table mt-5">
            <!-- Table Head -->
            <thead>
            <tr>
              <th>Repository</th>
              <th>Revision</th>
              <th>Auto sync</th>
              <th>Status</th>
            </tr>
            </thead>
            {#each $gitopsIds as gitopsId}
              <tbody class="hover:bg-base-300">
                {#if $gitopsMap[gitopsId].Definition != undefined}
                  <tr class="border-b-0 border-gray-200">
                    <td colspan="4">
                      <!-- Use a div inside td for padding and background -->
                      <div class="flex justify-between">
                        <div class="flex items-center space-x-3">
                          <strong class="text-md font-bold text-gray-900 tracking-wide">gitops/{$gitopsMap[gitopsId].Definition.meta.group}/{$gitopsMap[gitopsId].Definition.meta.name}</strong>

                          <div class="badge badge-xs badge-neutral">{$gitopsMap[gitopsId].Gitops.Node.NodeName}</div>
                        </div>
                        <div class="flex items-center space-x-2">
                          <label class="btn btn-circle" on:click={() => SyncGitops($gitopsMap[gitopsId])}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M6.28571 19C3.91878 19 2 17.1038 2 14.7647C2 12.4256 3.91878 10.5294 6.28571 10.5294C6.56983 10.5294 6.8475 10.5567 7.11616 10.6089M14.381 8.02721C14.9767 7.81911 15.6178 7.70588 16.2857 7.70588C16.9404 7.70588 17.5693 7.81468 18.1551 8.01498M7.11616 10.6089C6.88706 9.9978 6.7619 9.33687 6.7619 8.64706C6.7619 5.52827 9.32028 3 12.4762 3C15.4159 3 17.8371 5.19371 18.1551 8.01498M7.11616 10.6089C7.68059 10.7184 8.20528 10.9374 8.66667 11.2426M18.1551 8.01498C20.393 8.78024 22 10.8811 22 13.3529C22 16.0599 20.0726 18.3221 17.5 18.8722"
                                stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" />
                              <path d="M12 16V22M12 16L14 18M12 16L10 18" stroke="#1C274C" stroke-width="1.5"
                                    stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                          </label>
                          <label class="btn btn-circle" on:click={() => RefreshGitops($gitopsMap[gitopsId])}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M7.37756 11.6296H6.62756H7.37756ZM7.37756 12.5556L6.81609 13.0528C6.95137 13.2056 7.14306 13.2966 7.34695 13.3049C7.55084 13.3133 7.74932 13.2382 7.89662 13.0969L7.37756 12.5556ZM9.51905 11.5414C9.81805 11.2547 9.82804 10.7799 9.54137 10.4809C9.2547 10.182 8.77994 10.172 8.48095 10.4586L9.51905 11.5414ZM6.56148 10.5028C6.28686 10.1927 5.81286 10.1639 5.50277 10.4385C5.19267 10.7131 5.16391 11.1871 5.43852 11.4972L6.56148 10.5028ZM14.9317 9.0093C15.213 9.31337 15.6875 9.33184 15.9915 9.05055C16.2956 8.76927 16.3141 8.29476 16.0328 7.9907L14.9317 9.0093ZM12.0437 6.25C9.05802 6.25 6.62756 8.653 6.62756 11.6296H8.12756C8.12756 9.49251 9.87531 7.75 12.0437 7.75V6.25ZM6.62756 11.6296L6.62756 12.5556H8.12756L8.12756 11.6296H6.62756ZM7.89662 13.0969L9.51905 11.5414L8.48095 10.4586L6.85851 12.0142L7.89662 13.0969ZM7.93904 12.0583L6.56148 10.5028L5.43852 11.4972L6.81609 13.0528L7.93904 12.0583ZM16.0328 7.9907C15.0431 6.9209 13.6212 6.25 12.0437 6.25V7.75C13.1879 7.75 14.2154 8.23504 14.9317 9.0093L16.0328 7.9907Z"
                                fill="#1C274C" />
                              <path
                                d="M16.6188 11.4443L17.1795 10.9462C17.044 10.7937 16.8523 10.703 16.6485 10.6949C16.4447 10.6868 16.2464 10.7621 16.0993 10.9034L16.6188 11.4443ZM14.4805 12.4581C14.1817 12.745 14.1722 13.2198 14.4591 13.5185C14.746 13.8173 15.2208 13.8269 15.5195 13.54L14.4805 12.4581ZM17.4393 13.4972C17.7144 13.8068 18.1885 13.8348 18.4981 13.5597C18.8078 13.2846 18.8358 12.8106 18.5607 12.5009L17.4393 13.4972ZM9.04688 15.0047C8.76342 14.7027 8.28879 14.6876 7.98675 14.9711C7.68472 15.2545 7.66966 15.7292 7.95312 16.0312L9.04688 15.0047ZM11.9348 17.7499C14.9276 17.7499 17.3688 15.3496 17.3688 12.3703H15.8688C15.8688 14.5047 14.1158 16.2499 11.9348 16.2499V17.7499ZM17.3688 12.3703V11.4443H15.8688V12.3703H17.3688ZM16.0993 10.9034L14.4805 12.4581L15.5195 13.54L17.1383 11.9853L16.0993 10.9034ZM16.0581 11.9425L17.4393 13.4972L18.5607 12.5009L17.1795 10.9462L16.0581 11.9425ZM7.95312 16.0312C8.94543 17.0885 10.3635 17.7499 11.9348 17.7499V16.2499C10.792 16.2499 9.76546 15.7704 9.04688 15.0047L7.95312 16.0312Z"
                                fill="#1C274C" />
                              <circle cx="12" cy="12" r="10" stroke="#1C274C" stroke-width="1.5" />
                            </svg>
                          </label>
                          <label class="btn btn-circle" on:click={() => triggerAction(gitopsId)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M11.142 20C8.91458 20 7.80085 20 6.87114 19.4986C5.94144 18.9971 5.35117 18.0781 4.17061 16.24L3.48981 15.18C2.4966 13.6336 2 12.8604 2 12C2 11.1396 2.4966 10.3664 3.48981 8.82001L4.17061 7.76001C5.35117 5.92191 5.94144 5.00286 6.87114 4.50143C7.80085 4 8.91458 4 11.142 4L13.779 4C17.6544 4 19.5921 4 20.7961 5.17157C22 6.34315 22 8.22876 22 12C22 15.7712 22 17.6569 20.7961 18.8284C19.5921 20 17.6544 20 13.779 20H11.142Z"
                                stroke="#1C274C" stroke-width="1.5" />
                              <path d="M15.5 9.50002L10.5 14.5M10.5 9.5L15.5 14.5" stroke="#1C274C" stroke-width="1.5"
                                    stroke-linecap="round" />
                            </svg>
                          </label>

                          <label
                            id="label-swap-{$gitopsMap[gitopsId].Definition.meta.group}-{$gitopsMap[gitopsId].Definition.meta.name}"
                            class="btn btn-circle swap swap-rotate">
                            <input
                              id="{$gitopsMap[gitopsId].Definition.meta.group}-{$gitopsMap[gitopsId].Definition.meta.name}-swap"
                              on:change={() => toggleItem(`${$gitopsMap[gitopsId].Definition.meta.group}-${$gitopsMap[gitopsId].Definition.meta.name}`)}
                              bind:checked={$checkedItems[gitopsId]}
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
                      </div>
                    </td>
                  </tr>
                  <tr
                    class="border-b-0 { $gitopsMap[gitopsId].Gitops.Status.state.state === 'pending_delete' ? 'bg-warning' : '' }">
                    <td>
                      <ExpandableInput value={$gitopsMap[gitopsId].Gitops.Git.Repository} />
                    </td>
                    <td>
                      <strong>{$gitopsMap[gitopsId].Gitops.Git.Revision}</strong> ({convertToShortGitIdFromArray($gitopsMap[gitopsId].Gitops.Commit.Hash)})
                    </td>
                    <td>
                      {#if $gitopsMap[gitopsId].Gitops.AutomaticSync === true}
                        <span class="badge badge-success">True</span>
                      {:else}
                        <span class="badge badge-neutral">False</span>
                      {/if}
                    </td>
                    <td>
                      <StateBadge
                        state={$gitopsMap[gitopsId].Gitops.Status.state.state}
                        time={timeSinceDuration($elapsedTimerStore[gitopsId])}
                        maxHistory={4}
                        transitionDuration={5000}
                      />
                    </td>
                  </tr>
                  <tr class="border-t-0">
                    <td colspan="9">
                      {#if $openItem === `${$gitopsMap[gitopsId].Definition.meta.group}-${$gitopsMap[gitopsId].Definition.meta.name}`}
                        <div class="border border-gray-300 bg-base-200 rounded-lg p-4 pt-0">
                          <ConfirmationModal
                            open={openModal}
                            message="Are you sure?"
                            type="error"
                            onConfirm={handleConfirm}
                            onCancel={handleCancel}
                          />


                          <div class="navbar bg-base-100 mt-2">
                            <div class="navbar-start">
                              <div class="dropdown">
                                <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M4 6h16M4 12h8m-8 6h16" />
                                  </svg>
                                </div>
                              </div>
                              <a class="text-xl">{$gitopsMap[gitopsId].Definition.meta.group}
                                /{$gitopsMap[gitopsId].Definition.meta.name}</a>
                            </div>
                            <div class="navbar-end join">
                            </div>
                          </div>
                          <div role="tablist" class="tabs tabs-lifted mt-2">
                            <input type="radio" name="my_tabs_2" role="tab" class="tab" aria-label="Overview"
                                   checked="checked"
                                   on:change={() => handleTabChange("clear")}
                            />
                            <div role="tabpanel" class="tab-content bg-base-100 rounded-box p-6">
                              <DagModule c={$connection} id={gitopsId} onNodeClick={handleNodeClick} />
                            </div>
                          </div>
                        </div>
                      {/if}
                    </td>
                  </tr>
                {/if}
              </tbody>
            {/each}
          </table>
        </div>
      {/if}
    </div>

    <dialog id="details" class="modal">
      <div class="modal-box max-h-[80vh] w-11/12 max-w-full">
        <h3 class="text-lg font-bold">Object details</h3>
        {#if $gitopsMap[$openItem] != undefined}
          <div role="tablist" class="tabs tabs-lifted">
            {#if $modalItem != ""}
              <input type="radio" name="modal_tabs" value="messages" bind:group={$selectedTabModal}
                     on:change={() => handleTabChange("Messages")} role="tab" class="tab" aria-label="Messages"
                     checked />
              <div role="tabpanel" class="tab-content bg-base-100 border-base-100 rounded-box p-6 max-h-[80vh]">
                <table class="table">
                  <tbody>
                  {#each $gitopsMap[$openItem].Gitops.Pack.Definitions as definition}
                    {@const def = definition.Definition.Definition.Definition}
                    {#if $modalItem == `${def.kind}-${def.meta.group}-${def.meta.name}`}
                      {#if Object.entries(def.state.gitops.messages).length != 0}
                        {#each Object.entries(def.state.gitops.messages).reverse() as [key, value]}
                          <tr>
                            <td>
                              <div role="alert" class="alert alert-{value.category}">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                     class="stroke-info h-6 w-6 shrink-0">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>{new Date(value.timestamp).toLocaleString()} {value.message}</span>
                              </div>
                            </td>
                          </tr>
                        {/each}
                      {:else}
                        <tr>
                          <td>
                            No messages
                          </td>
                        </tr>
                      {/if}
                    {/if}
                  {/each}
                  </tbody>
                </table>
              </div>

              <input type="radio" name="modal_tabs" role="tab" class="tab" aria-label="Gitops object" value="raw"
                     bind:group={$selectedTabModal} on:change={() => handleTabChange("Raw")} />
              <div role="tabpanel" class="tab-content bg-base-100 border-base-100 rounded-box p-6 max-h-[80vh]">
                <EditorModule code={JSON.stringify($gitopsMap[$openItem], null, 2)} language="json" theme="vs-light"
                              height="height: 80vh" />
              </div>

              {#each $gitopsMap[$openItem].Gitops.Pack.Definitions as definition}
                {@const def = definition.Definition.Definition.Definition}
                {#if `${def.kind}-${def.meta.group}-${def.meta.name}` == $modalItem}
                  <input type="radio" name="modal_tabs" role="tab" class="tab" aria-label="Definition diff" value="diff"
                         bind:group={$selectedTabModal} on:change={() => handleTabChange("Diff")} />
                  <div role="tabpanel" class="tab-content bg-base-100 border-base-100 rounded-box p-6 max-h-[80vh]">
                    <EditorDiffModule original={def} diff={$diffItem} language="json"
                                      theme="vs-light" height="height: 80vh" />
                  </div>
                {/if}
              {/each}
            {/if}
          </div>
        {/if}
      </div>
      <form method="dialog" class="modal-backdrop">
        <button on:click={() => Hide() }>close</button>
      </form>
    </dialog>
  {/if}
</div>
<DockModule></DockModule>

<ToastModule></ToastModule>