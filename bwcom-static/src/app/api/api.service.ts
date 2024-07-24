import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { from, map, Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { WINDOW } from 'src/utils/window.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseHref = "https://bwcom-test-api.brentwoodle.com";
  constructor(private _http: HttpClient, @Inject(WINDOW) private window: Window) {

    if (window.location.hostname == "brentwoodle.com") {
      // Use the production API instead
      this.baseHref = "https://bwcom-api.brentwoodle.com";
    }
  }

  getHello(): Observable<string> {
    return this._http.get(this.baseHref + "/hello").pipe(
      map(x => x.toString())
    );
  }
}