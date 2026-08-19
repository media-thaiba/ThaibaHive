import { ParquetSchema } from '../types';

export const StudentDomainSchema: ParquetSchema = {
  columns: [
    { name: 'id', type: 'string', nullable: false },
    { name: 'tenantId', type: 'string', nullable: false },
    { name: 'firstName', type: 'string', nullable: false },
    { name: 'lastName', type: 'string', nullable: false },
    { name: 'enrollmentDate', type: 'timestamp', nullable: false },
    { name: 'status', type: 'string', nullable: false },
    { name: 'updatedAt', type: 'timestamp', nullable: false },
  ],
};

export const AttendanceDomainSchema: ParquetSchema = {
  columns: [
    { name: 'id', type: 'string', nullable: false },
    { name: 'tenantId', type: 'string', nullable: false },
    { name: 'studentId', type: 'string', nullable: false },
    { name: 'date', type: 'timestamp', nullable: false },
    { name: 'status', type: 'string', nullable: false },
    { name: 'remarks', type: 'string', nullable: true },
    { name: 'updatedAt', type: 'timestamp', nullable: false },
  ],
};

export const FinanceDomainSchema: ParquetSchema = {
  columns: [
    { name: 'id', type: 'string', nullable: false },
    { name: 'tenantId', type: 'string', nullable: false },
    { name: 'studentId', type: 'string', nullable: true },
    { name: 'amount', type: 'float64', nullable: false },
    { name: 'category', type: 'string', nullable: false },
    { name: 'status', type: 'string', nullable: false },
    { name: 'transactionDate', type: 'timestamp', nullable: false },
    { name: 'updatedAt', type: 'timestamp', nullable: false },
  ],
};
