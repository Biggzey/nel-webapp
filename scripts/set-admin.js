import { PrismaClient } from '@prisma/client';

const productionUrl = 'postgresql://nel_db_4ayx_user:MeWSJJzXNU63ogf0BtovqvBNwQTAoZWr@dpg-d0ckgpadbo4c73fidqd0-a/nel_db_4ayx';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: productionUrl
        }
    }
});

async function setAdmin(email) {
    try {
        const updatedUser = await prisma.$transaction(async (tx) => {
            // Find the user
            const user = await tx.user.findUnique({
                where: { email },
            });

            if (!user) {
                throw new Error(`No user found with email: ${email}`);
            }

            // Update the user's role
            const updated = await tx.user.update({
                where: { id: user.id },
                data: { role: 'SUPER_ADMIN' },
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

// Get email from command line argument
const email = process.argv[2];
if (!email) {
    console.error('Please provide an email address as an argument');
    process.exit(1);
}

setAdmin(email); 