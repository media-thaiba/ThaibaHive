'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ensureArray } from '@/lib/utils';

export function TemplateDesignerTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  // New Template Form
  const [templateCode, setTemplateCode] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('report_card');
  const [contentTemplate, setContentTemplate] = useState('');

  const fetchTemplates = () => {
    setLoading(true);
    fetch('/api/docgen/templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTemplates(ensureArray(data.templates));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch templates:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = () => {
    if (!templateCode || !templateName || !contentTemplate) return;

    fetch('/api/docgen/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionId: 'global',
        templateCode,
        name: templateName,
        category,
        contentTemplate,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsNewDialogOpen(false);
          setTemplateCode('');
          setTemplateName('');
          setContentTemplate('');
          fetchTemplates();
        }
      })
      .catch((err) => {
        console.error('Failed to create template:', err);
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Institutional Document Templates</h3>
          <p className="text-sm text-muted-foreground">
            Manage report card layouts, hall tickets, certificate citations, and CSS print media settings.
          </p>
        </div>
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger>
            <Button>+ New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Document Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Code</Label>
                  <Input
                    placeholder="e.g. TGCIS_ANNUAL_REPORT_V2"
                    value={templateCode}
                    onChange={(e) => setTemplateCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="e.g. TGCIS Annual Report Card"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  aria-label="Category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="report_card">Report Card</option>
                  <option value="hall_ticket">Hall Ticket</option>
                  <option value="certificate">Academic Certificate</option>
                  <option value="fee_receipt">Fee Receipt</option>
                  <option value="custom">Custom Document</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Template Markup (Handlebars / HTML)</Label>
                <Textarea
                  placeholder="<div><h1>{{institution.name}}</h1>...</div>"
                  rows={8}
                  value={contentTemplate}
                  onChange={(e) => setContentTemplate(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleCreateTemplate}>
                Save Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.templateCode} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base font-bold">{tpl.name}</CardTitle>
                  <Badge variant={tpl.isBuiltIn ? 'secondary' : 'default'}>
                    {tpl.isBuiltIn ? 'BUILT-IN' : 'CUSTOM'}
                  </Badge>
                </div>
                <CardDescription className="text-xs font-mono">{tpl.templateCode}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Category: <span className="font-semibold text-foreground uppercase">{tpl.category}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedTemplate(tpl);
                    setPreviewHtml(
                      `<div style="padding: 20px; font-family: sans-serif;"><h2>${tpl.name}</h2><p>Live preview compiled from ${tpl.templateCode}</p><hr/><p>Student Name: Sample Candidate</p><p>Status: VERIFIED AUTHENTIC</p></div>`
                    );
                  }}
                >
                  Inspect Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedTemplate && previewHtml && (
        <Card className="mt-6 border-2 border-primary/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-md">Template Inspector: {selectedTemplate.name}</CardTitle>
              <CardDescription>{selectedTemplate.templateCode}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>
              Close Inspector
            </Button>
          </CardHeader>
          <CardContent>
            <div
              className="border rounded-md p-4 bg-white text-slate-900 shadow-inner min-h-[200px]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
