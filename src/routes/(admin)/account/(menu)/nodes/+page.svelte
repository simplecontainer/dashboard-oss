<script lang="ts">
  import {getContext, onMount, onDestroy} from "svelte"
  import { writable, type Writable } from "svelte/store"
  import {connection, RemoveConnection} from "../stores/connections";
  import {isEmptyObject} from "../../helpers/objects"
  import ClusterModule from "../contexts/context.module.svelte"
  import DockModule from "../dock/dock.module.svelte"
  import EmptyModule from "../skeletons/empty.module.svelte"
  import LoadingModule from "../skeletons/loading.module.svelte"
  import NoCtxModule from "../skeletons/noctx.module.svelte"
  import ToastModule from "../shared/toast.module.svelte";
  import UpgradeModule from "./upgrade.module.svelte"
  import {nodesMap, AddNode} from "../stores/nodes"
  import ConfirmationModal from "../shared/confirm.svelte";
  import {Control} from "../../types/control/control"
  import type { Node } from "../../types/node/type";
  import type {Connection} from "../../types/context/connection";
  import toastStore from '../../toasts';
  import {AddControl} from "../stores/control";

  let confirmRef: ConfirmationModal
  let confirmRefRestart: ConfirmationModal
  let confirmRefUpgrade: ConfirmationModal

  let currentImage = writable("")
  let currentTag = writable("")

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("nodes")

  let { data } = $props()
  let { clusters } = data

  let once = false
  const unsubscribe = connection.subscribe(async (c: Connection) => {
    if (isEmptyObject(c)) {
      return
    }

    if (c.GetProxyURL() !== "" && !once) {
      once = true
      LoadNodes(c)
    }
  });

  let confirm = writable(false);
  let selectedNode = writable<Node>(null);
  let control = writable(null);

  const handleConfirm = async () => {
    const image = $currentImage.split(":")

    const control = new Control(
            { node_id:  $selectedNode.NodeID } as Drain,
            null,
            null,
            new Date().toISOString()
    );

    AddControl(control)
    document.getElementById('confirm-drain-node-modal').close()
  }
  const handleConfirmRestart = async () => {
    const image = $currentImage.split(":")

    const control = new Control(
            { node_id:  $selectedNode.NodeID } as Drain,
            { image: image[0], tag: image[1] } as Upgrade,
            null,
            new Date().toISOString()
    );

    AddControl(control)
    document.getElementById('confirm-restart-node-modal').close()
  }

  const handleCancel = () => {
    document.getElementById('confirm-drain-node-modal').close()
  };
  const handleCancelRestart = () => {
    document.getElementById('confirm-restart-node-modal').close()
  };

  function ShowModal(node: Node) {
    selectedNode.set(node)
    $confirm = true
    document.getElementById('confirm-drain-node-modal').showModal()
  }
  function ShowModalRestart(node: Node) {
    selectedNode.set(node)
    $confirm = true
    document.getElementById('confirm-restart-node-modal').showModal()
  }

  function Restart(node: Node){
    ShowModalRestart(node)
  }
  function Drain(node: Node){
    ShowModal(node)
  }

  onMount(async () => {});
  onDestroy(() => {
    unsubscribe()
  })

  async function LoadNodes(c: Connection) {
    const resp = await fetch(`${c.Context.ProxyURL}/api/v1/cluster/nodes`, {
      method: 'GET',
      headers: {
        Upstream: btoa(c.Context.API).replace(/=+$/,''),
      },
    });

    const nodes = (await resp.json()).Data
    for (let node of nodes) {
      AddNode(node);
    }
  }
</script>

<svelte:head>
  <title>Nodes</title>
</svelte:head>

<div class="navbar bg-base-100">
  <div class="flex-1">
    <a href="/account/containers" class="btn btn-ghost text-xl">Nodes</a>
  </div>
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1">
      <li><a href="https://docs.simplecontainer.io/installation/running-single">Add</a></li>
      {#if $connection.State != undefined && $connection.State.WSS}
      <UpgradeModule
        currentImage={currentImage}
        currentTag={currentTag}
      ></UpgradeModule>
      {/if}
      <ClusterModule clusters={clusters}></ClusterModule>
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
  {#if Object.entries($nodesMap).length == 0}
    <EmptyModule></EmptyModule>
  {:else}
  <table class="table mt-5">
    <!-- Table Head -->
    <thead>
    <tr>
      <th>Node</th>
      <th>ID</th>
      <th>Control plane</th>
      <th>Raft</th>
      <th>Actions</th>
    </tr>
    </thead>
    <tbody>
    {#each Object.entries($nodesMap) as [key, node]}
      <tr class="{ node.State?.Control?.Upgrading == "in_progress" ? 'bg-warning' : '' }">
        <td>
          <b>
            {node.NodeName}

            {#if node.State?.Control?.Upgrading == "in_progress" }
              (Upgrading started)
            {:else}
              (<a href="https://github.com/simplecontainer/smr/releases/tag/smr-{node.Version.Node}" target="_blank" class="link">{node.Version.Node}</a>)
            {/if}
          </b>
        </td>
        <td>
          {node.NodeID}
        </td>
        <td>
          <div class="badge badge-info">
            <a>{node.API}</a>
          </div>
        </td>
        <td>
          <div class="badge badge-info">
            <a>{node.URL}</a>
          </div>
        </td>
        <td>
        <div class="flex items-center space-x-2">
          <label class="btn btn-circle" on:click={() => Restart(node)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2V6" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M8.5 3.70605C5.26806 5.07157 3 8.27099 3 12.0001C3 16.9707 7.02944 21.0001 12 21.0001C16.9706 21.0001 21 16.9707 21 12.0001C21 8.27099 18.7319 5.07157 15.5 3.70605" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </label>
          <label class="btn btn-circle" on:click={() => Drain(node)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.142 20C8.91458 20 7.80085 20 6.87114 19.4986C5.94144 18.9971 5.35117 18.0781 4.17061 16.24L3.48981 15.18C2.4966 13.6336 2 12.8604 2 12C2 11.1396 2.4966 10.3664 3.48981 8.82001L4.17061 7.76001C5.35117 5.92191 5.94144 5.00286 6.87114 4.50143C7.80085 4 8.91458 4 11.142 4L13.779 4C17.6544 4 19.5921 4 20.7961 5.17157C22 6.34315 22 8.22876 22 12C22 15.7712 22 17.6569 20.7961 18.8284C19.5921 20 17.6544 20 13.779 20H11.142Z" stroke="#1C274C" stroke-width="1.5"/>
              <path d="M15.5 9.50002L10.5 14.5M10.5 9.5L15.5 14.5" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </label>
        </div>
        </td>
      </tr>
    {/each}
    </tbody>
  </table>
  {/if}
</div>
{/if}
</div>

<dialog id="confirm-drain-node-modal" class="modal">
  <div class="modal-box">
    <h3 class="text-lg font-bold">Please confirm action?</h3>
    <ConfirmationModal
            bind:this={confirmRef}
            open={confirm}
            message="Are you sure - this will drain node and remove it from the cluster?"
            type="error"
            onConfirm={handleConfirm}
            onCancel={handleCancel}
    />
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>

<dialog id="confirm-restart-node-modal" class="modal">
  <div class="modal-box">
    <h3 class="text-lg font-bold">Please confirm action?</h3>
    <ConfirmationModal
            bind:this={confirmRefRestart}
            open={confirm}
            message="Are you sure - this will drain node and restart it?"
            type="error"
            onConfirm={handleConfirmRestart}
            onCancel={handleCancelRestart}
    />
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>

<DockModule></DockModule>
<ToastModule></ToastModule>