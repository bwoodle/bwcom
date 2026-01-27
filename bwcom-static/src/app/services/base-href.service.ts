import { Inject, Injectable } from '@angular/core';
import { WINDOW } from './window.service';

@Injectable({
  providedIn: 'root'
})
export class BaseHrefService {
  public baseHref = "https://bwcom-test-api.brentwoodle.com";
  constructor(@Inject(WINDOW) private window: Window) {
    console.log(`base: ${this.window.location.hostname}`);
    if (this.window.location.hostname == "brentwoodle.com") {
      // Use the production API instead
      this.baseHref = "https://bwcom-api.brentwoodle.com";
    } else if (["localhost", "127.0.0.1"].includes(this.window.location.hostname)) {
      // Use the development API
      this.baseHref = "https://bwcom-dev-api.brentwoodle.com";
    }
  }
}