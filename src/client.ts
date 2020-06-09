import {from, iif, Observable, of, throwError, timer} from 'rxjs';
import {filter, map, mergeMap, pluck, toArray} from 'rxjs/operators';
import {moreOperator} from './lib/more';
import {RequestOptions, RequestPool} from './lib/requestPool';
import {statusOperator} from './lib/status';
import {SObject, SObjectDescription, SObjectMetaSummary} from './salesforce';
import * as path from "path";
import {readJSON} from "fs-extra";

export type AuthRequest = {
    grant_type: string;
    client_id: string;
    client_secret: string;
    username: string;
    password: string;
    auth: SfdxAuth;
};

export type AuthResponse = {
    access_token: string;
    instance_url: string;
    id: string;
    token_type: string;
    issued_at: Date;
    signature: string;
};

export type SfdxAuthResult = {
    result: SfdxAuth;
    status: number;
};

export type SfdxAuth = {
    orgId: string;
    username: string;
    accessToken: string;
    instanceUrl: string;
    refreshToken: string;
    loginUrl: string;
    clientId: string;
};

export const PROD = 'login';
export const SANDBOX = 'test';
export type PROD = typeof PROD;
export type SANDBOX = typeof SANDBOX;

type SObjectDescriptionMap = {
    [key in string]: {
        fields: {
            name: string;
            compoundFieldName: string;
            calculatedFormula: string;
            type: string;
        }[];
    }
};

const version = '45.0';
const data = 'services/data';
const async = 'services/async';

const request = new RequestPool(10, 10);

const urlTemplates = {
    login: (sf: PROD | SANDBOX | string) => {
        switch (sf) {
            case PROD:
            case SANDBOX:
                return `https://${sf}.salesforce.com/services/oauth2/token`;
            default:
                return `${sf}/services/oauth2/token`;
        }
    },
    limits: (instance: string) => `${instance}/${data}/v${version}/limits`,
    sobjects: (instance: string) => `${instance}/${data}/v${version}/sobjects`,
    sobject: (instance: string, name: string) =>
        `${instance}/${data}/v${version}/sobjects/${name}`,
    sobjectDescription: (instance: string, name: string) =>
        `${instance}/${data}/v${version}/sobjects/${name}/describe`,
    query: (instance: string) => `${instance}/${data}/v${version}/query`,
    create: (instance: string, object: string) =>
        `${instance}/${data}/v${version}/sobjects/${object}`,
    update: (instance: string, object: string, id: string) =>
        `${instance}/${data}/v${version}/sobjects/${object}/${id}`,
    job: (instance: string) => `${instance}/${async}/${version}/job`,
    jobs: (instance: string) => `${instance}/${data}/v${version}/jobs/ingest`,
    closeJob: (instance: string, jobId: string) =>
        `${instance}/${async}/${version}/job/${jobId}`,
    bulk: (instance: string, jobId: string) =>
        `${instance}/${async}/${version}/job/${jobId}/batch`,
    bulkStatus: (instance: string, jobId: string, batchId: string) =>
        `${instance}/${async}/${version}/job/${jobId}/batch/${batchId}`,
    bulkResult: (instance: string, jobId: string, batchId: string) =>
        `${instance}/${async}/${version}/job/${jobId}/batch/${batchId}/result`,
    bulkResults: (
        instance: string,
        jobId: string,
        batchId: string,
        resultId: string,
    ) =>
        `${instance}/${async}/${version}/job/${jobId}/batch/${batchId}/result/${resultId}`,
};

const requestDefault = (auth: AuthResponse): RequestOptions => ({
    // jar: true,
    headers: {
        'accept': 'application/json',
        'Authorization': `${auth.token_type} ${auth.access_token}`,
        'X-SFDC-Session': `${auth.token_type} ${auth.access_token}`,
    },
});

const toJSON = (x: string) => JSON.parse(x);

const buildQuery = (object: string, fields: string[], filterStr?: string) =>
    `SELECT ${fields.join(',')} FROM ${object}${
        filterStr ? ` WHERE ${filterStr}` : ''
    }`;

export class SalesforceClient {

    private readonly auth: Observable<AuthResponse>;
    private meta: Observable<SObjectDescriptionMap>;

    public constructor(authRequest: Partial<AuthRequest>, metaSrc = './meta.json', sf: PROD | SANDBOX | string = PROD) {
        if (authRequest.auth) {
            this.auth = of<AuthResponse>({
                access_token: authRequest.auth.accessToken,
                id: authRequest.auth.orgId,
                instance_url: authRequest.auth.instanceUrl,
                issued_at: new Date(),
                token_type: 'Bearer',
                signature: '',
            });
        } else {
            this.auth = from(
                request.post(urlTemplates.login(sf), {
                    // jar: true,
                    form: authRequest,
                    headers: {
                        Accept: 'application/json',
                    },
                }),
            ).pipe(map(toJSON));
        }

        this.meta = from(readJSON(metaSrc) as Promise<SObjectDescriptionMap>);

    }

    public getAuth(): Observable<AuthResponse> {
        return this.auth;
    }

    public getObjects(): Observable<{ sobjects: SObjectMetaSummary[] }> {
        return this.getAuth().pipe(
            mergeMap((auth) =>
                from(
                    request.get(
                        urlTemplates.sobjects(auth.instance_url),
                        requestDefault(auth),
                    ),
                ).pipe(map(toJSON)),
            ),
        );
    }

    public getObject<T extends SObject>(name: string): Observable<T> {
        return this.auth.pipe(
            mergeMap((auth) =>
                from(
                    request.get(
                        urlTemplates.sobject(auth.instance_url, name),
                        requestDefault(auth),
                    ),
                ).pipe(map(toJSON)),
            ),
        );
    }

    public getObjectDescription(name: string): Observable<SObjectDescription> {
        return this.auth.pipe(
            mergeMap((auth) =>
                from(
                    request.get(
                        urlTemplates.sobjectDescription(
                            auth.instance_url,
                            name,
                        ),
                        requestDefault(auth),
                    ),
                ).pipe(map(toJSON)),
            ),
        );
    }

    public objectRecordCount(object: string): Observable<number> {
        return this.rawQuery(`SELECT Count(Id) FROM ${object}`).pipe(
            mergeMap((x) => of(x[0].expr0)),
        );
    }

    public query(
        object: string,
        filterStr: string | null,
        ...fields: string[]
    ) {
        return iif(
            () => fields.length === 1 && fields[0] === '*',
            this.getAllFields(object).pipe(
                pluck('name'),
                toArray(),
            ),
            of(fields),
        ).pipe(
            mergeMap((objFields) =>
                this.rawQuery(buildQuery(object, objFields, filterStr)),
            ),
        );
    }

    public create<T extends SObject>(object: string, fields: Partial<Omit<T, 'Id'>>) {
        return this.auth.pipe(
            mergeMap((auth) =>
                of(`${urlTemplates.create(auth.instance_url, object)}`).pipe(
                    mergeMap((createUri) =>
                        request.post(createUri, {
                            ...requestDefault(auth),
                            json: fields,
                        }),
                    ),
                ),
            ),
        );
    }

    public update<T extends SObject>(object: string, {Id, ...fields}: T) {
        return this.auth.pipe(
            mergeMap((auth) =>
                of(`${urlTemplates.update(auth.instance_url, object, Id)}`).pipe(
                    mergeMap((updateUri) =>
                        request.patch(updateUri, {
                            ...requestDefault(auth),
                            json: fields,
                        })
                    ),
                ),
            ),
        );
    }

    public rawQuery(query: string) {
        return this.auth.pipe(
            mergeMap((auth) =>
                of(`${urlTemplates.query(auth.instance_url)}/?q=${query}`).pipe(
                    mergeMap((queryUri) =>
                        request.get(queryUri, requestDefault(auth)),
                    ),
                    map(toJSON),
                    moreOperator(
                        (queryResponse) => !queryResponse.done,
                        (queryResponse) =>
                            of(
                                `${auth.instance_url}/${
                                    queryResponse.nextRecordsUrl
                                }`,
                            ).pipe(
                                mergeMap((moreUri) =>
                                    request.get(moreUri, requestDefault(auth)),
                                ),
                                map(toJSON),
                            ),
                    ),
                ),
            ),
            map((x) => x.records),
        );
    }

    public limits() {
        return this.auth.pipe(
            mergeMap((auth) =>
                request.get(
                    urlTemplates.limits(auth.instance_url),
                    requestDefault(auth),
                ),
            ),
            map(toJSON),
        );
    }

    public queryBulk(
        object: string,
        queryFilter: string | null,
        chunkSize = 2000,
        ...fields: string[]
    ) {
        return this.auth.pipe(
            mergeMap((auth) =>
                of(urlTemplates.job(auth.instance_url)).pipe(
                    mergeMap((jobUri) =>
                        request.post(jobUri, {
                            ...requestDefault(auth),
                            headers: {
                                ...requestDefault(auth).headers,
                                'Sforce-Enable-PKChunking': `chunkSize=${chunkSize}`,
                            },
                            json: {
                                contentType: 'JSON',
                                object,
                                operation: 'query',
                            },
                        }),
                    ),
                    mergeMap((job: any) =>
                        iif(
                            () => fields.length === 1 && fields[0] === '*',
                            this.getAllFields(object).pipe(
                                filter((x) => {
                                    switch (x.type) {
                                        case 'location':
                                        case 'address':
                                            return false;
                                        default:
                                            return true;
                                    }
                                }),
                                pluck('name'),
                                toArray(),
                            ),
                            of(fields),
                        ).pipe(
                            mergeMap((queryFields) =>
                                of(
                                    urlTemplates.bulk(auth.instance_url, job.id),
                                ).pipe(
                                    mergeMap((bulkUrk) =>
                                        request.post(bulkUrk, {
                                            ...requestDefault(auth),
                                            body: buildQuery(
                                                object,
                                                queryFields,
                                                queryFilter,
                                            ),
                                        }),
                                    ),
                                    map(toJSON),
                                    statusOperator(
                                        (status) =>
                                            status.state === 'Open' ||
                                            status.state === 'Queued' ||
                                            status.state === 'InProgress',
                                        (status) =>
                                            timer(1000).pipe(
                                                mergeMap(() =>
                                                    from(
                                                        request.get(
                                                            urlTemplates.bulkStatus(
                                                                auth.instance_url,
                                                                status.jobId,
                                                                status.id,
                                                            ),
                                                            requestDefault(auth),
                                                        ),
                                                    ).pipe(map(toJSON)),
                                                ),
                                            ),
                                    ),
                                    mergeMap((status: any) =>
                                        iif(
                                            () => status.state === 'Failed',
                                            throwError(status.stateMessage),
                                            of(
                                                urlTemplates.bulk(
                                                    auth.instance_url,
                                                    status.jobId,
                                                ),
                                            ).pipe(
                                                mergeMap((bulkUrk) =>
                                                    request.get(
                                                        bulkUrk,
                                                        requestDefault(auth),
                                                    ),
                                                ),
                                                map(toJSON),
                                            ),
                                        ),
                                    ),
                                    mergeMap((bulkResponse) =>
                                        this.closeJob(job.id).pipe(
                                            mergeMap(() => bulkResponse.batchInfo as any[]),
                                        ),
                                    ),
                                    statusOperator(
                                        (status) =>
                                            status.state === 'Open' ||
                                            status.state === 'Queued' ||
                                            status.state === 'InProgress',
                                        (status) =>
                                            timer(1000).pipe(
                                                mergeMap(() =>
                                                    from(
                                                        request.get(
                                                            urlTemplates.bulkStatus(
                                                                auth.instance_url,
                                                                status.jobId,
                                                                status.id,
                                                            ),
                                                            requestDefault(auth),
                                                        ),
                                                    ).pipe(map(toJSON)),
                                                ),
                                            ),
                                    ),
                                    mergeMap((status) =>
                                        iif(
                                            () => status.state === 'Failed',
                                            throwError(status.stateMessage),
                                            // if no records were processed return empty array
                                            iif(
                                                () =>
                                                    status.numberRecordsProcessed ===
                                                    0,
                                                of(null),
                                                of(
                                                    urlTemplates.bulkResult(
                                                        auth.instance_url,
                                                        status.jobId,
                                                        status.id,
                                                    ),
                                                ).pipe(
                                                    mergeMap((resultUri) =>
                                                        request.get(
                                                            resultUri,
                                                            requestDefault(auth),
                                                        ),
                                                    ),
                                                    map(toJSON),
                                                    mergeMap(
                                                        (results: string[]) =>
                                                            from(results),
                                                    ),
                                                    mergeMap((result) =>
                                                        of(
                                                            urlTemplates.bulkResults(
                                                                auth.instance_url,
                                                                status.jobId,
                                                                status.id,
                                                                result,
                                                            ),
                                                        ).pipe(
                                                            mergeMap(
                                                                (resultUri) =>
                                                                    request.get(
                                                                        resultUri,
                                                                        requestDefault(
                                                                            auth,
                                                                        ),
                                                                    ),
                                                                1,
                                                            ),
                                                            map(toJSON),
                                                        ),
                                                    ),
                                                ),
                                            ),
                                        ),
                                    ),
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        );
    }

    public getJobs() {
        return this.auth.pipe(
            mergeMap((auth) =>
                of(urlTemplates.jobs(auth.instance_url)).pipe(
                    mergeMap((jobsUri) =>
                        request.get(jobsUri, requestDefault(auth)),
                    ),
                    map(toJSON),
                    moreOperator(
                        (jobs) => !jobs.done,
                        (jobs) =>
                            of(
                                `${auth.instance_url}/${jobs.nextRecordsUrl}`,
                            ).pipe(
                                mergeMap((moreUri) =>
                                    request.get(moreUri, requestDefault(auth)),
                                ),
                                map(toJSON),
                            ),
                    ),
                    map((x) => x.records),
                ),
            ),
        );
    }

    public closeJob(jobId: string) {
        return this.auth.pipe(
            mergeMap((auth) =>
                of(urlTemplates.closeJob(auth.instance_url, jobId)).pipe(
                    mergeMap((closeUri) =>
                        request.post(closeUri, {
                            ...requestDefault(auth),
                            json: {state: 'Closed'},
                        }),
                    ),
                ),
            ),
        );
    }

    private getAllFields(object: string) {
        return this.meta.pipe(mergeMap((meta) => meta[object].fields));
    }
}
