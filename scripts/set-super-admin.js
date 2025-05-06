import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setSuperAdmin(email) {
    try {
        const updatedUser = await prisma.$transaction(async (tx) => {
            // Find the user
            const user = await tx.user.findUnique({
                where: { email }
            });

            if (!user) {
                throw new Error(`No user found with email: ${email}`);
            }

            // Update the user's role
            const updated = await tx.user.update({
                where: { id: user.id },
                data: { role: 'SUPER_ADMIN' }
            });

            return updated;
        });

        console.log('Successfully updated user:', {
            id: updatedUser.id,
            email: updatedUser.email,
            role: updatedUser.role
        });
    } catch (error) {
        console.error('Error updating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Set your email as SUPER_ADMIN
setSuperAdmin('kieranbiggs40@gmail.com'); 