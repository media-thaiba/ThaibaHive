"use client";

import { useEffect, useState } from "react";
import Head from "next/head";

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4">
      <Head>
        <title>ThaibaHive API Documentation (OpenAPI 3.1)</title>
        <link
          rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css"
        />
      </Head>

      <header className="max-w-7xl mx-auto mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>⚡</span> ThaibaHive API Documentation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            OpenAPI 3.1.0 Interactive Swagger UI Documentation & Testing Console
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Download openapi.json
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-2xl">
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Swagger UI</title>
                <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
                <style>
                  body { margin: 0; background: #0f172a; color: #f8fafc; }
                  .swagger-ui .topbar { display: none; }
                  .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
                  .swagger-ui .scheme-container { background: #1e293b; }
                </style>
              </head>
              <body>
                <div id="swagger-ui"></div>
                <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
                <script>
                  window.onload = () => {
                    SwaggerUIBundle({
                      url: '/api/openapi.json',
                      dom_id: '#swagger-ui',
                      deepLinking: true,
                      presets: [
                        SwaggerUIBundle.presets.apis,
                        SwaggerUIBundle.SwaggerUIStandalonePreset
                      ],
                    });
                  };
                </script>
              </body>
            </html>
          `}
          className="w-full h-[800px] border-0 rounded-lg"
          title="Swagger UI API Documentation"
        />
      </main>
    </div>
  );
}
