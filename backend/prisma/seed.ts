import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create test user
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash,
      name: 'Admin User',
      emailVerified: true,
    },
  });

  console.log('✅ Created user:', user.email);

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Inc',
      slug: 'acme',
      plan: 'pro',
    },
  });

  console.log('✅ Created organization:', org.name);

  // Add user to organization as owner
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'owner',
    },
  });

  console.log('✅ Added user to organization');

  // Create project
  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: 'Sample Project',
      key: 'SAMPLE',
      description: 'A sample project for development',
      createdBy: user.id,
    },
  });

  console.log('✅ Created project:', project.name);

  // Create board
  const board = await prisma.board.create({
    data: {
      projectId: project.id,
      name: 'Main Board',
      type: 'kanban',
    },
  });

  console.log('✅ Created board:', board.name);

  // Create columns
  const columns = await Promise.all([
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'To Do',
        position: 0,
        color: '#94a3b8',
      },
    }),
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'In Progress',
        position: 1,
        color: '#3b82f6',
      },
    }),
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'Done',
        position: 2,
        color: '#22c55e',
      },
    }),
  ]);

  console.log('✅ Created columns:', columns.length);

  // Create sample tasks
  const todoColumn = columns[0];

  await prisma.task.create({
    data: {
      projectId: project.id,
      columnId: todoColumn.id,
      taskNumber: 1,
      title: 'Set up authentication system',
      description: 'Implement JWT-based authentication',
      priority: 'high',
      type: 'task',
      position: 0,
      createdBy: user.id,
      assignedTo: user.id,
    },
  });

  console.log('✅ Created sample task');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
