export interface StandardTemplateDefinition {
  templateCode: string;
  name: string;
  category: 'report_card' | 'hall_ticket' | 'certificate' | 'fee_receipt' | 'custom';
  contentTemplate: string;
  cssStyles: string;
  layoutConfig: {
    pageSize: 'A4' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    marginsMm: { top: number; right: number; bottom: number; left: number };
    showWatermark: boolean;
    watermarkText?: string;
  };
}

export const builtInTemplates: StandardTemplateDefinition[] = [
  {
    templateCode: 'STD_REPORT_CARD_V1',
    name: 'Standard Term Report Card',
    category: 'report_card',
    layoutConfig: {
      pageSize: 'A4',
      orientation: 'portrait',
      marginsMm: { top: 15, right: 15, bottom: 15, left: 15 },
      showWatermark: true,
      watermarkText: 'OFFICIAL TRANSCRIPT',
    },
    cssStyles: `
      .report-header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }
      .inst-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
      .inst-sub { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }
      .doc-title { font-size: 16px; font-weight: 600; color: #0284c7; text-transform: uppercase; margin-top: 8px; }
      .student-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px; margin-bottom: 16px; background: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; }
      .grade-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
      .grade-table th { background: #0f172a; color: #ffffff; text-align: left; padding: 8px; font-weight: 600; }
      .grade-table td { border-bottom: 1px solid #e2e8f0; padding: 8px; }
      .grade-table tr:nth-child(even) { background: #f8fafc; }
      .summary-box { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; padding: 10px; background: #f1f5f9; border-radius: 4px; margin-bottom: 20px; }
      .qr-signature-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; }
      .qr-box { text-align: center; font-size: 10px; color: #64748b; }
      .sig-line { border-top: 1px solid #334155; width: 180px; text-align: center; font-size: 11px; padding-top: 4px; color: #334155; }
    `,
    contentTemplate: `
      <div class="report-card">
        <div class="report-header">
          <h1 class="inst-title">{{institution.name}}</h1>
          <p class="inst-sub">{{institution.address}} | Affiliation No: {{institution.affiliationCode}}</p>
          <div class="doc-title">ACADEMIC PERFORMANCE REPORT</div>
          <div style="font-size: 11px; color: #475569;">Academic Year: {{academicYear}} | Term: {{termName}}</div>
        </div>

        <div class="student-grid">
          <div><strong>Student Name:</strong> {{student.name}}</div>
          <div><strong>Roll / Admission No:</strong> {{student.rollNumber}}</div>
          <div><strong>Grade / Class:</strong> {{student.className}}</div>
          <div><strong>Guardian Name:</strong> {{student.guardianName}}</div>
          <div><strong>Date of Birth:</strong> {{student.dob}}</div>
          <div><strong>Attendance:</strong> {{student.attendancePercent}}% ({{student.presentDays}}/{{student.totalDays}} Days)</div>
        </div>

        <table class="grade-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Max Marks</th>
              <th>Marks Obtained</th>
              <th>Grade</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {{#each marks}}
            <tr>
              <td><strong>{{this.subjectName}}</strong></td>
              <td>{{this.maxMarks}}</td>
              <td>{{this.marksObtained}}</td>
              <td><strong>{{this.gradeLetter}}</strong></td>
              <td>{{this.remarks}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>

        <div class="summary-box">
          <div>Total Marks: {{totalMarksObtained}} / {{totalMaxMarks}}</div>
          <div>Percentage: {{percentage}}%</div>
          <div>GPA: {{gpa}}</div>
          <div>Overall Result: <strong>{{resultStatus}}</strong></div>
        </div>

        <div style="font-size: 11px; margin-bottom: 20px;">
          <strong>Faculty Remarks:</strong> <em>"{{teacherRemarks}}"</em>
        </div>

        <div class="qr-signature-section">
          <div class="qr-box">
            <div>{{{qrCodeSvg}}}</div>
            <div>Scan to Verify Authenticity<br>Hash: {{shortHash}}</div>
          </div>
          <div class="sig-line">
            Principal / Authorized Signatory
          </div>
        </div>
      </div>
    `,
  },
  {
    templateCode: 'STD_HALL_TICKET_V1',
    name: 'Examination Admit Card & Hall Ticket',
    category: 'hall_ticket',
    layoutConfig: {
      pageSize: 'A4',
      orientation: 'portrait',
      marginsMm: { top: 12, right: 12, bottom: 12, left: 12 },
      showWatermark: true,
      watermarkText: 'EXAMINATION ADMIT CARD',
    },
    cssStyles: `
      .hall-ticket-container { border: 2px solid #0f172a; padding: 16px; border-radius: 6px; }
      .ticket-header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 10px; margin-bottom: 12px; }
      .ticket-meta-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 16px; }
      .meta-details { font-size: 12px; line-height: 1.6; }
      .photo-box { border: 1px solid #cbd5e1; height: 110px; width: 90px; margin: auto; display: flex; align-items: center; justify-content: center; background: #f8fafc; font-size: 10px; color: #94a3b8; text-align: center; }
      .schedule-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px; }
      .schedule-table th { background: #1e293b; color: white; padding: 6px 8px; text-align: left; }
      .schedule-table td { border: 1px solid #cbd5e1; padding: 6px 8px; }
      .instructions { font-size: 10px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 10px; }
    `,
    contentTemplate: `
      <div class="hall-ticket-container">
        <div class="ticket-header">
          <h2 style="margin: 0; font-size: 18px; color: #0f172a;">{{institution.name}}</h2>
          <div style="font-size: 13px; font-weight: 700; color: #b91c1c; margin-top: 4px;">EXAMINATION HALL TICKET / ADMIT CARD</div>
          <div style="font-size: 11px; color: #64748b;">Examination: {{exam.name}} ({{exam.session}})</div>
        </div>

        <div class="ticket-meta-grid">
          <div class="meta-details">
            <div><strong>Candidate Name:</strong> {{student.name}}</div>
            <div><strong>Roll Number:</strong> <span style="font-size: 14px; font-weight: 700; color: #0f172a;">{{student.rollNumber}}</span></div>
            <div><strong>Registration No:</strong> {{student.registrationNumber}}</div>
            <div><strong>Course / Program:</strong> {{student.courseName}}</div>
            <div><strong>Exam Center:</strong> {{exam.centerName}}</div>
            <div><strong>Hall / Seat Number:</strong> {{exam.hallNumber}} - Seat #{{exam.seatNumber}}</div>
          </div>
          <div>
            <div class="photo-box">
              {{#if student.photoUrl}}
                <img src="{{student.photoUrl}}" style="max-width: 100%; max-height: 100%;" />
              {{else}}
                [AFFIX PASSPORT PHOTO]
              {{/if}}
            </div>
          </div>
        </div>

        <table class="schedule-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Paper / Subject Code</th>
              <th>Subject Title</th>
              <th>Invigilator Sig</th>
            </tr>
          </thead>
          <tbody>
            {{#each schedule}}
            <tr>
              <td>{{this.date}}</td>
              <td>{{this.time}}</td>
              <td><strong>{{this.subjectCode}}</strong></td>
              <td>{{this.subjectTitle}}</td>
              <td style="width: 80px;"></td>
            </tr>
            {{/each}}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
          <div style="text-align: center; font-size: 10px;">
            <div>{{{qrCodeSvg}}}</div>
            <div>Verification QR</div>
          </div>
          <div style="text-align: center; font-size: 11px; border-top: 1px solid #475569; width: 160px; padding-top: 4px;">
            Controller of Examinations
          </div>
        </div>

        <div class="instructions">
          <strong>Important Instructions for Candidates:</strong>
          <ol style="margin: 4px 0 0 16px; padding: 0;">
            <li>Candidates must bring this original admit card and institutional ID card to every exam session.</li>
            <li>No electronic gadgets, mobile phones, or smartwatches are permitted inside the examination hall.</li>
            <li>Candidates must occupy their designated seats at least 15 minutes before exam commencement.</li>
          </ol>
        </div>
      </div>
    `,
  },
  {
    templateCode: 'STD_BONAFIDE_CERTIFICATE_V1',
    name: 'Institutional Bonafide Student Certificate',
    category: 'certificate',
    layoutConfig: {
      pageSize: 'A4',
      orientation: 'landscape',
      marginsMm: { top: 20, right: 20, bottom: 20, left: 20 },
      showWatermark: true,
      watermarkText: 'OFFICIAL CERTIFICATE',
    },
    cssStyles: `
      .cert-container { border: 6px double #0f172a; padding: 24px; text-align: center; height: 90%; position: relative; }
      .cert-header { margin-bottom: 20px; }
      .cert-title { font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: 2px; text-transform: uppercase; margin: 16px 0; }
      .cert-body { font-size: 16px; line-height: 2.0; color: #1e293b; margin: 24px auto; max-width: 800px; text-align: justify; }
      .cert-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
    `,
    contentTemplate: `
      <div class="cert-container">
        <div class="cert-header">
          <h1 style="font-size: 22px; margin: 0; color: #0f172a;">{{institution.name}}</h1>
          <div style="font-size: 12px; color: #64748b;">{{institution.address}}</div>
        </div>

        <div class="cert-title">BONAFIDE CERTIFICATE</div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 16px;">Certificate Serial No: <strong>{{serialNumber}}</strong></div>

        <div class="cert-body">
          This is to certify that <strong>{{student.name}}</strong>, son/daughter of <strong>{{student.guardianName}}</strong>, Roll Number <strong>{{student.rollNumber}}</strong>, is a bonafide student of this institution, currently enrolled in <strong>{{student.className}}</strong> during the academic year <strong>{{academicYear}}</strong>.
          <br><br>
          To the best of our knowledge and official institutional records, their conduct and character have been <strong>{{student.characterRating}}</strong>. This certificate is issued upon their request for the purpose of <strong>{{purpose}}</strong>.
        </div>

        <div class="cert-footer">
          <div style="text-align: left; font-size: 11px;">
            <div>Date of Issue: {{formatDate issuedAt}}</div>
            <div>Place: {{institution.city}}</div>
            <div style="margin-top: 10px;">{{{qrCodeSvg}}}</div>
          </div>
          <div style="border-top: 1px solid #1e293b; width: 220px; font-size: 13px; font-weight: 700; padding-top: 6px;">
            Principal / Head of Institution
          </div>
        </div>
      </div>
    `,
  },
];
