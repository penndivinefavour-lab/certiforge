#!/usr/bin/env tsx

/**
 * CertiForge Development Seed
 *
 * Creates demo data for testing the application.
 * Run after `pnpm db:migrate` or `pnpm db:push`.
 *
 * Demo credentials after seeding:
 *   Email: admin@certiforge.demo
 *   Password: demo1234
 */

const bcrypt = require("bcryptjs");

// Prisma will be available after generation
let prisma;

try {
  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient();
} catch {
  console.error("❌ @prisma/client not found. Run 'pnpm db:generate' first.");
  process.exit(1);
}

async function main() {
  console.log("🌱 Seeding CertiForge database...\n");

  // Create demo user
  const email = "admin@certiforge.demo";
  const password = "demo1234";
  const passwordHash = await bcrypt.hash(password, 12);

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: "Penn Divine Favour",
        password: passwordHash,
        avatarUrl: null,
      },
    });
    console.log(`✓ Created user: ${user.email}`);
  } else {
    console.log(`✓ User already exists: ${user.email}`);
  }

  // Create demo organization
  let org = await prisma.organization.findUnique({ where: { slug: "certiforge-demo" } });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "CertiForge Demo",
        slug: "certiforge-demo",
        primaryColor: "#1a1a2e",
        logoUrl: null,
      },
    });
    console.log(`✓ Created organization: ${org.name}`);
  } else {
    console.log(`✓ Organization already exists: ${org.name}`);
  }

  // Create OWNER membership
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
  });

  if (!membership) {
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "OWNER",
      },
    });
    console.log(`✓ Created OWNER membership`);
  } else {
    console.log(`✓ Membership already exists`);
  }

  // Create demo project
  let project = await prisma.project.findUnique({
    where: { organizationId_slug: { organizationId: org.id, slug: "ai-automation-2026" } },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: "AI Automation Masterclass 2026",
        slug: "ai-automation-2026",
        description: "Comprehensive training program covering AI automation tools and workflows.",
        state: "ACTIVE",
      },
    });

    // Create certificate sequence
    const year = new Date().getFullYear();
    await prisma.certificateSequence.create({
      data: {
        projectId: project.id,
        year,
        nextNumber: 1,
      },
    });

    console.log(`✓ Created project: ${project.name}`);
  } else {
    console.log(`✓ Project already exists: ${project.name}`);
  }

  // Create demo template
  let template = await prisma.template.findFirst({
    where: { projectId: project?.id, name: "Course Completion Certificate" },
  });

  if (!template && project) {
    template = await prisma.template.create({
      data: {
        projectId: project.id,
        name: "Course Completion Certificate",
        description: "Premium landscape certificate with ornate design",
        format: "PDF",
        status: "PUBLISHED",
      },
    });

    // Create template version with sample elements
    const elementsJson = JSON.stringify([
      {
        id: "el-1",
        type: "TEXT",
        name: "Certificate Title",
        zIndex: 1,
        x: 200,
        y: 120,
        width: 400,
        height: 40,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        data: JSON.stringify({
          type: "TEXT",
          name: "Certificate Title",
          text: "Certificate of Completion",
          fontSize: 24,
          fontFamily: "Georgia",
          fontWeight: "normal",
          color: "#ffffff",
          textAlign: "center",
          lineHeight: 1.2,
          letterSpacing: 2,
        }),
      },
      {
        id: "el-2",
        type: "TEXT",
        name: "Recipient Name",
        zIndex: 2,
        x: 150,
        y: 220,
        width: 500,
        height: 60,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        data: JSON.stringify({
          type: "TEXT",
          name: "Recipient Name",
          text: "",
          fontSize: 36,
          fontFamily: "Georgia",
          fontWeight: "bold",
          color: "#ffffff",
          textAlign: "center",
          lineHeight: 1.2,
          dynamicField: "recipient_name",
          minFontSize: 24,
        }),
      },
      {
        id: "el-3",
        type: "TEXT",
        name: "Course Name",
        zIndex: 3,
        x: 150,
        y: 300,
        width: 500,
        height: 40,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        data: JSON.stringify({
          type: "TEXT",
          name: "Course Name",
          text: "",
          fontSize: 20,
          fontFamily: "Helvetica",
          fontWeight: "normal",
          color: "#a0aec0",
          textAlign: "center",
          dynamicField: "course_name",
        }),
      },
    ]);

    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        name: "Initial version",
        width: 800,
        height: 560,
        backgroundColor: "#1a1a2e",
        orientation: "LANDSCAPE",
        elements: elementsJson,
        background: null,
      },
    });

    console.log(`✓ Created template: ${template.name}`);
  } else if (template) {
    console.log(`✓ Template already exists: ${template.name}`);
  }

  // Create demo recipients
  if (project) {
    const existingRecipients = await prisma.recipient.count({
      where: { projectId: project.id },
    });

    if (existingRecipients === 0) {
      const recipients = [
        { name: "Alexandra Chen", email: "alexandra.chen@example.com" },
        { name: "Marcus Johnson", email: "marcus.johnson@example.com" },
        { name: "Priya Patel", email: "priya.patel@example.com" },
        { name: "James Wilson", email: "james.wilson@example.com" },
        { name: "Sophie Martinez", email: "sophie.martinez@example.com" },
      ];

      for (const r of recipients) {
        await prisma.recipient.create({
          data: {
            organizationId: org.id,
            projectId: project.id,
            name: r.name,
            email: r.email,
            metadata: JSON.stringify({}),
          },
        });
      }

      console.log(`✓ Created ${recipients.length} demo recipients`);
    } else {
      console.log(`✓ ${existingRecipients} recipients already exist`);
    }
  }

  // Create demo audit logs
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      actorId: user.id,
      action: "ORGANIZATION_CREATED",
      resourceType: "organization",
      resourceId: org.id,
      details: JSON.stringify({ name: org.name, slug: org.slug }),
    },
  });

  if (project) {
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: user.id,
        action: "PROJECT_CREATED",
        resourceType: "project",
        resourceId: project.id,
        details: JSON.stringify({ name: project.name, slug: project.slug }),
      },
    });
  }

  console.log("\n✅ Seed complete!");
  console.log("\n📋 Demo credentials:");
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`\n🔗 Open: http://localhost:3000/auth/signin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
