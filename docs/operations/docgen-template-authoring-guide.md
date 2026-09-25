# DOC-GEN Template Authoring Guide

## Overview
ThaibaHive DOC-GEN provides an enterprise document templating engine supporting Handlebars syntax, conditional rendering, iteration, custom formatters, and CSS `@page` paged media rules.

## Template Tokens & Syntax

### Basic Variable Interpolation
- `{{student.name}}`: HTML-escaped text interpolation.
- `{{{qrCodeSvg}}}`: Raw unescaped vector SVG interpolation.

### Custom Formatting Helpers
- `{{formatDate date}}`: Formats date strings to `YYYY-MM-DD`.
- `{{formatCurrency amount}}`: Formats currency values to 2 decimal places.
- `{{formatPercent value}}`: Formats percentage numbers with `%` symbol.
- `{{uppercase text}}`: Converts text to uppercase.
- `{{lowercase text}}`: Converts text to lowercase.

### Conditional Rendering
```handlebars
{{#if student.isPassed}}
  <span class="badge badge-success">Passed</span>
{{else}}
  <span class="badge badge-danger">Failed</span>
{{/if}}
```

### Iteration
```handlebars
<table>
  <thead>
    <tr><th>Subject</th><th>Marks</th><th>Grade</th></tr>
  </thead>
  <tbody>
    {{#each marks}}
      <tr>
        <td>{{subjectName}}</td>
        <td>{{marksObtained}} / {{maxMarks}}</td>
        <td>{{gradeLetter}}</td>
      </tr>
    {{/each}}
  </tbody>
</table>
```

## CSS Paged Media `@page` Rules
- Page sizing: `size: A4 portrait;` or `size: A4 landscape;`
- Margin controls: `@page { margin: 15mm; }`
- Table pagination: `tr { page-break-inside: avoid; }`
