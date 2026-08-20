export class TemplateEngine {
  private static instance: TemplateEngine;

  public static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  public render(templateStr: string, variables: Record<string, any>): string {
    if (!templateStr) return '';

    let rendered = templateStr;

    // 1. Process Conditionals: {{#if key}}content{{else}}alt{{/if}} or {{#if key}}content{{/if}}
    const ifElseRegex = /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
    rendered = rendered.replace(ifElseRegex, (_, key, ifTrue, ifFalse) => {
      const val = this.resolveVariable(key, variables);
      return val ? ifTrue : ifFalse;
    });

    const ifRegex = /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    rendered = rendered.replace(ifRegex, (_, key, content) => {
      const val = this.resolveVariable(key, variables);
      return val ? content : '';
    });

    // 2. Process Loops: {{#each list}}...{{this.name}}...{{/each}}
    const eachRegex = /\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    rendered = rendered.replace(eachRegex, (_, listKey, block) => {
      const list = this.resolveVariable(listKey, variables);
      if (!Array.isArray(list) || list.length === 0) return '';

      return list
        .map((item) => {
          let itemBlock = block;
          // replace {{this}} or {{this.property}}
          itemBlock = itemBlock.replace(/\{\{this\}\}/g, String(item));
          itemBlock = itemBlock.replace(/\{\{this\.([\w.]+)\}\}/g, (__: string, prop: string) => {
            const propVal = this.resolveVariable(prop, typeof item === 'object' ? item : {});
            return propVal !== undefined ? String(propVal) : '';
          });
          return itemBlock;
        })
        .join('');
    });

    // 3. Process Variables: {{user.name}} or {{amount}}
    const varRegex = /\{\{([\w.]+)\}\}/g;
    rendered = rendered.replace(varRegex, (_, key) => {
      const val = this.resolveVariable(key, variables);
      return val !== undefined ? String(val) : '';
    });

    // 4. Sanitize potentially dangerous executable scripts
    rendered = this.sanitizeHtml(rendered);

    return rendered;
  }

  private resolveVariable(path: string, obj: Record<string, any>): any {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const p of parts) {
      if (curr === undefined || curr === null) return undefined;
      curr = curr[p];
    }
    return curr;
  }

  private sanitizeHtml(str: string): string {
    // Strip <script>, <iframe>, <object>, <embed>, onload/onerror attributes
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '');
  }
}
