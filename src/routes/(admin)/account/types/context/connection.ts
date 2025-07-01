import { Cluster } from "./cluster";
import { Context } from "./context";
import { State } from "./state";
import type {IConnection, mTLSCPC} from "./type";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import * as pako from "pako";
import toastStore from '../../toasts';

export class Connection implements IConnection {
    Context: Context;
    State: State;

    constructor(data: Partial<IConnection> = {}) {
        this.Context = new Context(data.Context);
        this.State = new State(data.State);
    }

    SetConnected(): void  {
        this.State.WSS = true;
    }

    SetDisconnected(): void  {
        this.State.WSS = false;
    }

    SetOnline(): void {
        this.State.Online = true
        this.State.Offline = false
    }

    SetOffline(): void {
        this.State.Online = false
        this.State.Offline = true
    }

    IsEmpty(): boolean {
        return (this.Context == null || this.State == null)

        return false
    }

    IsOnline(): boolean {
        if (!this.IsEmpty() && this.State != null) {
            return this.State.Online
        }

        return false
    }

    IsConnected(): boolean {
        if (!this.IsEmpty() && this.State != null) {
            return this.State.WSS
        }

        return false
    }

    GetProxyURL(): string {
        if (!this.IsEmpty() && this.Context != null) {
            return this.Context.ProxyURL
        }

        return ""
    }

    async SetupProxy(proxyApiDomain : string, proxyDomain : string): Promise<void> {
        const bundle = this.ParsePEMBundle(this.Context.CertBundle)

        const formData = new FormData();

        formData.append("cert", bundle.cert);
        formData.append("key", bundle.key);
        formData.append("ca", bundle.ca);
        formData.append("url", this.Context.API);

        await fetchWithTimeout(`${proxyApiDomain}/proxy`, {
            method: 'POST',
            body: formData,
        }, 5000)
        .then(async (resp) => {
            if (resp.ok) {
                this.Context.SetProxy(`${proxyDomain}`);
            } else {
                throw new Error(`SetupProxy error: failed to create proxy`);
            }
        })
        .catch((err) => {
            throw new Error(`SetupProxy error: ${err instanceof Error ? err.message : String(err)}`);
        });
    }
    async Connect(): Promise<void> {
        await fetchWithTimeout(`${this.Context.ProxyURL}/version`, {
            method: 'GET',
            headers: {
                'Upstream': btoa(this.Context.API).replace(/=+$/,''),
                'Content-Type': 'application/json',
            },
        }, 10000)
        .then(async (resp) => {
            console.log(resp)
            if (resp.ok) {
                this.SetOnline()
            } else {
                this.SetOffline()
            }
        })
        .catch((err) => {
            this.SetOffline()
            throw new Error(`SetupProxy error: ${err instanceof Error ? err.message : String(err)}`);
        });
    }

    ParsePEMBundle(bundle: string): mTLSCPC {
        const keyMatch = bundle.match(/-----BEGIN EC PRIVATE KEY-----[\s\S]+?-----END EC PRIVATE KEY-----/);
        const certMatches = bundle.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);

        if (!keyMatch || !certMatches || certMatches.length < 2) {
            throw new Error('Invalid mTLS bundle: Missing required PEM blocks.');
        }

        const key = keyMatch[0];
        const cert = certMatches[0];
        const ca = certMatches.slice(1).join('\n');

        return { key, cert, ca } as mTLSCPC;
    }
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

export const fetchWithTimeout = (url: string, options: RequestInit, timeout = 5000) => {
    return Promise.race([
        fetch(url, {
            ...options,
            headers: {
                ...options.headers,
            }
        }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeout)
        ),
    ]);
};
