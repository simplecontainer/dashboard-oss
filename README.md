# Simplecontainer Dashboard

The **Simplecontainer Dashboard** is a lightweight web UI for managing Simplecontainer nodes. It connects directly to the control-plane API and offers a visual interface for inspecting and interacting with system resources.

> ⚠️ **Note:** The dashboard provides essential capabilities for visualization and management. For complete control over resources, use the CLI tool: `smrctl`.

---

## Features

* Real-time visualization of all active resources
* GitOps visualization using the app-of-apps pattern
* GitOps controls: `refresh`, `sync`, `delete`
* Container controls: `restart`, `delete`
* Built-in editor for applying resource manifests from the UI

---

## How to run?
Dashboard comes as container package (Pack) that makes running it easy. You can use the already available Dashboard pack to install it and run it directly on the Simplecontainer node.

### Localhost
Add these to /etc/hosts file:

```
127.0.0.1 authentik.dashboard.localhost
127.0.0.1 proxy.dashboard.localhost
127.0.0.1 api.dashboard.localhost
127.0.0.1 dashboard.localhost
```

After that run:

```
git clone https://github.com/simplecontainer/dashboard-pack.git
mkcert dashboard.localhost proxy.dashboard.localhost api.dashboard.localhost authentik.dashboard.localhost
smrctl apply dashboard-pack --set user=$USER --set traefik.certificate="$(cat dashboard.localhost+3.pem)" --set traefik.key="$(cat dashboard.localhost+3-key.pem)"
```

That's it. This pack runs:

- Authentik
- Postgres
- Traefik
- Dashboard
- Proxy-manager

- Just access https://dashboard.locahost and you should see the login form.

> [!IMPORTANT]
> ⚠️️ Authentik user needs to be setup first. Visit https://authentik.dashboard.localhost/if/flows/initial-setup to create an admin user.

After applying dashboard pack, success of the deployment can be verified:

```
smrctl ps
NODE                    RESOURCE                                            IMAGE                                                      PORTS                 ENGINE STATE      SMR STATE     
smr-development-node-1  containers/authentik/authentik-authentik-worker-1   ghcr.io/goauthentik/server:latest (pulled)                 -                     running (docker)  running (1s)  
smr-development-node-1  containers/authentik/authentik-authentik-1          ghcr.io/goauthentik/server:latest (pulled)                 9000                  running (docker)  running (1s)  
smr-development-node-1  containers/authentik/authentik-pg-1                 postgres:15 (pulled)                                       -                     running (docker)  running (1s)  
smr-development-node-1  containers/authentik/authentik-redis-1              redis:alpine (pulled)                                      -                     running (docker)  running (1s)  
smr-development-node-1  containers/dashboard/dashboard-dashboard-oss-1      quay.io/simplecontainer/dashboard-oss:latest (pulled)      3000                  running (docker)  running (1s)  
smr-development-node-1  containers/dashboard/dashboard-proxy-manager-oss-1  quay.io/simplecontainer/proxy-manager-oss:latest (pulled)  5443, 5480            running (docker)  running (1s)  
smr-development-node-1  containers/traefik/traefik-traefik-1                traefik:v3.5.0 (pulled)                                    80:80, 443:443, 8080  running (docker)  running (1s)  
```

## Security Model

* The dashboard **does not implement built-in authentication**.
* It mounts the host's `~/.smrctl` directory inside the container, making all available contexts accessible.
* When exposing the dashboard publicly, **you must secure it** using an external authentication layer (e.g., reverse proxy with basic auth or OAuth).

The dashboard communicates through the **Proxy Manager**, which:

* Accepts user contexts from the dashboard
* Establishes secure, mTLS-encrypted connections to target nodes

This design maintains Simplecontainer's strong security guarantees while enabling browser compatibility.

---

## User Interface

**Containers View**
Real-time listing of running containers using WebSocket updates:

![Container Listing](.github/resources/dashboard-containers.png)

**GitOps View**
Graphical representation of GitOps deployments:

![GitOps View](.github/resources/dashboard-gitops.png)

---

## How It Works

1. **No native authentication** — relies on external protection if hosted
2. **Context mount** — shares `~/.smrctl` with the dashboard container
3. **Proxy Manager** — handles TLS certs and reverse proxy creation
4. **WebSocket integration** — live updates for containers and GitOps views

---

For advanced usage, refer to the [Simplecontainer documentation](https://docs.simplecontainer.io) or the [dashboard examples repo](https://github.com/simplecontainer/examples).
