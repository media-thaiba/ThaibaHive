'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ensureArray } from '@/lib/utils';

export default function StudentDocumentPortalPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/docgen/records')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDocuments(ensureArray(data.records));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch personal documents:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleDownloadPdf = (doc: any) => {
    // Generate simple printable page view for download
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${doc.title}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; text-align: center; }
              .header { border-bottom: 2px solid #333; padding-bottom: 20px; }
              .details { margin: 30px 0; text-align: left; line-height: 1.8; }
              .footer { border-top: 1px dashed #666; margin-top: 50px; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Official Academic Document</h2>
              <p>Serial Number: ${doc.serialNumber}</p>
            </div>
            <div class="details">
              <h3>${doc.title}</h3>
              <p><strong>Document Hash:</strong> ${doc.documentHash}</p>
              <p><strong>Issued At:</strong> ${doc.issuedAt}</p>
              <p><strong>Status:</strong> ${doc.status.toUpperCase()}</p>
            </div>
            <div class="footer">
              <p>Cryptographically Verified by ThaibaHive Institution Operating System</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student &amp; Parent Document Center"
        description="View, verify, and download official examination hall tickets, term report cards, and bonafide certificates."
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground text-sm">
              No official documents have been issued for your profile yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base font-semibold">{doc.title}</CardTitle>
                  <Badge variant={doc.status === 'valid' ? 'default' : 'destructive'}>
                    {doc.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="text-xs font-mono">{doc.serialNumber}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  <div>Issued: {new Date(doc.issuedAt).toLocaleDateString()}</div>
                  <div className="font-mono text-[10px] truncate mt-1">Hash: {doc.documentHash}</div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedDoc(doc);
                      setPreviewOpen(true);
                    }}
                  >
                    View Details
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => handleDownloadPdf(doc)}>
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedDoc && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedDoc.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4 text-sm">
              <div><strong>Serial Number:</strong> {selectedDoc.serialNumber}</div>
              <div><strong>Status:</strong> {selectedDoc.status.toUpperCase()}</div>
              <div><strong>Document Type:</strong> {selectedDoc.documentType}</div>
              <div><strong>Issued Date:</strong> {selectedDoc.issuedAt}</div>
              <div className="break-all"><strong>SHA-256 Hash:</strong> <span className="font-mono text-xs">{selectedDoc.documentHash}</span></div>
              <div className="pt-2">
                <Button className="w-full" onClick={() => handleDownloadPdf(selectedDoc)}>
                  Print / Download PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
