import { getFullEndpointApiUrl, StratosStatus, entityCatalog } from '@stratosui/store';
import { Observable, of as observableOf } from 'rxjs';

import { EndpointIcon } from '../endpoints/endpoint-helpers';
import { MetricsEndpointProvider } from './services/metrics-service';

// Info for an endpoint that a metrics endpoint provides for
export interface MetricsEndpointInfo {
  name: string;
  icon: EndpointIcon;
  type: string;
  known: boolean;
  url: string;
  metadata: {
    metrics_job?: string;
    metrics_environment?: string;
  };
  status: Observable<StratosStatus>;
}

// Process the endpoint and Stratos marker file data to give a single list of endpoitns
// linked to this metrics endpoint, comprising those that are known in Stratos and those that are not
export function mapMetricsData(ep: MetricsEndpointProvider): MetricsEndpointInfo[] {
  const data: MetricsEndpointInfo[] = [];

  // Add all of the known endpoints first
  ep.endpoints.forEach(endpoint => {
    const catalogEndpoint = entityCatalog.getEndpoint(endpoint.cnsi_type, endpoint.sub_type);

    data.push({
      known: true,
      name: endpoint.name,
      url: getFullEndpointApiUrl(endpoint),
      type: catalogEndpoint.definition.label,
      icon: {
        name: catalogEndpoint.definition.icon,
        font: 'stratos-icons'
      },
      metadata: {
        metrics_job: endpoint.metadata ? endpoint.metadata.metrics_job : null,
        metrics_environment: endpoint.metadata ? endpoint.metadata.metrics_environment : null
      },
      status: observableOf(StratosStatus.OK)
    });
  });

  // Add all of the potentially unknown endpoints
  if (ep.provider && ep.provider.metadata && ep.provider.metadata && ep.provider.metadata.metrics_stratos
    && Array.isArray(ep.provider.metadata.metrics_stratos)) {
    ep.provider.metadata.metrics_stratos.forEach(endp => {
      // See if we already know about this endpoint
      const hasEndpoint = data.findIndex(i => compareUrl(i.url, endp.url) || compareUrl(i.url, endp.cfEndpoint)) !== -1;
      if (!hasEndpoint) {
        const catalogEndpoint = entityCatalog.getEndpoint(endp.type, '');
        if (catalogEndpoint) { // Provider metadata could give unknown endpoint
          data.push({
            known: false,
            name: '<Unregistered Endpoint>',
            url: endp.cfEndpoint || endp.url,
            type: catalogEndpoint.definition.label,
            icon: {
              name: catalogEndpoint.definition.icon,
              font: 'stratos-icons'
            },
            metadata: {
              metrics_job: endp.job
            },
            status: observableOf(StratosStatus.WARNING)
          });
        }

      }
    });
  }
  return data;
}

// Simple URL compare that ignores tailing forward slashes
function compareUrl(a: string, b: string): boolean {
  if (a && a.endsWith('/')) {
    a = a.substr(0, a.length - 1);
  }

  if (b && b.endsWith('/')) {
    b = b.substr(0, b.length - 1);
  }

  return a === b;
}
