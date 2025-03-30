import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RaceHistoryComponent } from './race-history.component';

describe('RaceHistoryComponent', () => {
  let component: RaceHistoryComponent;
  let fixture: ComponentFixture<RaceHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RaceHistoryComponent]
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
