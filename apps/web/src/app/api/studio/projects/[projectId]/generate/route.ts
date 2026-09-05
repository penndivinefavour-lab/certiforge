// Open Studio Generation API (No Auth Required)
import { NextRequest, NextResponse } from 'next/server';
import { openStudioDB, getCurrentWorkspace } from '../../../../packages/open-studio/src/db';
import { renderCertificate } from '../../../../packages/certificate-engine/src/render';
import { generateQRCode } from '../../../../packages/qr/src/generator';
import { generateCertificateId } from '../../../../packages/certificate-engine/src/ids';
import { generateVerificationToken } from '../../../../apps/web/src/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    
    const { templateId, recipients } = body;
    
    if (!templateId || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: 'Template ID and recipients array are required' },
        { status: 400 }
      );
    }
    
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients provided' },
        { status: 400 }
      );
    }
    
    // Get template
    const template = await openStudioDB.getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    // Get project to verify ownership
    const project = await openStudioDB.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Create generation job
    const jobId = generateCertificateId();
    await openStudioDB.createGenerationJob({
      id: jobId,
      projectId,
      status: 'PROCESSING',
      total: recipients.length,
      createdAt: Date.now(),
    });
    
    // Generate certificates
    const certificates = [];
    const errors = [];
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        // Generate certificate ID
        const certificateId = generateCertificateId();
        const certificateNumber = `CF-${certificateId.slice(0, 4)}-${certificateId.slice(4, 8)}-${certificateId.slice(8, 12)}`;
        const verificationToken = generateVerificationToken();
        
        // Prepare dynamic values
        const dynamicValues = {
          recipient_name: recipient.name,
          course_name: recipient.metadata?.course_name || '',
          issue_date: new Date().toLocaleDateString(),
          certificate_id: certificateNumber,
          instructor: recipient.metadata?.instructor || '',
          organization: recipient.metadata?.organization || '',
          duration: recipient.metadata?.duration || '',
          grade: recipient.metadata?.grade || '',
          ...recipient.metadata,
        };
        
        // Render PDF
        const rendered = await renderCertificate(
          {
            id: templateId,
            templateId,
            version: 1,
            width: template.width,
            height: template.height,
            backgroundColor: template.backgroundColor,
            orientation: template.orientation === 'landscape' ? 'LANDSCAPE' : 'PORTRAIT',
            elements: template.elements,
            createdAt: new Date(template.createdAt),
          } as any,
          {
            id: certificateId,
            projectId,
            recipientId: recipient.id,
            templateVersionId: templateId,
            certificateNumber,
            verificationToken,
            status: 'GENERATED',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
          {
            id: recipient.id,
            name: recipient.name,
            email: recipient.email,
            metadata: recipient.metadata,
          } as any,
          dynamicValues
        );
        
        // Generate QR code
        const qrDataUrl = await generateQRCode(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/${certificateNumber}`,
          256
        );
        
        // Save certificate
        const certificate = await openStudioDB.createCertificate({
          projectId,
          recipientId: recipient.id,
          templateId,
          certificateNumber,
          verificationToken,
          status: 'GENERATED',
          pdfData: rendered.pdfBytes ? `data:application/pdf;base64,${Buffer.from(rendered.pdfBytes).toString('base64')}` : undefined,
          qrData: qrDataUrl,
          metadata: dynamicValues,
          issuedAt: Date.now(),
        });
        
        certificates.push(certificate);
        
      } catch (error) {
        console.error(`Failed to generate certificate for ${recipient.name}:`, error);
        errors.push({ recipientId: recipient.id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    // Update job status
    await openStudioDB.updateGenerationJob(jobId, {
      status: errors.length > 0 ? 'PARTIAL_FAILURE' : 'COMPLETED',
      completed: certificates.length,
      failed: errors.length,
      completedAt: Date.now(),
    });
    
    return NextResponse.json({
      job: {
        id: jobId,
        status: errors.length > 0 ? 'PARTIAL_FAILURE' : 'COMPLETED',
        total: recipients.length,
        completed: certificates.length,
        failed: errors.length,
      },
      certificates,
      errors,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Failed to generate certificates' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const certificates = await openStudioDB.getCertificates(projectId);
    
    return NextResponse.json({ certificates, count: certificates.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
  }
}
