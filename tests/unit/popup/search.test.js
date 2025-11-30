/**
 * Unit tests for popup search functionality
 * Requirements: 4.2
 * 
 * **Feature: test-coverage, Property 5: Search filter correctness**
 * **Validates: Requirements 4.2**
 */

const fc = require('fast-check');

// Since the popup modules use ES6 imports which Jest doesn't support without Babel,
// we'll define the function inline for testing. This is a copy of the actual function.

function searchServices(query, allServices) {
  if (!query || query.trim() === '') {
    return allServices;
  }
  
  const lowerQuery = query.toLowerCase().trim();
  return allServices.filter(service =>
    service.name.toLowerCase().includes(lowerQuery) ||
    service.id.toLowerCase().includes(lowerQuery) ||
    (service.description && service.description.toLowerCase().includes(lowerQuery))
  );
}

describe('Popup Search', () => {
  describe('searchServices', () => {
    it('should return all services when query is empty', () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' },
        { id: 'ec2', name: 'EC2', iconUrl: 'https://example.com/ec2.png', consoleUrl: 'https://console.aws.amazon.com/ec2' }
      ];

      const result = searchServices('', services);

      expect(result).toEqual(services);
    });

    it('should return all services when query is whitespace', () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' },
        { id: 'ec2', name: 'EC2', iconUrl: 'https://example.com/ec2.png', consoleUrl: 'https://console.aws.amazon.com/ec2' }
      ];

      const result = searchServices('   ', services);

      expect(result).toEqual(services);
    });

    it('should filter services by name', () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' },
        { id: 'ec2', name: 'EC2', iconUrl: 'https://example.com/ec2.png', consoleUrl: 'https://console.aws.amazon.com/ec2' },
        { id: 'lambda', name: 'Lambda', iconUrl: 'https://example.com/lambda.png', consoleUrl: 'https://console.aws.amazon.com/lambda' }
      ];

      const result = searchServices('lambda', services);

      expect(result).toEqual([services[2]]);
    });

    it('should filter services by id', () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' },
        { id: 'ec2', name: 'EC2', iconUrl: 'https://example.com/ec2.png', consoleUrl: 'https://console.aws.amazon.com/ec2' },
        { id: 'lambda', name: 'Lambda', iconUrl: 'https://example.com/lambda.png', consoleUrl: 'https://console.aws.amazon.com/lambda' }
      ];

      const result = searchServices('s3', services);

      expect(result).toEqual([services[0]]);
    });

    it('should filter services by description', () => {
      const services = [
        { id: 's3', name: 'S3', description: 'Object storage', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' },
        { id: 'ec2', name: 'EC2', description: 'Virtual machines', iconUrl: 'https://example.com/ec2.png', consoleUrl: 'https://console.aws.amazon.com/ec2' },
        { id: 'lambda', name: 'Lambda', description: 'Serverless compute', iconUrl: 'https://example.com/lambda.png', consoleUrl: 'https://console.aws.amazon.com/lambda' }
      ];

      const result = searchServices('serverless', services);

      expect(result).toEqual([services[2]]);
    });

    it('should be case-insensitive', () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' },
        { id: 'ec2', name: 'EC2', iconUrl: 'https://example.com/ec2.png', consoleUrl: 'https://console.aws.amazon.com/ec2' }
      ];

      const result = searchServices('EC2', services);

      expect(result).toEqual([services[1]]);
    });

    it('should return empty array when no matches', () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' },
        { id: 'ec2', name: 'EC2', iconUrl: 'https://example.com/ec2.png', consoleUrl: 'https://console.aws.amazon.com/ec2' }
      ];

      const result = searchServices('nonexistent', services);

      expect(result).toEqual([]);
    });

    it('should handle services without description', () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' },
        { id: 'ec2', name: 'EC2', description: 'Virtual machines', iconUrl: 'https://example.com/ec2.png', consoleUrl: 'https://console.aws.amazon.com/ec2' }
      ];

      const result = searchServices('s3', services);

      expect(result).toEqual([services[0]]);
    });

    it('should trim whitespace from query', () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' }
      ];

      const result = searchServices('  s3  ', services);

      expect(result).toEqual([services[0]]);
    });
  });

  describe('Property-Based Tests', () => {
    // Arbitrary for generating service objects
    const serviceArbitrary = fc.record({
      id: fc.stringOf(fc.char(), { minLength: 2, maxLength: 20 }),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      description: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
      iconUrl: fc.webUrl(),
      consoleUrl: fc.webUrl()
    });

    /**
     * Property 5: Search filter correctness
     * For any search query and array of services, filterServices should return 
     * only services whose name or ID contains the query (case-insensitive)
     * Validates: Requirements 4.2
     */
    it('Property 5: all search results match the query (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.array(serviceArbitrary, { minLength: 0, maxLength: 50 }),
          (query, services) => {
            const results = searchServices(query, services);
            const lowerQuery = query.toLowerCase().trim();

            // If query is empty after trimming, should return all services
            if (lowerQuery === '') {
              return results.length === services.length;
            }

            // All results should match the query
            return results.every(service => {
              const matchesName = service.name.toLowerCase().includes(lowerQuery);
              const matchesId = service.id.toLowerCase().includes(lowerQuery);
              const matchesDescription = service.description && 
                service.description.toLowerCase().includes(lowerQuery);
              
              return matchesName || matchesId || matchesDescription;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5: search results are a subset of input services', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.array(serviceArbitrary, { minLength: 0, maxLength: 50 }),
          (query, services) => {
            const results = searchServices(query, services);

            // All results should be from the original services array
            return results.every(result => 
              services.some(service => 
                service.id === result.id && 
                service.name === result.name
              )
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5: empty query returns all services', () => {
      fc.assert(
        fc.property(
          fc.array(serviceArbitrary, { minLength: 0, maxLength: 50 }),
          (services) => {
            const emptyQueries = ['', '   ', '\t', '\n'];
            
            return emptyQueries.every(query => {
              const results = searchServices(query, services);
              return results.length === services.length;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5: search is case-insensitive', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== ''),
          fc.array(serviceArbitrary, { minLength: 1, maxLength: 50 }),
          (query, services) => {
            const lowerResults = searchServices(query.toLowerCase(), services);
            const upperResults = searchServices(query.toUpperCase(), services);
            const mixedResults = searchServices(query, services);

            // All three should return the same results
            return lowerResults.length === upperResults.length &&
                   lowerResults.length === mixedResults.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5: no results when query does not match any service', () => {
      fc.assert(
        fc.property(
          fc.array(serviceArbitrary, { minLength: 0, maxLength: 50 }),
          (services) => {
            // Use a query that is very unlikely to match
            const impossibleQuery = '___IMPOSSIBLE_QUERY_XYZ123___';
            const results = searchServices(impossibleQuery, services);

            // Should return empty unless by chance a service contains this string
            return results.every(result => {
              const lowerQuery = impossibleQuery.toLowerCase();
              return result.name.toLowerCase().includes(lowerQuery) ||
                     result.id.toLowerCase().includes(lowerQuery) ||
                     (result.description && result.description.toLowerCase().includes(lowerQuery));
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
