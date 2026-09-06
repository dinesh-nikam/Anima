import { ProviderConfigurationException, UnsafeUrlException } from '../exceptions/readme.exceptions';
import { ProviderParameterSchema } from './provider.contract';

// ---------------------------------------------------------------------------
// SSRF and URL Security Constants
// ---------------------------------------------------------------------------

const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const PRIVATE_IP_HOST_RE =
  /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|::1$|localhost$|\.local$|\.internal$|\.lan$|\.corp$|metadata\.google\.internal)/i;

const CLOUD_METADATA_IPS = new Set([
  '169.254.169.254',
  'fd00:ec2::254',
  '100.100.100.200', // Alibaba Cloud
]);

const MAX_URL_LENGTH = 2048;

export class ProviderUrlBuilder {
  /**
   * Validates parameters against a provider's schema before building the URL.
   */
  static validateParameters(
    providerKey: string,
    schema: ProviderParameterSchema[],
    parameters: Record<string, unknown>,
  ): Record<string, string> {
    const validated: Record<string, string> = {};

    for (const param of schema) {
      const raw = parameters[param.name];
      if (raw === undefined || raw === null || raw === '') {
        if (param.required) {
          throw new ProviderConfigurationException(
            providerKey,
            `Missing required parameter: ${param.name}`,
          );
        }
        if (param.default !== undefined) {
          validated[param.name] = String(param.default);
        }
        continue;
      }

      const stringValue = String(raw).trim();
      if (param.maxLength && stringValue.length > param.maxLength) {
        throw new ProviderConfigurationException(
          providerKey,
          `Parameter '${param.name}' exceeds maximum length of ${param.maxLength}`,
        );
      }

      switch (param.type) {
        case 'string':
          if (param.pattern && !new RegExp(param.pattern).test(stringValue)) {
            throw new ProviderConfigurationException(
              providerKey,
              `Parameter '${param.name}' failed pattern validation (${param.pattern})`,
            );
          }
          validated[param.name] = stringValue;
          break;

        case 'username':
          if (!USERNAME_PATTERN.test(stringValue)) {
            throw new ProviderConfigurationException(
              providerKey,
              `Parameter '${param.name}' is not a valid GitHub username`,
            );
          }
          validated[param.name] = stringValue;
          break;

        case 'number': {
          const n = Number(stringValue);
          if (!Number.isFinite(n)) {
            throw new ProviderConfigurationException(
              providerKey,
              `Parameter '${param.name}' must be a finite number`,
            );
          }
          validated[param.name] = String(n);
          break;
        }

        case 'boolean': {
          const lower = stringValue.toLowerCase();
          if (lower !== 'true' && lower !== 'false') {
            throw new ProviderConfigurationException(
              providerKey,
              `Parameter '${param.name}' must be boolean (true/false)`,
            );
          }
          validated[param.name] = lower;
          break;
        }

        case 'enum': {
          if (!param.enumValues || !param.enumValues.includes(stringValue)) {
            throw new ProviderConfigurationException(
              providerKey,
              `Parameter '${param.name}' must be one of: ${(param.enumValues || []).join(', ')}`,
            );
          }
          validated[param.name] = stringValue;
          break;
        }

        default:
          throw new ProviderConfigurationException(
            providerKey,
            `Unsupported parameter type: ${param.type}`,
          );
      }
    }

    return validated;
  }

  /**
   * Safely constructs a URL from a template string and encoded parameters.
   */
  static buildUrl(
    providerKey: string,
    baseUrlTemplate: string,
    params: Record<string, string>,
  ): string {
    let url = baseUrlTemplate;

    // Direct URL passthrough template '{url}'
    if (baseUrlTemplate === '{url}' && params['url']) {
      url = params['url'];
    } else {
      for (const [key, value] of Object.entries(params)) {
        url = url.split(`{${key}}`).join(encodeURIComponent(value));
      }

      // Strip optional unfilled query placeholders e.g. &param={param}
      url = url.replace(/([/?&])([a-zA-Z0-9_]+)=\{[a-zA-Z0-9_]+\}/g, '');

      // Check if any leftover placeholders remain
      if (/\{[a-zA-Z0-9_]+\}/.test(url)) {
        throw new ProviderConfigurationException(
          providerKey,
          `URL template contains unresolved parameters: ${url}`,
        );
      }
    }

    if (url.length > MAX_URL_LENGTH) {
      throw new UnsafeUrlException(url, `URL length exceeds limit of ${MAX_URL_LENGTH}`);
    }

    return url;
  }

  /**
   * Rigorously checks URL safety, protocol, host allow-list, and SSRF targets.
   */
  static assertUrlSafety(
    providerKey: string,
    url: string,
    allowedHosts: string[],
    allowDynamicHost = false,
  ): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new UnsafeUrlException(url, 'Malformed URL');
    }

    const proto = parsed.protocol.toLowerCase();
    if (proto !== 'https:') {
      throw new UnsafeUrlException(url, `Disallowed protocol '${proto}'. Only HTTPS is permitted.`);
    }

    const host = parsed.hostname.toLowerCase();
    const cleanHost = host.replace(/^\[|\]$/g, '');

    // Reject userinfo in URL (credentials / secrets)
    if (parsed.username || parsed.password) {
      throw new UnsafeUrlException(url, 'Userinfo credentials in URL are strictly prohibited.');
    }

    // SSRF & Local network defenses
    if (PRIVATE_IP_HOST_RE.test(cleanHost) || CLOUD_METADATA_IPS.has(cleanHost)) {
      throw new UnsafeUrlException(url, `Disallowed private or local network target: ${host}`);
    }

    // Hostname allow-list verification
    if (!allowDynamicHost) {
      const lowerAllowed = allowedHosts.map((h) => h.toLowerCase());
      if (!lowerAllowed.includes(host)) {
        throw new UnsafeUrlException(
          url,
          `Host '${host}' is not in allowed hosts for provider '${providerKey}': [${lowerAllowed.join(', ')}]`,
        );
      }
    }
  }
}
