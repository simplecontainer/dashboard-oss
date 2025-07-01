
export interface IConnection {
    Context: IContext,
    State: IState,

    IsEmpty():boolean;
    IsOnline():boolean;
    IsConnected():boolean;

    SetConnected(): void;
    SetDisconnected(): void;
    SetOnline(): void;
    SetOffline(): void;

    SetupProxy(): Promise<void>;
    Connect(): Promise<void>;

    ParsePEMBundle(bundle: string): mTLSCPC;

    GetProxyURL(): string;
}

export interface IContext {
    ProxyURL: string;
    Directory: string;
    API: string;
    Name: string;
    CertBundle: string;
    PKCS12: string;
}

export interface IRContext {
    Name: string;
    APIURL: string;
    Credentials: {
        PrivateKey: Record<string, unknown>;
        Cert: Record<string, unknown>;
        Ca: Record<string, unknown>;
        CertBundle: string;
    };
};

export interface IState {
    WSS: boolean,
    Online: boolean,
    Offline: boolean,
    Error: string,
    Decrypted: boolean,
    Encrypted: string,
}

export interface mTLSCPC {
    key: string;
    cert: string;
    ca: string;
}
