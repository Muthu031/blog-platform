import prisma from './config/database';

async function testConnection() {
  try {
    const userCount = await prisma.user.count();
    console.log('✅ Database connection successful!');
    console.log(`Users in database: ${userCount}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
