import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { DocDbStore } from '@/lib/db/docgen-store';
import { TemplateEngine } from '@/lib/operations/docgen/templates/template-engine';
import { createDocTemplateSchema } from '@/lib/validation/docgen-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';

  const engine = TemplateEngine.getInstance();
  const allTemplates = await engine.listAllTemplates(institutionId);
  return NextResponse.json({ success: true, templates: allTemplates });
}, 'documents:read');

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = createDocTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const store = DocDbStore.getInstance();
    const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const created = await store.createTemplate({
      id,
      institutionId: parsed.data.institutionId,
      templateCode: parsed.data.templateCode,
      name: parsed.data.name,
      category: parsed.data.category,
      layoutConfig: parsed.data.layoutConfig || null,
      contentTemplate: parsed.data.contentTemplate,
      cssStyles: parsed.data.cssStyles || null,
      version: 1,
      isDefault: parsed.data.isDefault ?? false,
      status: 'active',
      createdById: session.staffId,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true, template: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create template' }, { status: 500 });
  }
}, 'documents:templates:manage');
