import {retryBackoff} from 'backoff-rxjs';
import * as request from 'request-promise-native';
import {Observable, of, Subscriber} from 'rxjs';
import {catchError, mergeMap, tap} from 'rxjs/operators';

export type RequestOptions = Partial<request.Options>;
export type RequestMessage = {
    uri: string;
    request: Partial<request.Options>;
    resolve: (value?: {} | PromiseLike<{}>) => void;
    reject: (reason?: any) => void;
};

export class RequestPool {

    private subscriber: Subscriber<RequestMessage>;
    private err: Error;

    public constructor(concurrency = 5, retry = 5, logResponse = false) {
        new Observable<RequestMessage>((subscriber) => {
            this.subscriber = subscriber;
        })
            .pipe(
                mergeMap(
                    (requestMessage) =>
                        of(requestMessage).pipe(
                            mergeMap((r) => request(r.uri, r.request)),
                            retryBackoff({
                                initialInterval: 100,
                                maxRetries: retry,
                            }),
                            tap(requestMessage.resolve),
                            catchError((err) => {
                                requestMessage.reject(err);
                                return of(err);
                            }),
                        ),
                    concurrency,
                ),
            )
            .subscribe(
                (response) => {
                    if (logResponse) {
                        // eslint-disable-next-line no-console
                        console.log(response);
                    }
                },
                (e) => {
                    this.err = e;
                },
                () => {
                    this.err = new Error(
                        'Request stream is closed, please instantiate a new one',
                    );
                },
            );
    }

    public post(uri: string, options: Partial<request.Options> = {}) {
        return this.request(uri, {...options, method: 'POST'});
    }

    public get(uri: string, options: Partial<request.Options> = {}) {
        return this.request(uri, {...options, method: 'GET'});
    }

    public put(uri: string, options: Partial<request.Options> = {}) {
        return this.request(uri, {...options, method: 'PUT'});
    }

    public patch(uri: string, options: Partial<request.Options> = {}) {
        return this.request(uri, {...options, method: 'PATCH'});
    }

    public request<T>(uri: string, options: Partial<request.Options>): Promise<T> {

        if (this.err) {
            return Promise.reject(this.err);
        }

        return new Promise((resolve, reject) => {
            this.subscriber.next({
                uri,
                resolve,
                reject,
                request: options,
            });
        });

    }

}
