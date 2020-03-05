import {Observable, OperatorFunction, Subscriber} from 'rxjs';

export const statusOperator =
    <T>(wait: (x: T) => boolean, status: (x: T) => Observable<T>): OperatorFunction<T, T> =>
        (source: Observable<T>): Observable<T> =>
            Observable.create((subscriber: Subscriber<T>) => {
                let processing = 0;
                let complete = false;
                const subscription = source.subscribe(
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    async (value) => {
                        try {
                            processing++;
                            let state = value;
                            while (wait(state)) {
                                state = await status(state).toPromise();
                            }
                            if (!subscriber.closed) {
                                subscriber.next(state);
                            }
                        } catch (e) {
                            subscriber.error(e);
                        } finally {
                            processing--;
                            if (!processing && complete) {
                                subscriber.complete();
                            }
                        }
                    },
                    (e) => subscriber.error(e),
                    () => {
                        if (!processing) {
                            subscriber.complete();
                        } else {
                            complete = true;
                        }
                    },
                );
                return () => {
                    subscription.unsubscribe();
                };
            });
