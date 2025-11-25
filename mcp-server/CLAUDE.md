# CLAUDE.md - mcp-server

## 1. Project Identity

```yaml
project: '@wywyjp/wyside-mcp'
role: MCP Server for wyside
goal: AI-driven GAS infrastructure manipulation & unified code generation
```

## 2. Tech Stack

```yaml
runtime: Node.js (ESM)
language: TypeScript ES2022
core_libs:
  mcp: '@modelcontextprotocol/sdk'
  google: googleapis (Sheets/IAM)
  exec: execa (gcloud CLI)
  templates: handlebars
  interaction: inquirer
```

## 3. Development

```yaml
commands:
  install: npm install
  build: npm run build      # → build/
  dev: npm run dev          # watch mode
  start: npm start          # stdio mode

tool_test:
  workflow: |
    npm run build
    npm run test:tool <name> [args]

  available:
    - sync_secrets_from_gcp_to_local <projectId> [spreadsheetId]
    - scaffold_feature <featureName> <operations>
    - setup_named_range <spreadsheetId> <rangeName> <range>
    - drive_create_folder <folderName> [parentId]
    - gmail_send_email <to> <subject> <body>

  validation:
    - ✅ No build errors
    - ✅ Expected output returned
    - ✅ Generated files correctly formatted
```

## 4. Architecture

```yaml
entry: src/index.ts  # Server capabilities, tool routing

tools: src/tools/
  sync-secrets-from-gcp-to-local.ts  # GCP env setup
  scaffold-feature.ts                # Template-based codegen
  setup-named-range.ts               # Sheets API wrapper
  schema-generator.ts                # Schema → code pipeline
  operation-catalog.ts               # Operation definitions

templates: src/templates/*.hbs
```

## 5. Schema-Based Code Generation

### 5.1 Overview

Schema-driven CRUD code generator. Current: Sheets API. Extensible: Drive/Gmail/Calendar.

### 5.2 Sheets Implementation

```yaml
core_files:
  generator: src/tools/schema-generator.ts        # Type defs & converters
  catalog: src/tools/operation-catalog.ts         # 16 operations
  reference: docs/sheets-api-schemas.md           # API type ref
  guide: docs/flexible-operations.md              # System overview

schema_example: |
  {
    fields: [
      { name: 'id', type: 'string', column: 'A' },
      { name: 'title', type: 'string', column: 'B', required: true }
    ],
    range: 'Tasks!A2:E',
    rangeName: 'TASK_RANGE'
  }

priority_reading:
  1: docs/flexible-operations.md
  2: docs/schema-based-generation.md
  3: docs/sheets-api-schemas.md
  4: src/tools/operation-catalog.ts
  5: src/tools/schema-generator.ts
  6: src/templates/universal-repo.ts.hbs
```

## 6. API Extension Guide

### 6.1 Type Definition Discovery

```yaml
location: node_modules/googleapis/build/src/apis/{api}/{version}.d.ts

examples:
  sheets: node_modules/googleapis/build/src/apis/sheets/v4.d.ts
  drive: node_modules/googleapis/build/src/apis/drive/v3.d.ts
  gmail: node_modules/googleapis/build/src/apis/gmail/v1.d.ts
  calendar: node_modules/googleapis/build/src/apis/calendar/v3.d.ts

extract_targets:
  - export class {ApiName}
  - export interface Schema${ResourceName}
  - Params$Resource${Path}${Method}
  - Schema property types

extraction_methods:
  grep_schemas: grep -n "export interface Schema" {file} | head -20
  grep_resource: grep -A 50 "export interface Schema\$File {" {file}

context7_workflow: |
  1. mcp__context7__resolve-library-id({ libraryName: 'googleapis' })
     → /websites/googleapis_dev_nodejs_googleapis
  2. mcp__context7__get-library-docs({
       context7CompatibleLibraryID: '/websites/googleapis_dev_nodejs_googleapis',
       topic: 'drive_v3 Schema File create update',
       mode: 'code'
     })
  3. Read({ file_path: 'node_modules/googleapis/.../drive/v3.d.ts' })
```

### 6.2 API Data Patterns

```yaml
data_structures:
  Sheets:   {type: 2D array, ops: [batchGet, batchUpdate, appendValues]}
  Drive:    {type: file object, ops: [list, get, create, update, delete]}
  Gmail:    {type: message object, ops: [list, get, send, modify]}
  Calendar: {type: event object, ops: [list, get, insert, update, delete]}

schema_mapping:
  sheets: "{ name: 'title', column: 'B' }"
  object: "{ name: 'title', property: 'name' }"

drive_schema_example: |
  export interface Schema$File {
    id?: string | null;
    name?: string | null;
    mimeType?: string | null;
    parents?: string[] | null;
    createdTime?: string | null;
  }
```

### 6.3 Implementation Pattern

```yaml
file_structure: |
  src/tools/
    schema-generator.ts           # Common interface
    sheets-schema-generator.ts    # Current
    drive-schema-generator.ts     # New
    gmail-schema-generator.ts     # New
    operation-catalog.ts          # Common interface
    sheets-operation-catalog.ts   # Current
    drive-operation-catalog.ts    # New
    gmail-operation-catalog.ts    # New

generator_template: |
  export interface {Api}FieldSchema {
    name: string;
    property: string;  // API property name
    type: string;
    required?: boolean;
    description?: string;
  }

  export interface {Api}FeatureSchema {
    fields: {Api}FieldSchema[];
    resourceType: string;
    parentFolder?: string;
  }

  export function generate{Api}TypeDefinition(...): string
  export function generateObjectTo{Api}File(...): string

catalog_template: |
  export const {API}_OPERATION_CATALOG = {
    listFiles: {
      id: 'listFiles',
      category: 'query',
      description: 'List files',
      parameters: [...],
      returnType: '{api}_v3.Schema$File[]',
      generate: ctx => `...`
    },
    ...
  }
```

### 6.4 Checklist

```yaml
steps:
  1: Identify googleapis type definition file
  2: Extract Schema types (list, get, create, etc.)
  3: Understand data structure (array vs object)
  4: Create {api}-schema-generator.ts
     - FieldSchema interface
     - FeatureSchema interface
     - Type definition generator
     - Object converter
  5: Create {api}-operation-catalog.ts
     - 10-15 operations
     - Categorize (query, write, delete, batch)
     - Code generation functions
  6: Extend scaffold-feature.ts
     - API detection logic
     - Generator/catalog selector
  7: Create templates
     - universal-{api}-repo.ts.hbs
     - {api}-usecase.ts.hbs
  8: Create docs
     - docs/{api}-schemas.md
     - docs/{api}-operations.md
```

## 7. Guidelines

```yaml
error_handling: "Return { isError: true, content: 'user-friendly msg' }"
logging: console.error only (stdout reserved for MCP JSON-RPC)
path_resolution: Use fileURLToPath/import.meta.url (ESM module)
```

## 8. Testing

```yaml
standards:
  test_guide: test/CLAUDE.md
  factory_guide: test/factories/CLAUDE.md
compliance: mandatory
```
