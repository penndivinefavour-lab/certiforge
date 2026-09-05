'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudioRecipientsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [step, setStep] = useState<'upload' | 'preview' | 'map' | 'import'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({
    recipientName: 'name',
    email: 'email',
    courseName: 'course_name',
    issueDate: 'issue_date',
    instructor: 'instructor',
    grade: 'grade',
    duration: 'duration',
  });
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        if (file.name.toLowerCase().endsWith('.csv')) {
          const lines = content.split('\n').map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
          const headers = lines[0];
          const rows = lines.slice(1).filter(row => row.length > 0);
          
          setParsedData({
            headers,
            rows: rows.map((row, i) => {
              const data: Record<string, string> = {};
              headers.forEach((header, j) => {
                data[header] = row[j] || '';
              });
              return { data, rowNumber: i + 2 };
            }),
          });
          setStep('preview');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Failed to parse file:', error);
    }
  };

  const handleImport = async () => {
    if (!parsedData || !file) return;
    
    setImporting(true);
    
    try {
      // Create recipients from parsed data
      const recipients = parsedData.rows.map(row => ({
        name: row.data[mappings.recipientName] || '',
        email: row.data[mappings.email] || undefined,
        metadata: {
          course_name: row.data[mappings.courseName] || '',
          issue_date: row.data[mappings.issueDate] || '',
          instructor: row.data[mappings.instructor] || '',
          grade: row.data[mappings.grade] || '',
          duration: row.data[mappings.duration] || '',
        },
      })).filter(r => r.name);
      
      const res = await fetch(`/api/studio/projects/${projectId}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients }),
      });
      
      const data = await res.json();
      if (data.recipients) {
        setImported(data.recipients.length);
        setStep('import');
      }
    } catch (error) {
      console.error('Failed to import recipients:', error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push(`/studio/projects/${projectId}`)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to project
              </button>
              <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--foreground)' }}>
                Import Recipients
              </h1>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center gap-2">
              {['upload', 'preview', 'map', 'import'].map((s, i) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full ${
                    ['upload', 'preview', 'map', 'import'].indexOf(step) >= i
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div
                className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                  Upload Recipient File
                </h2>
                <p className="text-muted-foreground mb-4">
                  Upload a CSV or Excel file with recipient data
                </p>
                <p className="text-sm text-muted-foreground">
                  Supported formats: CSV, XLSX
                </p>
              </div>
            </motion.div>
          )}

          {step === 'preview' && parsedData && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                  Preview ({parsedData.rows.length} rows)
                </h2>
              </div>
              
              <div className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: 'var(--border)' }}>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead style={{ background: 'var(--muted)', position: 'sticky', top: 0 }}>
                      <tr>
                        {parsedData.headers.map((header: string, i: number) => (
                          <th key={i} className="px-4 py-3 text-left font-medium" style={{ color: 'var(--muted-foreground)' }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.rows.slice(0, 10).map((row: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          {parsedData.headers.map((header: string, j: number) => (
                            <td key={j} className="px-4 py-2" style={{ color: 'var(--foreground)' }}>
                              {row.data[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.rows.length > 10 && (
                  <div className="px-4 py-2 text-center text-sm text-muted-foreground" style={{ background: 'var(--muted)' }}>
                    Showing 10 of {parsedData.rows.length} rows
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-lg border font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep('map')}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                >
                  Continue →
                </button>
              </div>
            </motion.div>
          )}

          {step === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                  Map Columns
                </h2>
                <p className="text-sm text-muted-foreground">
                  Map your CSV columns to the recipient fields
                </p>
              </div>
              
              <div className="space-y-4 mb-6">
                {[
                  { key: 'recipientName', label: 'Recipient Name', required: true },
                  { key: 'email', label: 'Email', required: false },
                  { key: 'courseName', label: 'Course Name', required: false },
                  { key: 'issueDate', label: 'Issue Date', required: false },
                  { key: 'instructor', label: 'Instructor', required: false },
                  { key: 'grade', label: 'Grade', required: false },
                  { key: 'duration', label: 'Duration', required: false },
                ].map(({ key, label, required }) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-32 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {label} {required && <span className="text-destructive">*</span>}
                    </span>
                    <select
                      value={mappings[key] || ''}
                      onChange={(e) => setMappings({ ...mappings, [key]: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border outline-none"
                      style={{
                        background: 'var(--background)',
                        borderColor: 'var(--border)',
                        color: 'var(--foreground)',
                      }}
                    >
                      <option value="">-- Skip --</option>
                      {parsedData?.headers.map((header: string) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('preview')}
                  className="px-4 py-2 rounded-lg border font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !mappings.recipientName}
                  className="px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                >
                  {importing ? 'Importing...' : 'Import Recipients'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'import' && (
            <motion.div
              key="import"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-4">✓</div>
              <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                Import Complete!
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Successfully imported {imported} recipient{imported !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => router.push(`/studio/projects/${projectId}`)}
                className="px-6 py-3 rounded-lg font-medium"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                Continue to Project
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
