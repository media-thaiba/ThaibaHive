"use strict";

const fs = require('fs');
const path = require('path');

function validateSecurityHeaders() {
  const rootDir = path.resolve(__dirname, '.');
  
  let configPath = null;
  if (fs.existsSync(path.join(rootDir, 'next.config.js'))) {
    configPath = path.join(rootDir, 'next.config.js');
  } else if (fs.existsSync(path.join(rootDir, 'next.config.ts'))) {
    configPath = path.join(rootDir, 'next.config.ts');
  }
  
  if (!configPath) {
    console.error('ERROR: Neither next.config.js nor next.config.ts found');
    process.exit(1);
  }

  console.log('✓ Found Next.js configuration file: ' + path.basename(configPath));
  
  const content = fs.readFileSync(configPath, 'utf8');

  const validation = {
    csp: false,
    xFrameOptions: false,
    xContentTypeOptions: false,
    xXSSProtection: false,
    referrerPolicy: false,
    hsts: false,
    permissionsPolicy: false,
    cspImgSrcData: false,
    cspObjectSrcNone: false,
    cspBlobAllowed: false,
    cspWssAllowed: false
  };

  if (content.match(/Content-Security-Policy\s*:[^;]+;/i)) {
    validation.csp = true;
    
    const cspMatch = content.match(/Content-Security-Policy\s*:[^;]+;/i);
    if (cspMatch) {
      const csp = cspMatch[0];
      
      if (/default-src\s+[\'\"]self[\'\"]/.test(csp)) {
        validation.csp = true;
        console.log('✓ CSP contains default-src "self"');
      }
      if (/object-src\s+[\'\"]none[\'\"]/.test(csp)) {
        validation.cspObjectSrcNone = true;
        console.log('✓ CSP contains object-src "none" (prevents plugin execution)');
      }
      if (/img-src\s+[\'\"][^\'\"]*data:/.test(csp)) {
        validation.cspImgSrcData = true;
        console.log('✓ CSP img-src allows data: URLs');
      }
      if (/blob:/.test(csp)) {
        validation.cspBlobAllowed = true;
        console.log('✓ CSP allows blob: URLs for media');
      }
      if (/wss?:/.test(csp)) {
        validation.cspWssAllowed = true;
        console.log('✓ CSP allows WebSocket connections');
      }
      
      console.log('✓ CSP valid format with appropriate source restrictions');
      validation.csp = true;
    } else {
      console.log('WARNING: Could not parse CSP header value');
    }
  }

  if (/X-Content-Type-Options:\s*nosniff/i.test(content)) {
    validation.xContentTypeOptions = true;
    console.log('✓ X-Content-Type-Options: nosniff configured');
  }
  
  if (/X-Frame-Options:\s*DENY/i.test(content)) {
    validation.xFrameOptions = true;
    console.log('✓ X-Frame-Options: DENY configured');
  }
  
  if (/X-XSS-Protection:\s*1;\s*mode=block/i.test(content)) {
    validation.xXSSProtection = true;
    console.log('✓ X-XSS-Protection: 1; mode=block configured');
  }
  
  if (/Referrer-Policy:\s*strict-origin-when-cross-origin/i.test(content)) {
    validation.referrerPolicy = true;
    console.log('✓ Referrer-Policy: strict-origin-when-cross-origin configured');
  }

  const hstsChecks = [
    /max-age=31536000/i,
    /includeSubDomains/i,
    /preload/i
  ];
  
  if (hstsChecks.every(regex => regex.test(content))) {
    validation.hsts = true;
    console.log('✓ HSTS configured with max-age=31536000, includeSubDomains, preload');
  }

  const permissionsPolicyChecks = [
    /camera=\(\)/i,
    /microphone=\(\)/i,
    /geolocation=\(\)/i,
    /payment=\(\)/i
  ];
  
  if (permissionsPolicyChecks.every(regex => regex.test(content))) {
    validation.permissionsPolicy = true;
    console.log('✓ Permissions-Policy configured with camera, microphone, geolocation, payment');
  }

  const stats = {
    csp: validation.csp,
    xFrameOptions: validation.xFrameOptions,
    xContentTypeOptions: validation.xContentTypeOptions,
    xXSSProtection: validation.xXSSProtection,
    referrerPolicy: validation.referrerPolicy,
    hsts: validation.hsts,
    permissionsPolicy: validation.permissionsPolicy,
    cspImgSrcData: validation.cspImgSrcData,
    cspObjectSrcNone: validation.cspObjectSrcNone,
    cspBlobAllowed: validation.cspBlobAllowed,
    cspWssAllowed: validation.cspWssAllowed
  };

  console.log('\n📊 Security Headers Statistics:');
  console.log('  CSP Headers:                    ' + (validation.csp ? '✓' : '✗'));
  console.log('  X-Content-Type-Options:         ' + (validation.xContentTypeOptions ? '✓' : '✗'));
  console.log('  X-Frame-Options:                ' + (validation.xFrameOptions ? '✓' : '✗'));
  console.log('  X-XSS-Protection:                ' + (validation.xXSSProtection ? '✓' : '✗'));
  console.log('  Referrer-Policy:                 ' + (validation.referrerPolicy ? '✓' : '✗'));
  console.log('  HSTS (max-age, includeSubDomains, preload): ' + (validation.hsts ? '✓' : '✗'));
  console.log('  Permissions-Policy:              ' + (validation.permissionsPolicy ? '✓' : '✗'));

  const passed = Object.values(validation).filter(v => v).length;
  const total = Object.keys(validation).length;
  const score = Math.round((passed / total) * 100);

  console.log('\n🎯 Overall Security Score: ' + score + '% (' + passed + '/' + total + ' headers implemented)');

  console.log('\n💡 Security Analysis:');
  if (!validation.csp) {
    console.log('   ⚠️  WARNING: CSP is missing or incomplete - this is a CRITICAL security issue');
    console.log('      Recommend implementing a comprehensive CSP with proper script and style controls');
  }
  if (!validation.xFrameOptions) {
    console.log('   ⚠️  WARNING: X-Frame-Options is missing - this allows clickjacking attacks');
  }
  if (!validation.hsts) {
    console.log('   ⚠️  WARNING: HSTS is missing or incomplete - this allows SSL stripping attacks');
  }

  console.log('\n📋 Current CSP configuration found in next.config:');
  const cspLine = content.match(/Content-Security-Policy\s*:[^;]+;/i);
  if (cspLine) {
    const cspValue = cspLine[0];
    console.log('   ' + cspValue);
  }

  if (score < 80) {
    console.log('\n❌ Security review FAILED: Security header implementation needs improvement');
    console.log('   IMMEDIATE ACTION REQUIRED before production deployment');
    process.exit(1);
  } else {
    console.log('\n✅ Security headers implementation is adequate');
    console.log('   Ready for basic production deployment');
    process.exit(0);
  }
}

validateSecurityHeaders();
