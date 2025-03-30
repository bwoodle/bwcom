import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { WINDOW_PROVIDERS } from './services/window.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Route } from '@angular/router';
import { RaceHistoryComponent } from './components/race-history/race-history.component';

if (environment.production) {
  enableProdMode();
}

export const routes: Route[] = [
  {
    path: '',
    component: RaceHistoryComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideOAuthClient(),
    WINDOW_PROVIDERS,
    provideAnimationsAsync(),
    provideRouter(routes)
  ]
})