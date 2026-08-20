import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { engageTemplateCreateSchema } from '@/lib/validation/engage-schemas';
import { EngageDbStore } from '@/lib/db/engage-store';
import { BrandValidator } from '@/lib/operations/engage/brand-validator';

const store = EngageDbStore.getInstance();
const brandValidator = BrandValidator.getInstance();

export const GET = requireAuth(async () => {
  try {
    const templates = await store.listTemplatesAsync('global');
    return NextResponse.json({ success: true, templates }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list templates' }, { status: 500 });
  }
}, 'engage:template:edit');

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = engageTemplateCreateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const data = parse.data;

    // Brand validation
    const brandCheck = brandValidator.validateTemplate(data.bodyTemplate, data.channel);
    if (!brandCheck.isCompliant) {
      return NextResponse.json({
        error: 'Brand safety violation detected',
        violations: brandCheck.violations,
      }, { status: 422 });
    }

    await store.saveTemplateAsync({
      templateId: data.templateId,
      name: data.name,
      category: data.category,
      channel: data.channel,
      subjectTemplate: data.subjectTemplate,
      bodyTemplate: data.bodyTemplate,
      variablesSchema: data.variablesSchema,
      brandRulesData: data.brandRulesData,
      isApproved: data.isApproved ?? true,
      institutionId: 'global',
    });

    return NextResponse.json({ success: true, templateId: data.templateId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 });
  }
}, 'engage:template:edit');
