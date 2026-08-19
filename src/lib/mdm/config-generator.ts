import { MdmPolicyConfig, MdmPlatform } from './types';

export class MdmConfigGenerator {
  /**
   * Generates MDM policy configuration payload formatted for target platform
   */
  public generateProfile(platform: MdmPlatform, config: MdmPolicyConfig): string {
    if (platform === 'INTUNE') {
      return this.generateIntuneXml(config);
    } else {
      return this.generateAppleMobileConfig(config);
    }
  }

  private generateIntuneXml(config: MdmPolicyConfig): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<appSettings>
  <string key="server_url">${config.serverUrl}</string>
  <string key="tenant_key">${config.tenantKey}</string>
  <string key="tenant_id">${config.tenantId}</string>
  <boolean key="allow_export">${config.allowExport}</boolean>
  <boolean key="force_passcode">${config.forcePasscode}</boolean>
  <integer key="session_timeout_mins">${config.sessionTimeoutMinutes}</integer>
</appSettings>`;
  }

  private generateAppleMobileConfig(config: MdmPolicyConfig): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key>
      <string>com.apple.configuration.managed</string>
      <key>server_url</key>
      <string>${config.serverUrl}</string>
      <key>tenant_id</key>
      <string>${config.tenantId}</string>
      <key>allow_export</key>
      <${config.allowExport}/>
    </dict>
  </array>
  <key>PayloadDisplayName</key>
  <string>ThaibaHive Enterprise Managed Policy</string>
  <key>PayloadIdentifier</key>
  <string>org.thaibahive.mobile.mdm.${config.tenantId}</string>
  <key>PayloadType</key>
  <string>Configuration</string>
</dict>
</plist>`;
  }
}
