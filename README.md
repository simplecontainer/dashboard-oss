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

## Getting Started

To launch the dashboard locally:

```bash
# Clone example resources
git clone https://github.com/simplecontainer/examples.git

# Apply the dashboard deployment pack
smrctl apply examples/dashboard-plain --set user=$USER

# Verify running containers
smrctl ps
```

Example output:

```
NODE                    RESOURCE                                            IMAGE                                             PORTS                 ENGINE STATE      SMR STATE        
smr-dev-node-1          containers/dashboard/dashboard-dashboard-oss-1      quay.io/simplecontainer/dashboard-oss:latest      8080:3000             running (docker)  running (43s)    
smr-dev-node-1          containers/dashboard/dashboard-proxy-manager-oss-1  quay.io/simplecontainer/proxy-manager-oss:latest  5443:5443, 5480:5480  running (docker)  running (1m18s)  
```

## Deploy Authentik in front of the dashboard

```bash
# Clone example resources
git clone https://github.com/simplecontainer/examples.git

# Apply the dashboard deployment pack
smrctl apply examples/dashboard --set user=$USER

# Verify running containers
smrctl ps
```

Example output:

```
NODE                    RESOURCE                                            IMAGE                                             PORTS                 ENGINE STATE      SMR STATE        
smr-dev-node-1          containers/dashboard/dashboard-dashboard-oss-1      quay.io/simplecontainer/dashboard-oss:latest      8080:3000             running (docker)  running (43s)    
smr-dev-node-1          containers/dashboard/dashboard-proxy-manager-oss-1  quay.io/simplecontainer/proxy-manager-oss:latest  5443:5443, 5480:5480  running (docker)  running (1m18s)  
```



---

## 🔒 Security Model

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
