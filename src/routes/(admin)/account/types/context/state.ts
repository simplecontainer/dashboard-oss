import type {IState} from "./type";

export class State implements IState {
    WSS: boolean;
    Error: string;
    Online: boolean;
    Offline: boolean;
    Decrypted: boolean;
    Encrypted: string;

    constructor(data: Partial<IState> = {}) {
        this.WSS = data.WSS ?? false;
        this.Error = data.Error ?? "";
        this.Online = data.Online ?? false;
        this.Offline = data.Offline ?? false;
        this.Decrypted = data.Decrypted ?? false;
        this.Encrypted = data.Encrypted ?? "";
    }
}
