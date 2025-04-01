import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RaceHistoryComponent } from './race-history.component';
import { provideHttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { WINDOW, WINDOW_PROVIDERS } from '../../services/window.service';
import { VersionService } from '../../services/version.service';

describe('RaceHistoryComponent', () => {
  let component: RaceHistoryComponent;
  let fixture: ComponentFixture<RaceHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RaceHistoryComponent, CommonModule],
      providers: [provideHttpClient(), VersionService, WINDOW_PROVIDERS]
    })
      .compileComponents();

    fixture = TestBed.createComponent(RaceHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
