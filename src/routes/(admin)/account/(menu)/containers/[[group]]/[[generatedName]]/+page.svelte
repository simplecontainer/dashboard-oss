<script lang="ts">
  import { page } from '$app/stores';
  import { getContext, onMount, onDestroy } from "svelte";
  import { writable, type Writable } from "svelte/store";
  import type { Connection } from "../../../../types/context/connection";
  import { KIND_CONTAINERS } from "../../../../types/simplecontainer/static";
  import { timeSince } from "../../../time";
  import { isEmptyObject } from "../../../../helpers/objects";
  import { EVENT_RESTART, New, ToJson } from "../../../events";
  import { connection } from "../../../stores/connections";
  import {containerIds, containersMap, AddContainer, ClearContainers} from "../../../stores/containers";
  import toastStore from "../../../../toasts";
  import * as yaml from 'js-yaml';
  import ClusterModule from "../../../contexts/context.module.svelte";
  import EmptyModule from "../../../skeletons/empty.module.svelte";
  import LoadingModule from "../../../skeletons/loading.module.svelte";
  import NoCtxModule from "../../../skeletons/noctx.module.svelte";
  import ToastModule from "../../../shared/toast.module.svelte";
  import ConfirmationModal from "../../../shared/confirm.svelte";
  import DockModule from "../../../dock/dock.module.svelte";
  import EditorModule from "../../../shared/editor.svelte";
  import {activeDockItem, showFullScreenDiv} from "../../../stores/dock";
  import {Preview} from "../../../shared/preview"
  import { elapsedTimerStore } from '../../../stores/time';

  let confirm = writable(false);

  const group = () => $page.params.group;
  const generatedName = () => $page.params.generatedName;

  const handleConfirm = () => {
    DeleteContainers($openItem)
    document.getElementById(`label-swap-${$openItem}`).click()
  };

  const handleCancel = () => {
    document.getElementById(`label-swap-${$openItem}`).click()
  };

  const triggerAction = (containerId) => {
    if ($openItem !== containerId) {
      document.getElementById(`label-swap-${containerId}`).click()
    }

    $confirm = true
  };

  let editorContent = writable("")

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("containers")

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
      LoadContainers(c)
    }
  });

  let containersWithTime

    $effect(() => {
    if ($connection !== null && !isEmptyObject($connection) && !$connection.IsEmpty()) {
      LoadContainers($connection)
    }
  });

  onMount(async () => {});

  onDestroy(() => {
    unsubscribe()
    once = false
  })

  let openItem = writable<string | null>(null);

  function toggleItem(id: string) {
    if (id == "") {
      openItem.update(() => null);
      checkedItems.update(items => {
        // Set all items to false
        return Object.keys(items).reduce((acc, key) => {
          acc[key] = false;
          return acc;
        }, {});
      });
    } else {
      openItem.update(current => (current === id ? null : id));

      checkedItems.update(items => {
        if (items[id]) {
          return {[id]: false};
        }

        return {[id]: true};
      });
    }
  }

  function handleTabChange(tab: string) {}

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toastStore.addToast({ message: 'Copied to clipboard', type: 'success' });
    } catch (err) {
      toastStore.addToast({
        message: err instanceof Error ? err.message : 'Failed to copy',
        type: 'error'
      });
    }
  }

  async function LoadContainers(c: Connection){
    ClearContainers()
    let resp

    if (group() && generatedName()) {
      resp = await fetch(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/state/containers/${group() }/${generatedName()}`, {
        method: 'GET',
        headers: {
          Upstream: btoa(c.Context.API).replace(/=+$/,''),
        },
      });
    } else if (group() ) {
      resp = await fetch(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/state/containers/${group() }`, {
        method: 'GET',
        headers: {
          Upstream: btoa(c.Context.API).replace(/=+$/,''),
        },
      });
    } else {
      resp = await fetch(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/state/containers`, {
        method: 'GET',
        headers: {
          Upstream: btoa(c.Context.API).replace(/=+$/,''),
        },
      });
    }

    const states = (await resp.json()).Data

    if (Array.isArray(states)) {
      toggleItem("")

      for (let state of states) {
        AddContainer(state);
      }
    } else {
      AddContainer(states);

      if ($openItem != states.Platform.GeneratedName){
        toggleItem(states.Platform.GeneratedName)
      }
    }
  }
  async function RestartContainer(container: object) {
    try {
      const event = New(EVENT_RESTART, KIND_CONTAINERS, KIND_CONTAINERS, container.Platform.Group, container.Platform.GeneratedName, null)

      const resp = await fetch(`${$connection.GetProxyURL()}/api/v1/kind/propose/simplecontainer.io/v1/event/containers/${container.Platform.Group}/${container.Platform.GeneratedName}`, {
        method: 'POST',
        body: ToJson(event),
        headers: {
        Upstream: btoa($connection.Context.API).replace(/=+$/,''),
      },
      });

      const state = await resp.json();

      if (state.HttpStatus === 200) {
        toastStore.addToast({ message: 'Restart is triggered', type: 'success' });
      } else {
        toastStore.addToast({ message: 'Error during fetch or processing response', type: 'error' });
      }
    } catch (error) {
      toastStore.addToast({ message: error, type: 'error' });
    }
  }
  async function DeleteContainers(containerId: object) {
    try {
      const resp = await fetch(`${$connection.GetProxyURL()}/api/v1/propose/remove`, {
        method: 'DELETE',
        body: ToJson($containersMap[containerId].Platform.Definition),
        headers: {
        Upstream: btoa($connection.Context.API).replace(/=+$/,''),
      },
      });

      if (resp.status == 200) {
        const state = await resp.json();

        if (state.HttpStatus === 200) {
          toastStore.addToast({message: 'Delete triggered', type: 'success'});
        } else {
          toastStore.addToast({message: 'Failed to delete gitops object', type: 'error'});
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
  <title>Containers</title>
</svelte:head>

<div class="navbar bg-base-100">
  <div class="flex-1">
    <a href="/account/containers" class="btn btn-ghost text-xl">Containers</a>
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
  {#if Object.entries($containersMap).length == 0}
    <EmptyModule></EmptyModule>
  {:else}
  <table class="table mt-5">
    <!-- Table Head -->
    <thead>
    <tr>
      <th>Node</th>
      <th>Name</th>
      <th>Image</th>
      <th>Networks</th>
      <th>Engine state</th>
      <th>Smr state</th>
      <th>Inspect</th>
    </tr>
    </thead>
    <tbody>
    {#each $containerIds as containerId}
      <tr class="border-b-0 { $containersMap[containerId].General.Status.state.State === 'delete' ? 'bg-warning' : '' }">
        <th>{$containersMap[containerId].General.Runtime.Node.NodeName}</th>
        <td>
          {$containersMap[containerId].Platform.GeneratedName}
          {#if $containersMap[containerId].General.Status.state.State == "running"}
            <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    class="inline-block h-[16px] w-[16px] stroke-success">
              <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          {/if}

          {#if $containersMap[containerId].Platform.Definition.meta.runtime.owner.kind == "gitops"}
            <div class="badge badge-xs badge-neutral">GITOPS</div>
          {/if}
        </td>
        <td>{$containersMap[containerId].Platform.Image}:{$containersMap[containerId].Platform.Tag}</td>
        <td>
          {#each $containersMap[containerId].Platform.Networks.Networks as network}
            <div class="badge badge-primary badge-outline mr-1 mb-1">
              {#if network.Docker.IP != ""}
              {network.Reference.Name}: {network.Docker.IP}
              {:else}
                Not attached
              {/if}
            </div>
          {/each}
        </td>
        <td>{$containersMap[containerId].Platform.DockerState}</td>
        <td>{$containersMap[containerId].General.Status.state.State} ({timeSince($elapsedTimerStore[containerId])})</td>
        <td>
          <div class="flex items-center space-x-2">
            <label class="btn btn-circle" on:click={() => RestartContainer($containersMap[containerId])}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2V6" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M8.5 3.70605C5.26806 5.07157 3 8.27099 3 12.0001C3 16.9707 7.02944 21.0001 12 21.0001C16.9706 21.0001 21 16.9707 21 12.0001C21 8.27099 18.7319 5.07157 15.5 3.70605" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </label>
            <label class="btn btn-circle" on:click={() => triggerAction(containerId)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.142 20C8.91458 20 7.80085 20 6.87114 19.4986C5.94144 18.9971 5.35117 18.0781 4.17061 16.24L3.48981 15.18C2.4966 13.6336 2 12.8604 2 12C2 11.1396 2.4966 10.3664 3.48981 8.82001L4.17061 7.76001C5.35117 5.92191 5.94144 5.00286 6.87114 4.50143C7.80085 4 8.91458 4 11.142 4L13.779 4C17.6544 4 19.5921 4 20.7961 5.17157C22 6.34315 22 8.22876 22 12C22 15.7712 22 17.6569 20.7961 18.8284C19.5921 20 17.6544 20 13.779 20H11.142Z" stroke="#1C274C" stroke-width="1.5"/>
                <path d="M15.5 9.50002L10.5 14.5M10.5 9.5L15.5 14.5" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </label>
            <label id="label-swap-{containerId}" class="btn btn-circle swap swap-rotate">
            <input id="{$containersMap[containerId].General.Runtime.NodeName}-swap"
                   on:change={() => toggleItem($containersMap[containerId].Platform.GeneratedName)}
                   bind:checked={$checkedItems[$containersMap[containerId].Platform.GeneratedName]}
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
      </tr>
      <tr class="border-t-0">
        <td colspan="7">
          {#if $openItem === $containersMap[containerId].Platform.GeneratedName}
            <div class="border border-gray-300 rounded-lg p-4 pt-0">
              <ConfirmationModal
                      open={confirm}
                      message="Are you sure - this will delete all {$containersMap[containerId].Platform.Definition.spec.replicas} replicas?"
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
                  <a class="text-xl">{$containersMap[containerId].Platform.GeneratedName}</a>
                </div>
                <div class="navbar-end join">
                </div>
              </div>
              <div role="tablist" class="tabs tabs-lifted">
                <input type="radio" name="my_tabs_2" role="tab" class="tab" aria-label="Overview" checked="checked"
                       on:change={() => handleTabChange("clear")}
                />
                <div role="tabpanel" class="tab-content rounded-box p-6">
                  <div class="flex w-full flex-col">
                    <div class="stats shadow-sm">
                      <div class="stat">
                        <div class="stat-figure text-primary">
                          {#if $containersMap[containerId].General.Status.state.State == "running"}
                            <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    class="inline-block h-8 w-8 stroke-success">
                              <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                          {:else if $containersMap[containerId].General.Status.state.State.toString().endsWith("failed")}
                            <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    class="inline-block h-8 w-8 stroke-error">
                              <circle cx="12" cy="12" r="10" stroke="#1C274C" stroke-width="1.5" class="stroke-error"/>
                              <path d="M12 7V13" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" class="stroke-error"/>
                              <circle cx="12" cy="16" r="1" fill="#1C274C"/>
                            </svg>
                          {:else}
                            <svg class="inline-block h-8 w-8"> viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2 6C2 4.11438 2 3.17157 2.58579 2.58579C3.17157 2 4.11438 2 6 2C7.88562 2 8.82843 2 9.41421 2.58579C10 3.17157 10 4.11438 10 6V18C10 19.8856 10 20.8284 9.41421 21.4142C8.82843 22 7.88562 22 6 22C4.11438 22 3.17157 22 2.58579 21.4142C2 20.8284 2 19.8856 2 18V6Z" stroke="#1C274C" stroke-width="1.5"/>
                              <path d="M14 6C14 4.11438 14 3.17157 14.5858 2.58579C15.1716 2 16.1144 2 18 2C19.8856 2 20.8284 2 21.4142 2.58579C22 3.17157 22 4.11438 22 6V18C22 19.8856 22 20.8284 21.4142 21.4142C20.8284 22 19.8856 22 18 22C16.1144 22 15.1716 22 14.5858 21.4142C14 20.8284 14 19.8856 14 18V6Z" stroke="#1C274C" stroke-width="1.5"/>
                            </svg>
                          {/if}
                        </div>
                        <div class="stat-title">Status</div>
                        <div class="stat-value text-primary">{$containersMap[containerId].General.Status.state.State}</div>
                        <div class="stat-desc">{timeSince($containersMap[containerId].General.Status.LastReadinessTimestamp)}</div>
                      </div>

                      <div class="stat">
                        <div class="stat-title">Previous Status</div>
                        <div class="stat-value text-secondary">{$containersMap[containerId].General.Status.state.PreviousState}</div>
                        <div class="stat-desc">For debugging</div>
                      </div>

                      <div class="stat">
                        <div class="stat-figure text-primary-content">
                          {#if $containersMap[containerId].General.Status.LastDependsSolved === true}
                            <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    class="inline-block h-8 w-8 stroke-success">
                              <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                          {:else}
                            <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    class="inline-block h-8 w-8 stroke-error">
                              <circle cx="12" cy="12" r="10" stroke="#1C274C" stroke-width="1.5" class="stroke-error"/>
                              <path d="M12 7V13" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" class="stroke-error"/>
                              <circle cx="12" cy="16" r="1" fill="#1C274C"/>
                            </svg>
                          {/if}
                        </div>
                        <div class="stat-title">Dependencies</div>
                        <div class="stat-value">
                          {#if $containersMap[containerId].General.Status.LastDependsSolved === true}
                            resolved
                          {:else}
                            not resolved
                          {/if}
                        </div>
                        <div class="stat-desc primary">Reported by smr</div>
                      </div>

                      <div class="stat">
                        <div class="stat-figure text-primary-content">
                          {#if $containersMap[containerId].Platform.DockerState == "running"}
                            <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    class="inline-block h-8 w-8 stroke-success">
                              <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                          {:else if $containersMap[containerId].Platform.DockerState.toString() != "created"}
                            <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    class="inline-block h-8 w-8 stroke-error">
                              <circle cx="12" cy="12" r="10" stroke="#1C274C" stroke-width="1.5" class="stroke-error"/>
                              <path d="M12 7V13" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" class="stroke-error"/>
                              <circle cx="12" cy="16" r="1" fill="#1C274C"/>
                            </svg>
                          {:else}
                            <svg class="inline-block h-8 w-8"> viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2 6C2 4.11438 2 3.17157 2.58579 2.58579C3.17157 2 4.11438 2 6 2C7.88562 2 8.82843 2 9.41421 2.58579C10 3.17157 10 4.11438 10 6V18C10 19.8856 10 20.8284 9.41421 21.4142C8.82843 22 7.88562 22 6 22C4.11438 22 3.17157 22 2.58579 21.4142C2 20.8284 2 19.8856 2 18V6Z" stroke="#1C274C" stroke-width="1.5"/>
                              <path d="M14 6C14 4.11438 14 3.17157 14.5858 2.58579C15.1716 2 16.1144 2 18 2C19.8856 2 20.8284 2 21.4142 2.58579C22 3.17157 22 4.11438 22 6V18C22 19.8856 22 20.8284 21.4142 21.4142C20.8284 22 19.8856 22 18 22C16.1144 22 15.1716 22 14.5858 21.4142C14 20.8284 14 19.8856 14 18V6Z" stroke="#1C274C" stroke-width="1.5"/>
                            </svg>
                          {/if}
                        </div>
                        <div class="stat-title">Engine Status</div>
                        <div class="stat-value">
                          {#if $containersMap[containerId].Platform.DockerState != ""}
                          {$containersMap[containerId].Platform.DockerState}
                          {:else}
                            Not known yet
                          {/if}
                        </div>
                        <div class="stat-desc primary">Reported by engine</div>
                      </div>
                    </div>
                    <div class="mt-5 max-w-full">
                    {#each Object.entries($containersMap[containerId].Platform.Labels.Labels) as [key, label] }
                      <span class="badge badge-info mr-1 mb-1">{key}: {label}</span>
                    {/each}
                    </div>
                    <div class="divider"></div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
                      {#if $containersMap[containerId].Platform.Configurations.Configurations !== undefined }
                        {#each $containersMap[containerId].Platform.Configurations.Configurations as config }
                          <div class="card bg-base-100 shadow-xl">
                            <div class="card-body">
                              <h2 class="card-title">
                                Configuration
                              </h2>
                              <div class="overflow-x-auto">
                                <table class="table">
                                  <tbody>
                                  <tr>
                                    <th>REFERENCE</th>
                                    <td>{config.Reference.Group}/{config.Reference.Name}</td>
                                  </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        {/each}
                      {/if}
                      {#if $containersMap[containerId].Platform.Resources.Resources !== undefined }
                        {#each $containersMap[containerId].Platform.Resources.Resources as resource }
                          <div class="card bg-base-100 shadow-xl">
                            <div class="card-body">
                              <h2 class="card-title">
                                Resource
                              </h2>
                              <div class="overflow-x-auto">
                                <table class="table">
                                  <tbody>
                                  <tr>
                                    <th>REFERENCE</th>
                                    <td>{resource.Reference.Group}/{resource.Reference.Name}</td>
                                  </tr>
                                  <tr>
                                    <th>KEY</th>
                                    <td>{resource.Reference.Key}</td>
                                  </tr>
                                  <tr>
                                    <th>MOUNT</th>
                                    <td>{resource.Reference.MountPoint}</td>
                                  </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        {/each}
                      {/if}
                      {#if $containersMap[containerId].Platform.Volumes.Volumes !== undefined }
                        {#each $containersMap[containerId].Platform.Volumes.Volumes as volume }
                          <div class="card bg-base-100 shadow-xl">
                            <div class="card-body">
                              <h2 class="card-title">
                                Volume
                              </h2>
                              <div class="overflow-x-auto">
                              <table class="table">
                                <tbody>
                                <tr>
                                  <th>TYPE</th>
                                  <td>{volume.Type}</td>
                                </tr>
                                {#if volume.Type == "bind"}
                                  <tr>
                                    <th>HOSTPATH</th>
                                    <td>{volume.HostPath}</td>
                                  </tr>
                                {:else}
                                  <tr>
                                    <th>NAME</th>
                                    <td>{volume.Name}</td>
                                  </tr>
                                {/if}
                                <tr>
                                  <th>MOUNT</th>
                                  <td>{volume.MountPoint}</td>
                                </tr>
                                </tbody>
                              </table>
                                </div>
                            </div>
                          </div>
                        {/each}
                      {/if}
                      {#if $containersMap[containerId].Platform.Readiness.Readinesses !== undefined }
                        {#each $containersMap[containerId].Platform.Readiness.Readinesses as readiness }
                          <div class="card bg-base-100 shadow-xl">
                            <div class="card-body">
                              <h2 class="card-title">
                                Readiness probe
                              </h2>
                              <div class="overflow-x-auto">
                                <table class="table">
                                  <tbody>
                                  <tr>
                                    <th>NAME</th>
                                    <td>{readiness.Name}</td>
                                  </tr>
                                  {#if readiness.Type === "url"}
                                  <tr>
                                    <th>URL</th>
                                    <td><span class="badge">{readiness.URL}</span></td>
                                  </tr>
                                  <tr>
                                    <th>METHOD</th>
                                    <td><span class="badge">{readiness.Method}</span></td>
                                  </tr>
                                  <tr>
                                    <th>BODY</th>
                                    <td><span class="badge">{readiness.Body}</span></td>
                                  </tr>
                                  {:else}
                                  <tr>
                                    <th>COMMAND</th>
                                    <td>
                                      {#each readiness.Command as cmd}
                                        <span class="badge">{cmd}</span>
                                      {/each}
                                    </td>
                                  </tr>
                                  {/if}
                                  <tr>
                                    <th>TIMEOUT</th>
                                    <td>
                                      {readiness.Timeout}
                                    </td>
                                  </tr>
                                  <tr>
                                    <th>SOLVED</th>
                                    <td>
                                      {#if readiness.Solved === true}
                                        <span class="indicator-item badge badge-success">Solved ({timeSince($containersMap[containerId].General.Status.LastReadinessTimestamp)})</span>
                                      {:else}
                                        <span class="indicator-item badge badge-warning">Not solved</span>
                                      {/if}
                                    </td>
                                  </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        {/each}
                        {/if}
                      {#if $containersMap[containerId].Platform.Networks.Networks !== undefined }
                        {#each $containersMap[containerId].Platform.Networks.Networks as network }
                          <div class="card bg-base-100 shadow-xl">
                            <div class="card-body">
                              <h2 class="card-title">
                                Network
                              </h2>
                              <div>
                                <div class="overflow-x-auto">
                                  <table class="table">
                                    <tbody>
                                    <tr>
                                      <th>NAME</th>
                                      <td>{network.Reference.Name}</td>
                                    </tr>
                                    <tr>
                                      <td colspan="2" class="max-w-[120px] truncate text-ellipsis">
                                        <button
                                                class="btn btn-sm btn-outline mr-2"
                                                on:click={() => copyToClipboard(`${network.Reference.Name}.${$containersMap[containerId].Platform.GeneratedName}.cluster.private`)}>
                                          Copy
                                        </button>
                                        {network.Reference.Name}.{$containersMap[containerId].Platform.GeneratedName}.private
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colspan="2" class="max-w-[120px] truncate text-ellipsis">
                                        <button
                                                class="btn btn-sm btn-outline mr-2"
                                                on:click={() => copyToClipboard(network.Docker.NetworkId)}>
                                          Copy
                                        </button>
                                        {network.Docker.NetworkId}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th>IP</th>
                                      <td>
                                        {#if network.Docker.IP != ""}
                                          <span class="badge">{network.Docker.IP}</span>
                                        {:else}
                                          <span class="badge">Unknown</span>
                                        {/if}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th>DNS</th>
                                      <td>
                                        {#each $containersMap[containerId].Platform.Docker.DNS as dns}
                                          <span class="badge">{dns}</span>
                                        {/each}
                                      </td>
                                    </tr>
                                    {#if $containersMap[containerId].Platform.Ports.Ports !== undefined }
                                      {#each $containersMap[containerId].Platform.Ports.Ports as port }
                                        <tr>
                                          <td>
                                            <div class="mb-1"><b>PORTS</b></div>
                                            <span class="badge">{port.Container}</span>
                                            {#if port.Host != ""}
                                              :<span class="badge">{port.Host}</span>
                                            {/if}
                                          </td>
                                        </tr>
                                      {/each}
                                    {/if}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        {/each}
                      {/if}
                    </div>
                    <div class="divider"></div>
                    <div>
                      <div class="flex items-center">
                        <b>Runtime configuration</b>
                        <span class="tooltip tooltip-right ml-2" data-tip="Configuration variables can be used in templating eg. (( .name ))">
                        <span class="sr-only">Help</span> <!-- Screen reader only text -->
                        <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" stroke="#1C274C" stroke-width="1.5"/>
                          <path d="M10.125 8.875C10.125 7.83947 10.9645 7 12 7C13.0355 7 13.875 7.83947 13.875 8.875C13.875 9.56245 13.505 10.1635 12.9534 10.4899C12.478 10.7711 12 11.1977 12 11.75V13" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                          <circle cx="12" cy="16" r="1" fill="#1C274C"/>
                        </svg>
                      </span>
                      </div>
                      <ul class="list bg-base-100 rounded-box shadow-md">
                        {#each Object.entries($containersMap[containerId].General.Runtime.Configuration) as [key, value]}
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
                            <div class="text-xs uppercase font-semibold opacity-60">RUNTIME CONFIGURATION</div>
                          </div>
                          <pre class="list-col-wrap whitespace-pre-wrap break-words text-xs code-container"><code>{value}</code></pre>
                          <button class="btn btn-square btn-ghost" on:click={Preview}>
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
                    <div class="divider"></div>
                    <div>
                      <b>Environment variables</b>
                      <ul class="list bg-base-100 rounded-box shadow-md">
                      {#if $containersMap[containerId].Platform.Env != undefined}
                          {#each $containersMap[containerId].Platform.Env as env}
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
                                <div>VAR</div>
                                <div class="text-xs uppercase font-semibold opacity-60">ENVIRONMENT VARIABLE</div>
                              </div>
                              <pre class="list-col-wrap whitespace-pre-wrap break-words text-xs code-container"><code>{env}</code></pre>
                              <button class="btn btn-square btn-ghost" on:click={Preview}>
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
                        {:else}
                          <li>No environment variables defined</li>
                        {/if}
                      </ul>

                    </div>
                  </div>
                </div>

                <input
                        type="radio"
                        name="my_tabs_2"
                        role="tab"
                        class="tab"
                        aria-label="Dependencies"
                        on:change={() => handleTabChange("clear")}
                />
                <div role="tabpanel" class="tab-content rounded-box p-6">
                  <div class="flex w-full flex-col">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
                      {#if $containersMap[containerId].Platform.Definition.spec.dependencies !== undefined }
                      {#each $containersMap[containerId].Platform.Definition.spec.dependencies as dependency }
                        <div class="card bg-base-100 shadow-xl">
                          <div class="card-body">
                            <h2 class="card-title">
                              Container
                            </h2>
                            <div>
                              {#if dependency.name === "*"}
                                Depends on all containers in the group {dependency.group}
                              {:else}
                                <span class="badge">{dependency.prefix}/{dependency.group}/{dependency.name}</span>
                              {/if}
                            </div>
                          </div>
                        </div>
                      {/each}
                      {:else}
                      No container dependencies.
                      {/if}
                    </div>
                    <div class="divider"></div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
                      {#if $containersMap[containerId].General.Runtime.ObjectDependencies !== undefined && $containersMap[containerId].General.Runtime.ObjectDependencies.length > 0 }
                        {#each $containersMap[containerId].General.Runtime.ObjectDependencies as dependency }
                          <div class="card bg-base-100 shadow-xl">
                            <div class="card-body">
                              <h2 class="card-title">
                                {dependency.Elements[3]}
                              </h2>
                              <div>
                                <div class="flex">
                                  <button
                                          class="btn btn-sm btn-outline mr-2"
                                          on:click={() => copyToClipboard(`${dependency.Elements.join("/").toString()}`)}>
                                    View
                                  </button>
                                  <button
                                          class="btn btn-sm btn-outline mr-2"
                                          on:click={() => copyToClipboard(`${dependency.Elements.join("/").toString()}`)}>
                                    Copy
                                  </button>

                                </div>
                                <table class="table">
                                  <tbody>
                                  <tr>
                                    <td class="max-w-[120px] truncate text-ellipsis text-right" dir="rtl">{dependency.Elements.join("/")}</td>
                                  </tr>
                                  </tbody>
                                </table>
                                <div class="mt-5">
                                  <span class="text-sm">*Any change in the specified resource will trigger recreate of container.</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        {/each}
                      {:else}
                        No dependencies: resource or configuration.
                      {/if}
                    </div>
                  </div>
                </div>

                <input
                        type="radio"
                        name="my_tabs_2"
                        role="tab"
                        class="tab"
                        aria-label="Definition"
                        on:change={() => handleTabChange("Definition")}
                />
                <div role="tabpanel" class="tab-content rounded-box p-6">
                  <EditorModule content={editorContent} code={yaml.dump($containersMap[containerId].Platform.Definition)} language="yaml" theme="vs-light" />
                </div>

                <input
                        type="radio"
                        name="my_tabs_2"
                        role="tab"
                        class="tab"
                        aria-label="Raw"
                        on:change={() => handleTabChange("Raw")}
                />
                <div role="tabpanel" class="tab-content rounded-box p-6">
                  <EditorModule content={editorContent} code={JSON.stringify($containersMap[containerId], null, 2)} language="json" theme="vs-light" />
                </div>
              </div>
            </div>
          {/if}
        </td>
      </tr>
    {/each}
    </tbody>
  </table>
  {/if}
</div>
{/if}
</div>

<DockModule></DockModule>

<ToastModule></ToastModule>