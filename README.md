# EPM Analyzer — Policy XML Viewer (Phase 1)

A full-stack TypeScript app for uploading and inspecting CyberArk EPM policy XML files.

- **Frontend:** Vite + React + TypeScript + Tailwind CSS + lucide-react (`/frontend`)
- **Backend:** Node.js + Express + multer + fast-xml-parser, all in TypeScript (`/backend`)

## Project structure

```
.
├── backend/
│   ├── server.ts            # Express app + POST /api/upload-xml
│   ├── src/
│   │   ├── policyParser.ts  # fast-xml-parser wrapper + mapping
│   │   └── types.ts
│   └── sample/vf_policies.xml
└── frontend/
    └── src/
        ├── App.tsx
        ├── api.ts
        ├── lib/actionMap.ts # action integer -> readable label
        └── components/       # Header, FileDropzone, PolicyTable
```

## Running locally

Open two terminals.

### 1. Backend (port 4000)

```bash
cd backend
npm install
npm run dev      # tsx watch, or: npm run build && npm start
```

### 2. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api/*` to the backend, so just open http://localhost:5173 and
drop `backend/sample/vf_policies.xml` (or your own export) onto the upload zone.

## XML contract

The backend expects a root `<Policies>` node with `<Policy>` children whose
metadata is stored as **attributes**:

```xml
<Policies>
  <Policy id="P-1001" name="Allow Corporate Signed Apps" action="10" order="1" />
</Policies>
```

Per the EPM domain rules, the parser is configured with
`{ ignoreAttributes: false, attributeNamePrefix: "@_" }` and maps each policy to
a clean object: `{ id, name, action, order }`.

### Action mapping

| Raw value | Label         |
| --------- | ------------- |
| `10`      | Configuration |
| `12`      | Exclude       |
| other     | Unknown (n)   |
