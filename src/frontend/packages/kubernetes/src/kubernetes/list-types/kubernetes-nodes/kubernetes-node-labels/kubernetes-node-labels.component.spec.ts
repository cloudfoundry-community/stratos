import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BaseTestModules } from '../../../../../../core/test-framework/core-test.helper';
import { KubernetesNodeLabelsComponent } from './kubernetes-node-labels.component';

describe('KubernetesNodeLabelsComponent', () => {
  let component: KubernetesNodeLabelsComponent;
  let fixture: ComponentFixture<KubernetesNodeLabelsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [KubernetesNodeLabelsComponent],
      imports: BaseTestModules
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KubernetesNodeLabelsComponent);
    component = fixture.componentInstance;
    component.row = {
      metadata: {
        labels: {},
        namespace: 'test',
        name: 'test',
        uid: 'test'
      },
      status: {
        conditions: [],
        addresses: [],
        images: []
      },
      spec: {
        containers: [],
        nodeName: 'test',
        schedulerName: 'test',
        initContainers: [],
        readinessGates: []
      }
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
