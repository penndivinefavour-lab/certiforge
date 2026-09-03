"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

interface ImportResult {
  import: {
    id: string;
    fileName: string;
    fileType: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  validation: {
    validRecords: number;
    totalRecords: number;
    errors: { type: string; field: string; message: string; rowNumber: number }[];
    warnings: { type: string; field: string; message: string; rowNumber: number }[];
    canGenerate: boolean;
  };
  headers: string[];
  detectedColumns: {
    recipientName: string | null;
    email: string | null;
    courseName: string | null;
    issueDate: string | null;
    instructor: string | null;
    grade: string | null;
    duration: string | null;
    organization: string | null;
  };
  rows: ParsedRow[];
}

export default function ImportPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [step, setStep] = useState<"upload" | "preview" | "mapping" | "validation">("upload");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState({
    recipientName: "",
    email: "",
    courseName: "",
    issueDate: "",
    instructor: "",
  });
  const [generating, setGenerating] = useState(false);
  const [generationJob, setGenerationJob] = useState<{ id: string; status: string; total: number; completed: number } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handleFile = useCallback((f: File) => {
    const validTypes = [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const ext = f.name.toLowerCase().endsWith(".csv") ? ".csv" : ".xlsx";
    if (ext === ".csv" && !validTypes.includes(f.type) && f.type !== "") {
      // Accept any file for CSV if extension matches
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be less than 10MB");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    handleFile(f);
  }, [handleFile]);

  const processImport = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      formData.append("mapping", JSON.stringify(mapping));

      const res = await fetch("/api/imports", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Import failed");
        setUploading(false);
        return;
      }

      const data: ImportResult = await res.json();
      setImportResult(data);
      setStep("preview");
    } catch (err) {
      setError("Network error");
    } finally {
      setUploading(false);
    }
  };

  const goToMapping = () => {
    setStep("mapping");
    // Pre-fill mapping from detected columns
    if (importResult) {
      setMapping({
        recipientName: importResult.detectedColumns.recipientName || "",
        email: importResult.detectedColumns.email || "",
        courseName: importResult.detectedColumns.courseName || "",
        issueDate: importResult.detectedColumns.issueDate || "",
        instructor: importResult.detectedColumns.instructor || "",
      });
    }
  };

  const saveMapping = async () => {
    if (!importResult) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file!);
      formData.append("projectId", projectId);
      formData.append("mapping", JSON.stringify(mapping));

      const res = await fetch("/api/imports", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to save mapping");
        setUploading(false);
        return;
      }

      const data: ImportResult = await res.json();
      setImportResult(data);
      setStep("validation");
    } catch (err) {
      setError("Network error");
    } finally {
      setUploading(false);
    }
  };

  const validate = async () => {
    if (!importResult) return;
    setStep("validation");
  };

  const selectAll = () => {
    if (importResult) {
      const allIds = new Set(
        importResult.rows
          .filter((r) => r.errors.length === 0)
          .map((r) => r.rowNumber)
      );
      setSelectedRows(allIds);
    }
  };

  const selectErrorsOnly = () => {
    if (importResult) {
      const errorIds = new Set(
        importResult.rows
          .filter((r) => r.errors.length > 0)
          .map((r) => r.rowNumber)
      );
      setSelectedRows(errorIds);
    }
  };

  const generate = async () => {
    if (!importResult || !selectedRows.size) {
      setError("Please select at least one recipient to generate certificates for.");
      return;
    }

    setGenerating(true);
    try {
      // Get recipients from the import
      const res = await fetch(`/api/projects/${projectId}/recipients`);
      const data = await res.json();

      const validRecipients = data.recipients.filter((r: any) =>
        selectedRows.has(importResult.rows.find((row) => row.recipientId === r.id)?.rowNumber)
      );

      if (validRecipients.length === 0) {
        setError("No valid recipients selected.");
        setGenerating(false);
        return;
      }

      // Generate certificates
      const genRes = await fetch("/api/generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          recipients: validRecipients.map((r: any) => ({
            recipientId: r.id,
            name: r.name,
            email: r.email,
            metadata: {},
          })),
        }),
      });

      if (!genRes.ok) {
        const err = await genRes.json();
        setError(err.error || "Generation failed");
        setGenerating(false);
        return;
      }

      const genData = await genRes.json();
      setGenerationJob({
        id: genData.job.id,
        status: genData.job.status,
        total: genData.job.total,
        completed: genData.job.completed,
      });
      setStep("validation");
    } catch (err) {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  };

  const renderHeader = () => (
    <header className="border-b sticky top-0 z-40" style={{ borderColor: "hsl(var(--border))" }}>
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="btn btn-ghost btn-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <div className="h-6 w-px" style={{ background: "hsl(var(--border))" }} />
          <span className="font-semibold">Import recipients</span>
        </div>
        {importResult && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {importResult.import.validRows} valid / {importResult.import.totalRows} total
            </span>
          </div>
        )}
      </div>
    </header>
  );

  const renderUploadStep = () => (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-2">Upload a spreadsheet</h2>
        <p className="text-muted-foreground mb-8">
          Upload a CSV or XLSX file containing your recipient data. Each row should represent one certificate recipient.
        </p>

        {error && (
          <div className="mb-4 p-4 rounded-lg border text-sm" style={{
            borderColor: "hsl(var(--destructive))",
            background: "hsl(var(--destructive) / 0.05)",
            color: "hsl(var(--destructive))",
          }}>
            {error}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className="border-2 border-dashed rounded-xl p-12 text-center transition-all"
          style={{
            borderColor: isDragging ? "hsl(var(--primary))" : "hsl(var(--border))",
            background: isDragging ? "hsl(var(--primary) / 0.05)" : "hsl(var(--card))",
          }}
        >
          {file ? (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-lg overflow-hidden mb-4 flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
                {file.type.includes("spreadsheet") ? (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                    <line x1="8" y1="16" x2="16" y2="16"/>
                  </svg>
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )}
              </div>
              <p className="font-medium mb-1">{file.name}</p>
              <p className="text-sm text-muted-foreground mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <div className="flex gap-3">
                <button
                  onClick={processImport}
                  disabled={uploading}
                  className="btn btn-primary"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Process import
                    </>
                  )}
                </button>
                <button
                  onClick={() => setFile(null)}
                  className="btn btn-ghost btn-sm"
                >
                  Choose different file
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto" style={{
                background: "hsl(var(--primary) / 0.1)",
                color: "hsl(var(--primary))",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <p className="font-medium mb-2">Drop your spreadsheet here</p>
              <p className="text-sm text-muted-foreground mb-6">
                CSV or XLSX — one row per recipient
              </p>
              <label className="btn btn-primary cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Choose file
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
            </>
          )}
        </div>

        {/* Or paste data */}
        <div className="mt-6 text-center">
          <div className="h-px bg-border" style={{ background: "hsl(var(--border))" }} />
          <p className="text-sm text-muted-foreground mt-4 mb-4">or</p>
          <button
            onClick={() => setStep("mapping")}
            className="btn btn-secondary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            Enter recipient data manually
          </button>
        </div>
      </div>
    </main>
  );

  const renderPreviewStep = () => (
    <main className="container mx-auto px-6 py-6">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold">Preview</h2>
        <span className="badge badge-primary">{importResult?.totalRows} rows</span>
        <span className="badge" style={{ background: "hsl(140 60% 15%)", color: "hsl(140 60% 75%)" }}>
          {importResult?.validRows} valid
        </span>
        {importResult?.invalidRows > 0 && (
          <span className="badge" style={{ background: "hsl(0 65% 15%)", color: "hsl(0 65% 75%)" }}>
            {importResult?.invalidRows} invalid
          </span>
        )}
      </div>

      {/* File info */}
      <div className="p-4 rounded-lg border mb-6" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div>
            <p className="font-medium">{importResult?.import.fileName}</p>
            <p className="text-sm text-muted-foreground">
              {importResult?.import.fileType === "XLSX" ? "Excel spreadsheet" : "Comma-separated values"} — {importResult?.headers.length} columns detected
            </p>
          </div>
        </div>
      </div>

      {/* Headers */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Detected columns</h3>
        <div className="flex flex-wrap gap-2">
          {importResult?.headers.map((header) => (
            <span
              key={header}
              className="px-3 py-1.5 rounded-full text-sm border"
              style={{
                borderColor: "hsl(var(--border))",
                background: "hsl(var(--muted))",
                color: "hsl(var(--foreground))",
                fontFamily: "monospace",
              }}
            >
              {header}
            </span>
          ))}
        </div>
      </div>

      {/* Rows preview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Preview (first 5 rows)</h3>
          <div className="flex gap-2">
            <button onClick={selectAll} className="btn btn-ghost btn-sm text-xs">
              Select all valid
            </button>
            <button onClick={selectErrorsOnly} className="btn btn-ghost btn-sm text-xs" style={{ color: "hsl(var(--destructive))" }}>
              Show errors only
            </button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "hsl(var(--muted))" }}>
              <tr>
                {importResult?.headers.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-2 text-left font-medium text-xs uppercase tracking-wide"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    {header.length > 20 ? header.substring(0, 20) + "…" : header}
                  </th>
                ))}
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {importResult?.rows.slice(0, 5).map((row) => (
                <tr
                  key={row.rowNumber}
                  className={row.errors.length > 0 ? "bg-destructive/5" : "hover:bg-muted/50"}
                  style={{ transition: "background 0.1s" }}
                >
                  {importResult.headers.map((header) => (
                    <td
                      key={header}
                      className="px-4 py-2 max-w-[150px] truncate"
                    >
                      {row.data[header]}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    {row.errors.length > 0 ? (
                      <span className="badge badge-error text-xs">{row.errors.length} err</span>
                    ) : (
                      <span className="badge badge-success text-xs">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => setStep("upload")} className="btn btn-ghost btn-sm">
          Back
        </button>
        <button onClick={goToMapping} className="btn btn-primary">
          Continue to mapping
        </button>
      </div>
    </main>
  );

  const renderMappingStep = () => (
    <main className="container mx-auto px-6 py-6">
      <h2 className="text-lg font-semibold mb-6">Map columns to certificate fields</h2>
      <p className="text-muted-foreground mb-6">
        Match your spreadsheet columns to the certificate data fields. CertiForge will replace these placeholders when generating certificates.
      </p>

      {/* Column headers */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Available columns from your file</h3>
        <div className="flex flex-wrap gap-2">
          {importResult?.headers.map((header) => (
            <span
              key={header}
              className="px-3 py-1.5 rounded-full text-sm border font-mono"
              style={{
                borderColor: "hsl(var(--border))",
                background: "hsl(var(--muted))",
                color: "hsl(var(--foreground))",
              }}
            >
              {header}
            </span>
          ))}
        </div>
      </div>

      {/* Mapping pairs */}
      <div className="space-y-4">
        {[
          { label: "Recipient Name (required)", field: "recipientName", placeholder: "e.g. Full Name, Name, Recipient" },
          { label: "Email (optional)", field: "email", placeholder: "e.g. Email, Email Address" },
          { label: "Course Name (optional)", field: "courseName", placeholder: "e.g. Course, Program, Training" },
          { label: "Issue Date (optional)", field: "issueDate", placeholder: "e.g. Date, Completion Date" },
          { label: "Instructor (optional)", field: "instructor", placeholder: "e.g. Instructor, Trainer" },
        ].map(({ label, field, placeholder }) => (
          <div key={field} className="mapping-pair">
            <div className="mapping-source flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{placeholder}</p>
            </div>
            <div className="mapping-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
            <div className="mapping-target flex-1">
              {importResult?.detectedColumns[field as keyof typeof importResult.detectedColumns] ? (
                <span className="text-sm">
                  <span className="badge badge-primary text-xs mr-2">Auto-detected</span>
                  {importResult.detectedColumns[field as keyof typeof importResult.detectedColumns]}
                </span>
              ) : (
                <select
                  className="form-input w-full cursor-pointer"
                  style={{ padding: "0.375rem 0.625rem", fontSize: "0.875rem" }}
                  value={mapping[field as keyof typeof mapping]}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value }))}
                >
                  <option value="">— Not mapped —</option>
                  {importResult?.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-3">
        <button onClick={() => setStep("preview")} className="btn btn-ghost btn-sm">
          Back
        </button>
        {importResult?.invalidRows > 0 ? (
          <button onClick={saveMapping} disabled={uploading} className="btn btn-primary">
            {uploading ? "Saving..." : "Review validation"}
          </button>
        ) : (
          <button onClick={validate} disabled={uploading} className="btn btn-primary">
            {uploading ? "Validating..." : "Review validation"}
          </button>
        )}
      </div>
    </main>
  );

  const renderValidationStep = () => (
    <main className="container mx-auto px-6 py-6">
      <h2 className="text-lg font-semibold mb-2">Validation results</h2>
      <p className="text-muted-foreground mb-6">
        Review the validation status of your recipient data. Errors must be fixed before generating certificates.
      </p>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg border text-center" style={{ borderColor: "hsl(var(--border))" }}>
          <p className="text-2xl font-bold">{importResult?.validation.totalRecords}</p>
          <p className="text-sm text-muted-foreground">Total records</p>
        </div>
        <div className="p-4 rounded-lg border text-center" style={{ borderColor: "hsl(var(--border))" }}>
          <p className="text-2xl font-bold" style={{ color: "hsl(140 60% 60%)" }}>{importResult?.validation.validRecords}</p>
          <p className="text-sm text-muted-foreground">Valid</p>
        </div>
        {importResult?.validation.errors.length > 0 && (
          <div className="p-4 rounded-lg border text-center" style={{ borderColor: "hsl(var(--destructive))", background: "hsl(var(--destructive) / 0.05)" }}>
            <p className="text-2xl font-bold" style={{ color: "hsl(var(--destructive))" }}>{importResult.validation.errors.length}</p>
            <p className="text-sm text-muted-foreground">Errors</p>
          </div>
        )}
        {importResult?.validation.warnings.length > 0 && (
          <div className="p-4 rounded-lg border text-center" style={{ borderColor: "hsl(40 70% 50%)", background: "hsl(40 70% 15% / 0.1)" }}>
            <p className="text-2xl font-bold" style={{ color: "hsl(40 70% 60%)" }}>{importResult.validation.warnings.length}</p>
            <p className="text-sm text-muted-foreground">Warnings</p>
          </div>
        )}
      </div>

      {/* Can generate indicator */}
      <div className="mb-6 p-4 rounded-lg border" style={{
        borderColor: importResult?.validation.canGenerate ? "hsl(140 60% 40%)" : "hsl(var(--destructive))",
        background: importResult?.validation.canGenerate ? "hsl(140 60% 10% / 0.5)" : "hsl(var(--destructive) / 0.05)",
      }}>
        {importResult?.validation.canGenerate ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(140 60% 20%)", color: "hsl(140 60% 75%)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="font-medium" style={{ color: "hsl(140 60% 75%)" }}>Ready to generate</p>
              <p className="text-sm" style={{ color: "hsl(140 60% 65%)" }}>
                {importResult?.validation.validRecords} records can be processed without errors.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="font-medium" style={{ color: "hsl(var(--destructive))" }}>Cannot generate yet</p>
              <p className="text-sm" style={{ color: "hsl(var(--destructive) / 0.8)" }}>
                {importResult?.validation.errors.length} required error{(importResult?.validation.errors.length !== 1) ? "s" : ""} must be resolved.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error list */}
      {importResult?.validation.errors.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Errors ({importResult.validation.errors.length})
          </h3>
          <div className="space-y-2">
            {importResult.validation.errors.map((err, i) => (
              <div key={i} className="validation-error">
                <div className="validation-icon" style={{ color: "hsl(var(--destructive))" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <div className="validation-message">
                  <span className="validation-field" style={{ color: "hsl(var(--destructive))" }}>Row {err.rowNumber}:</span>
                  {err.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning list */}
      {importResult?.validation.warnings.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Warnings ({importResult.validation.warnings.length})
          </h3>
          <div className="space-y-2">
            {importResult.validation.warnings.map((warn, i) => (
              <div key={i} className="validation-warning">
                <div className="validation-icon" style={{ color: "hsl(40 70% 60%)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div className="validation-message">
                  <span className="validation-field" style={{ color: "hsl(40 70% 60%)" }}>Row {warn.rowNumber}:</span>
                  {warn.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => setStep("mapping")} className="btn btn-ghost btn-sm">
          Back to mapping
        </button>
        <button
          onClick={generate}
          disabled={!importResult?.validation.canGenerate || generating}
          className="btn btn-primary"
        >
          {generating ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Generating...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Generate certificates
            </>
          )}
        </button>
      </div>

      {/* Generation progress */}
      {generationJob && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 rounded-xl border bg-card"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <h3 className="font-semibold mb-4">Generation in progress</h3>
          <div className="generation-progress">
            <div className="generation-progress-header">
              <div>
                <p className="generation-count">
                  {generationJob.completed} / {generationJob.total}
                </p>
                <p className="generation-percent text-muted-foreground">
                  {generationJob.total > 0 ? ((generationJob.completed / generationJob.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <span className={`badge ${generationJob.status === "COMPLETED" ? "badge-success" : "badge-primary"}`}>
                {generationJob.status}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${(generationJob.completed / generationJob.total) * 100}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </main>
  );

  return (
    <div className="min-h-screen">
      {renderHeader()}

      <AnimatePresence mode="wait">
        {step === "upload" && renderUploadStep()}
        {step === "preview" && renderPreviewStep()}
        {step === "mapping" && renderMappingStep()}
        {step === "validation" && renderValidationStep()}
      </AnimatePresence>
    </div>
  );
}
