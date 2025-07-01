import type {IContext, IRContext} from "./type";

export class Context implements IContext {
    ProxyURL: string;
    Directory: string;
    API: string;
    Name: string;
    CertBundle: string;
    PKCS12: string;

    constructor(data: Partial<IContext> = {}) {
        this.ProxyURL = data.ProxyURL ?? "";
        this.Directory = data.Directory ?? "";
        this.API = data.API ?? "";
        this.Name = data.Name ?? "";
        this.CertBundle = data.CertBundle ?? "";
        this.PKCS12 = data.PKCS12 ?? "";
    }

    SetProxy(URL: string): void {
        this.ProxyURL = URL
    }

    Parse(data: Partial<IRContext> = {}): void {
        this.API = data.APIURL ?? "";
        this.Name = data.Name ?? "";
        this.CertBundle = data.Credentials.CertBundle ?? "";
    }
}
