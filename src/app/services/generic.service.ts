import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, ReplaySubject } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class GenericService {

    endPointReplaySubject = new ReplaySubject(1);

    constructor(private http: HttpClient) {
        this.endPointReplaySubject.next(true);
    }

    get(url: string): Observable<any> {
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        });
        return this.endPointReplaySubject.pipe(mergeMap(() => this.http.get(url, { headers: headers })));
    }

    getBLOB(url: string): Observable<HttpResponse<Blob>> {
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        });
        return this.endPointReplaySubject.pipe(mergeMap(() => this.http.get(url, { headers: headers, observe: 'response', responseType: 'blob' })));
    }

    post(data: any, url: string): Observable<any> {
        let headers: HttpHeaders;
        if (data instanceof FormData) {
            headers = new HttpHeaders({
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
            });
        } else {
            headers = new HttpHeaders({
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            });
        }
        return this.endPointReplaySubject.pipe(
            mergeMap(() => this.http.post(`${url}`, data, { headers: headers }))
        );
    }

    postMultiPart(formData: any, url: string): Observable<any> {
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        });

        return this.endPointReplaySubject.pipe(
            mergeMap(() => this.http.post(`${url}`, formData, { headers: headers }))
        );
    }

    put(data: any, url: string): Observable<any> {
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        });
        return this.endPointReplaySubject.pipe(
            mergeMap(() => this.http.put(`${url}`, data, { headers: headers }))
        );
    }

    delete(url: string): Observable<any> {
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        });
        return this.endPointReplaySubject.pipe(
            mergeMap(() => this.http.delete(`${url}`, { headers: headers }))
        );
    }

}
