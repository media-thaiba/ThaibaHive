import { MdmConfigGenerator } from '../mdm/config-generator';

describe('Enterprise MDM Configuration Profile Generator', () => {
  const generator = new MdmConfigGenerator();
  const mockPolicy = {
    tenantId: 'inst-enterprise-01',
    serverUrl: 'https://campus.thaibahive.org',
    tenantKey: 'key_sec_100',
    allowExport: false,
    forcePasscode: true,
    sessionTimeoutMinutes: 15,
  };

  it('should generate valid Microsoft Intune AppConfig XML profile payload', () => {
    const xml = generator.generateProfile('INTUNE', mockPolicy);
    expect(xml).toContain('<appSettings>');
    expect(xml).toContain('<string key="server_url">https://campus.thaibahive.org</string>');
    expect(xml).toContain('<boolean key="allow_export">false</boolean>');
  });

  it('should generate valid Apple .mobileconfig PLIST profile payload', () => {
    const plist = generator.generateProfile('APPLE', mockPolicy);
    expect(plist).toContain('<!DOCTYPE plist PUBLIC');
    expect(plist).toContain('<key>server_url</key>');
    expect(plist).toContain('org.thaibahive.mobile.mdm.inst-enterprise-01');
  });
});
