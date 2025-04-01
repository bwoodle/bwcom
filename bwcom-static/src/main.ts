import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { WINDOW_PROVIDERS } from './app/services/window.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ROUTES } from './routes';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideOAuthClient(),
    WINDOW_PROVIDERS,
    provideAnimationsAsync(),
    provideRouter(ROUTES)
  ]
})