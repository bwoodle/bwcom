import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'
import { map, Observable } from 'rxjs';
import { HelloWorldApiResponse } from 'src/models/hello-world-api-response';
import { BaseHrefService } from './base-href.service';

@Injectable({
  providedIn: 'root'
})
export class HelloWorldService {
  constructor(private http: HttpClient, private baseHrefService: BaseHrefService) { }

  public getHello(): Observable<string> {
    return this.http.get<HelloWorldApiResponse>(this.baseHrefService.baseHref + "/hello").pipe(
      map(x => x.message)
    );
  }

}