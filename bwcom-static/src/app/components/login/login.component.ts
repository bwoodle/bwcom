import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { OAuthService } from 'angular-oauth2-oidc';

const MODULES: any[] = [CommonModule, MatFormFieldModule, FormsModule, ReactiveFormsModule];

@Component({
  selector: 'bw-login',
  standalone: true,
  imports: [MODULES],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private oAuthService = inject(OAuthService);
  public idToken: string = "";
  public accessToken: string = "";
  public email: string = "";

  constructor() {
    this.oAuthService.events.subscribe(e => {
      this.checkAuth();
    })
  }

  private checkAuth(): void {
    this.email = this.oAuthService.hasValidIdToken() ? this.oAuthService.getIdentityClaims()["email"] : "";
  }

  login() {
    this.oAuthService.initLoginFlow();
  }

  logout() {
    this.oAuthService.logOut();
  }
}