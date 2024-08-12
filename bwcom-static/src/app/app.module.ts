import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { WINDOW_PROVIDERS } from 'src/services/window.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { LoginComponent } from 'src/components/login/login.component';
import { provideOAuthClient } from 'angular-oauth2-oidc';

@NgModule({ 
    declarations: [
        AppComponent
    ],
    bootstrap: [AppComponent], 
    imports: [
        LoginComponent,
        BrowserModule,
        AppRoutingModule
    ], 
    providers: [
        HttpClient, 
        WINDOW_PROVIDERS, 
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimationsAsync(),
        provideOAuthClient()
    ]
})
export class AppModule { }
