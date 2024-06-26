import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BaseTestModules } from '../../../../../../core/test-framework/core-test.helper';
import { KubernetesNodeIpsComponent } from './kubernetes-node-ips.component';

describe('KubernetesNodeIpsComponent', () => {
  let component: KubernetesNodeIpsComponent;
  let fixture: ComponentFixture<KubernetesNodeIpsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [KubernetesNodeIpsComponent],
      imports: BaseTestModules
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KubernetesNodeIpsComponent);
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
