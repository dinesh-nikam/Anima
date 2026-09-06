import { ProviderRegistry } from '../../src/application/readme/providers/provider.registry';
import { DynamicProvider } from '../../src/application/readme/providers/provider.contract';

describe('DynamicProvider Contract Conformance Test Suite', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  const getAllProviders = (): DynamicProvider[] => {
    const list = registry.list(true);
    return list.map((m) => registry.getProvider(m.providerKey)!).filter(Boolean);
  };

  it('all registered providers conform to the strict DynamicProvider contract', () => {
    const providers = getAllProviders();
    expect(providers.length).toBeGreaterThanOrEqual(12);

    for (const provider of providers) {
      const meta = provider.metadata();

      // 1. Metadata contract
      expect(meta.providerKey).toBeDefined();
      expect(typeof meta.providerKey).toBe('string');
      expect(meta.name).toBeDefined();
      expect(meta.category).toBeDefined();
      expect(meta.version).toBeDefined();
      expect(typeof meta.enabled).toBe('boolean');
      expect(meta.capabilities).toBeInstanceOf(Array);
      expect(meta.capabilities.length).toBeGreaterThan(0);
      expect(meta.supportedComponents).toBeInstanceOf(Array);

      // 2. Capabilities method
      const capabilities = provider.capabilities();
      expect(capabilities).toBeInstanceOf(Array);
      expect(capabilities.length).toBeGreaterThan(0);

      // 3. validateConfiguration method
      expect(typeof provider.validateConfiguration).toBe('function');

      // 4. resolve method
      expect(typeof provider.resolve).toBe('function');
    }
  });

  it('declares valid parameter schemas across all providers', () => {
    const providers = getAllProviders();

    for (const provider of providers) {
      const meta = provider.metadata();
      for (const param of meta.configurationSchema) {
        expect(param.name).toBeDefined();
        expect(['string', 'number', 'boolean', 'enum', 'username']).toContain(param.type);
        expect(typeof param.required).toBe('boolean');
        if (param.type === 'enum') {
          expect(param.enumValues).toBeInstanceOf(Array);
          expect(param.enumValues!.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
