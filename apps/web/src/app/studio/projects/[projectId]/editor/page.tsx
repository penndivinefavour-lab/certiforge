'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as fabric from 'fabric';
import { motion } from 'framer-motion';

export default function StudioEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  useEffect(() => {
    // Initialize Fabric canvas
    if (canvasRef.current) {
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: 842,
        height: 595,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
      });
      
      setCanvas(fabricCanvas);
      
      return () => {
        fabricCanvas.dispose();
      };
    }
  }, []);

  const handleSaveTemplate = async () => {
    if (!canvas) return;
    
    setSaving(true);
    setSaveStatus('saving');
    
    try {
      // Serialize canvas to JSON
      const json = canvas.toJSON();
      
      // Save to backend
      const res = await fetch(`/api/studio/projects/${projectId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Certificate Template',
          orientation: 'landscape',
          width: json.width,
          height: json.height,
          elements: json.objects,
          backgroundColor: json.background,
        }),
      });
      
      const data = await res.json();
      if (data.template) {
        setTemplateId(data.template.id);
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddText = () => {
    if (!canvas) return;
    
    const text = new fabric.IText('Text', {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: '#000000',
      fontFamily: 'Helvetica',
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
  };

  const handleAddShape = (shape: 'rect' | 'circle' | 'triangle') => {
    if (!canvas) return;
    
    let object: fabric.Object;
    
    if (shape === 'rect') {
      object = new fabric.Rect({
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        fill: '#6366f1',
      });
    } else if (shape === 'circle') {
      object = new fabric.Circle({
        left: 100,
        top: 100,
        radius: 50,
        fill: '#6366f1',
      });
    } else {
      object = new fabric.Triangle({
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        fill: '#6366f1',
      });
    }
    
    canvas.add(object);
  };

  const handleAddQR = () => {
    if (!canvas) return;
    
    const rect = new fabric.Rect({
      left: 650,
      top: 450,
      width: 100,
      height: 100,
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 1,
    });
    
    canvas.add(rect);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push(`/studio/projects/${projectId}`)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to project
            </button>
            <h1 className="text-xl font-bold mt-1" style={{ color: 'var(--foreground)' }}>
              Template Editor
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: saveStatus === 'saved' ? 'hsl(140 60% 60%)' : saveStatus === 'saving' ? 'hsl(40 90% 50%)' : 'hsl(0 65% 65%)' }}>
              {saveStatus === 'saved' && '✓ Saved locally'}
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'error' && '❌ Save failed'}
            </span>
            
            <button
              onClick={handleSaveTemplate}
              disabled={saving}
              className="px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2">
          <button
            onClick={handleAddText}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
          >
            Text
          </button>
          
          <button
            onClick={() => handleAddShape('rect')}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
          >
            Rectangle
          </button>
          
          <button
            onClick={() => handleAddShape('circle')}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
          >
            Circle
          </button>
          
          <button
            onClick={() => handleAddShape('triangle')}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
          >
            Triangle
          </button>
          
          <button
            onClick={handleAddQR}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
          >
            QR Code
          </button>
        </div>
      </div>

      {/* Canvas */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="shadow-2xl rounded-lg overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <canvas ref={canvasRef} />
        </div>
      </main>
    </div>
  );
}
