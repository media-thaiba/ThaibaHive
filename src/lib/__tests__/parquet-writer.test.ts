import { ParquetWriter } from '../lakehouse/parquet-writer';
import { ParquetSchema } from '../lakehouse/types';

describe('ParquetWriter Columnar Serialization', () => {
  const sampleSchema: ParquetSchema = {
    columns: [
      { name: 'id', type: 'string', nullable: false },
      { name: 'age', type: 'int32', nullable: true },
      { name: 'score', type: 'float64', nullable: true },
      { name: 'isActive', type: 'boolean', nullable: false },
      { name: 'createdAt', type: 'timestamp', nullable: false },
    ],
  };

  it('should encode records into a valid Parquet buffer with PAR1 magic bytes', async () => {
    const writer = new ParquetWriter(sampleSchema, { compression: 'snappy' });
    const records = [
      { id: 'usr-1', age: 25, score: 95.5, isActive: true, createdAt: '2026-08-03T10:00:00Z' },
      { id: 'usr-2', age: 30, score: 88.0, isActive: false, createdAt: '2026-08-03T11:00:00Z' },
    ];

    const buffer = await writer.writeRecordsToBuffer(records);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(16);

    // Verify PAR1 magic bytes at start and end
    const startMagic = buffer.subarray(0, 4).toString('utf-8');
    const endMagic = buffer.subarray(buffer.length - 4).toString('utf-8');

    expect(startMagic).toBe('PAR1');
    expect(endMagic).toBe('PAR1');
  });

  it('should throw an error when estimated memory exceeds maxMemoryMb limit', async () => {
    const writer = new ParquetWriter(sampleSchema, { maxMemoryMb: 0.0001 });
    const records = [
      { id: 'usr-1', age: 25, score: 95.5, isActive: true, createdAt: '2026-08-03T10:00:00Z' },
    ];

    await expect(writer.writeRecordsToBuffer(records)).rejects.toThrow('Memory footprint limit exceeded');
  });
});
