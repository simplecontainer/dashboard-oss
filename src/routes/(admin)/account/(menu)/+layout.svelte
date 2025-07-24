<script lang="ts">
  import "../../../../app.css"
  import { writable } from "svelte/store"
  import {onMount, setContext} from "svelte"
  import { WebsiteName } from "../../../../config"

  interface Props {
    children?: import("svelte").Snippet
  }

  let { children }: Props = $props()

  const adminSectionStore = writable("")
  setContext("adminSection", adminSectionStore)

  let adminSection: string | undefined = $state()

  adminSectionStore.subscribe((value) => {
    adminSection = value
  })

  function closeDrawer(): void {
    const adminDrawer = document.getElementById(
      "admin-drawer",
    ) as HTMLInputElement
    adminDrawer.checked = false
  }
</script>

<div class="drawer lg:drawer-open">
  <input id="admin-drawer" type="checkbox" class="drawer-toggle" />
  <div class="drawer-content bg-base-300 xs:min-width:100%">
    <div class="navbar lg:hidden">
      <div class="flex-1">
        <a class="btn btn-ghost normal-case text-xl" href="/account">{WebsiteName}</a>
      </div>
      <div class="flex-none">
        <div class="dropdown dropdown-end">
          <label for="admin-drawer" class="btn btn-ghost btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h7"
              /></svg
            >
          </label>
        </div>
      </div>
    </div>
    <div class="container bg-base-300 px-6 lg:px-12 py-3 lg:py-6 xs:max-w-none xs:w-full md:max-w-none md:w-full sm:max-w-none sm:w-full">
      {@render children?.()}
    </div>
  </div>

  <div class="drawer-side">
    <label for="admin-drawer" class="drawer-overlay"></label>
    <ul
      class="menu menu-lg p-4 w-80 min-h-full bg-base-100 lg:border-r border-gray-200 text-primary"
    >
      <li>
        <div
          class="normal-case menu-title text-xl font-bold text-primary flex flex-row"
        >
          <a href="/account" class="mr-2">
            <img src="/logo-circle.png" alt="Logo" class="w-8 h-8 rounded-full bg-white" />
          </a>

          <a href="/account" class="grow">{WebsiteName}</a>
          <label for="admin-drawer" class="lg:hidden ml-3"> &#x2715; </label>
        </div>
      </li>
      <li></li>
      <li>
          <a
            href="/account/contexts"
            class={adminSection === "contexts" ? "active" : ""}
            onclick={closeDrawer}
          > Contexts
          </a>
      </li>
      <li>
        <a
          href="/account/nodes"
          class={adminSection === "nodes" ? "active" : ""}
          onclick={closeDrawer}
        > Nodes
        </a>
      </li>
      <li>
        <a
          href="/account/gitops"
          class={adminSection === "gitops" ? "active" : ""}
          onclick={closeDrawer}
        > GitOps
        </a>
      </li>
      <li>
        <a
          href="/account/containers"
          class={adminSection === "containers" ? "active" : ""}
          onclick={closeDrawer}
        > Containers
        </a>
      </li>
      <li>
        <a
          href="/account/resources"
          class={adminSection === "resources" ? "active" : ""}
          onclick={closeDrawer}
        > Resources
        </a>
      </li>
      <li>
        <a
          href="/account/configurations"
          class={adminSection === "configurations" ? "active" : ""}
          onclick={closeDrawer}
        > Configurations
        </a>
      </li>
      <li>
        <a
          href="/account/secrets"
          class={adminSection === "secrets" ? "active" : ""}
          onclick={closeDrawer}
        > Secrets
        </a>
      </li>
      <li>
        <a
          href="/account/certkeys"
          class={adminSection === "certkeys" ? "active" : ""}
          onclick={closeDrawer}
        > CertKeys
        </a>
      </li>
      <li>
        <a
          href="/account/httpauths"
          class={adminSection === "httpauths" ? "active" : ""}
          onclick={closeDrawer}
        > HttpAuths
        </a>
      </li>
      <li></li>
      <li>
        <a
                href="https://docs.simplecontainer.io"
                target="_blank"
        >
          Docs
        </a>
      </li>
      <li>
        <a
          href="https://app.simplecontainer.io"
          onclick={closeDrawer}
        >
          Try managed?
        </a>
      </li>
    </ul>
  </div>
</div>
