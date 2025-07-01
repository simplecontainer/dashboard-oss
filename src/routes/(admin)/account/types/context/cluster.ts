import type {ICluster, IRCluster} from "./type";
import type { Organization } from "./organizations"

export class Cluster implements ICluster {
    Id: string;
    Name: string;
    EncryptedContext: string;
    API: string;
    Organization: Organization | undefined;

    constructor(data: Partial<ICluster> = {}) {
        this.Id = data.Id ?? "";
        this.Name = data.Name ?? "";
        this.EncryptedContext = data.EncryptedContext ?? "";
        this.API = data.API ?? "";
        this.Organization = data.Organization;
    }

    Parse(data: Partial<IRCluster> = {}) {
        this.Id = data.id ?? "";
        this.Name = data.name ?? "";
        this.EncryptedContext = data.context_encrypted ?? "";
        this.API = data.api ?? "";
        this.Organization = data.organization;
    }
}
