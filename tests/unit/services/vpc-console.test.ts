import { describe, it, expect } from 'vitest';
import { parseServiceIdFromUrl } from '../../../src/utils/dom';
import { formatServiceName } from '../../../src/services/service-catalog';
import { getDefaultIconUrl, resolveServiceIcon } from '../../../src/services/service-icons';

describe('VPC Console Support', () => {
  describe('parseServiceIdFromUrl', () => {
    it('should map /vpcconsole/home to canonical service ID "vpc"', () => {
      expect(parseServiceIdFromUrl('/vpcconsole/home')).toBe('vpc');
      expect(parseServiceIdFromUrl('https://console.aws.amazon.com/vpcconsole/home')).toBe('vpc');
      expect(
        parseServiceIdFromUrl(
          'https://us-east-1.console.aws.amazon.com/vpcconsole/home?region=us-east-1'
        )
      ).toBe('vpc');
      expect(
        parseServiceIdFromUrl('https://ap-southeast-2.console.aws.amazon.com/vpcconsole/home#vpcs:')
      ).toBe('vpc');
    });

    it('should preserve standard /vpc/home path as "vpc"', () => {
      expect(parseServiceIdFromUrl('/vpc/home')).toBe('vpc');
      expect(
        parseServiceIdFromUrl('https://us-east-1.console.aws.amazon.com/vpc/home?region=us-east-1')
      ).toBe('vpc');
    });
  });

  describe('Service name and icon resolution for VPC', () => {
    it('should format canonical vpc and vpcconsole as "VPC"', () => {
      expect(formatServiceName('vpc')).toBe('VPC');
      expect(formatServiceName('vpcconsole')).toBe('VPC');
    });

    it('should resolve default icon for canonical vpc and vpcconsole alias', () => {
      const vpcIcon = getDefaultIconUrl('vpc');
      expect(vpcIcon).not.toBeNull();
      expect(vpcIcon).toContain('.svg');

      const vpcConsoleIcon = getDefaultIconUrl('vpcconsole');
      expect(vpcConsoleIcon).toBe(vpcIcon);

      const resolvedVpc = resolveServiceIcon('vpc', null);
      const resolvedVpcConsole = resolveServiceIcon('vpcconsole', null);
      expect(resolvedVpc).toBe(vpcIcon);
      expect(resolvedVpcConsole).toBe(vpcIcon);
    });
  });
});
