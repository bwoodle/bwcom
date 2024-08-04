import { Inject, Injectable } from '@angular/core';
import { WINDOW } from './window.service';

@Injectable({
  providedIn: 'root'
})
export class BaseHrefService {
  public baseHref = "https://bwcom-test-api.brentwoodle.com";
  constructor(@Inject(WINDOW) private window: Window) {
    if (window.location.hostname == "brentwoodle.com") {
      // Use the production API instead
      this.baseHref = "https://bwcom-api.brentwoodle.com";
    } else if (window.location.hostname == "localhost") {
      // Use the development API
      this.baseHref = "https://bwcom-dev-api.brentwoodle.com";
    }
  }
}