import { BrandValidator } from '../../../operations/engage/brand-validator';

describe('EngageOS BrandValidator & Tone Safety Tests', () => {
  let validator: BrandValidator;

  beforeEach(() => {
    validator = BrandValidator.getInstance();
  });

  it('should pass validation for professional template', () => {
    const text = 'Dear Parent, this is a reminder regarding upcoming semester registration. Unsubscribe anytime.';
    const result = validator.validateTemplate(text, 'email');
    expect(result.isCompliant).toBe(true);
    expect(result.score).toBeGreaterThan(0.9);
    expect(result.violations.length).toBe(0);
  });

  it('should flag prohibited hostile phrases as violations', () => {
    const text = 'PAY NOW OR FACE POLICE ACTION AND IMMEDIATE ARREST';
    const result = validator.validateTemplate(text, 'sms');
    expect(result.isCompliant).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should generate warning if email lacks unsubscribe link', () => {
    const text = 'Check out our new campus merchandise shop today!';
    const result = validator.validateTemplate(text, 'email');
    expect(result.warnings).toContain('Email template is missing an explicit unsubscribe or preference link footer');
  });
});
