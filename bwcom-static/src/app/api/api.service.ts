import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'
import { map, Observable } from 'rxjs';
import { WINDOW } from 'src/utils/window.service';
import { HelloWorldApiResponse } from './models/hello-world-api-response';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseHref = "https://bwcom-test-api.brentwoodle.com";
  constructor(private _http: HttpClient, @Inject(WINDOW) private window: Window) {

    if (window.location.hostname == "brentwoodle.com") {
      // Use the production API instead
      this.baseHref = "https://bwcom-api.brentwoodle.com";
    } else if (window.location.hostname == "localhost") {
      // Use the development API
      this.baseHref = "https://bwcom-dev-api.brentwoodle.com";
    }
  }

  getHello(): Observable<string> {
    return this._http.get<HelloWorldApiResponse>(this.baseHref + "/hello").pipe(
      map(x => x.message)
    );
  }
}