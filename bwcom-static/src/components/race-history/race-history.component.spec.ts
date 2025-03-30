import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RaceHistoryComponent } from './race-history.component';
import { provideHttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { HelloWorldService } from 'src/services/hello-world.service';
import { WINDOW, WINDOW_PROVIDERS } from 'src/services/window.service';

describe('RaceHistoryComponent', () => {
  let component: RaceHistoryComponent;
  let fixture: ComponentFixture<RaceHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RaceHistoryComponent, CommonModule],
      providers: [provideHttpClient(), HelloWorldService, WINDOW_PROVIDERS]
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
