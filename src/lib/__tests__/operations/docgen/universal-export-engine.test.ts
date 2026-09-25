import { UniversalExportEngine } from '../../../operations/docgen/export/universal-export-engine';

describe('UniversalExportEngine & Multi-Format Streaming (Sprint-056)', () => {
  const engine = UniversalExportEngine.getInstance();

  const mockStudents = [
    { rollNumber: 'CS-01', name: 'Muhammed Ameen', className: 'Year 1', email: 'ameen@thaiba.edu', phone: '9847123456', guardianName: 'Rahman', status: 'active' },
    { rollNumber: 'CS-02', name: 'Fatima Hiba', className: 'Year 1', email: 'hiba@thaiba.edu', phone: '9847654321', guardianName: 'Ibrahim', status: 'active' },
  ];

  it('should export dataset to formatted CSV stream with phone masking', async () => {
    const res = await engine.exportDataset({
      institutionId: 'inst-001',
      jobType: 'students',
      format: 'csv',
      data: mockStudents,
    });

    expect(res.mimeType).toContain('text/csv');
    expect(res.fileName).toContain('students_export_');
    expect(res.fileName).toContain('.csv');
    expect(res.recordCount).toBe(2);
    expect(res.content as string).toContain('"Roll Number","Full Name"');
    expect(res.content as string).toContain('"CS-01","Muhammed Ameen"');
    expect(res.content as string).toContain('98****56'); // Masked phone
  });

  it('should export dataset to JSON array stream', async () => {
    const res = await engine.exportDataset({
      institutionId: 'inst-001',
      jobType: 'students',
      format: 'json',
      data: mockStudents,
    });

    expect(res.mimeType).toContain('application/json');
    const parsed = JSON.parse(res.content as string);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]['Full Name']).toBe('Muhammed Ameen');
  });

  it('should export dataset to Tabular HTML/PDF format', async () => {
    const res = await engine.exportDataset({
      institutionId: 'inst-001',
      jobType: 'students',
      format: 'pdf',
      data: mockStudents,
    });

    expect(res.content as string).toContain('<table>');
    expect(res.content as string).toContain('<td>Muhammed Ameen</td>');
    expect(res.content as string).toContain('STUDENTS Export');
  });
});
