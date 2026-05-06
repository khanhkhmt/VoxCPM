import { hashPassword } from "../src/lib/auth/hash";
import { prisma } from "../src/lib/db";

async function main() {
    const username = process.argv[2] || "admin";
    const password = process.argv[3] || "Admin@123";
    const name = process.argv[4] || "Administrator";

    console.log(`Seeding admin user: ${username}`);

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
        console.log("User already exists.");
        return;
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
        data: {
            username,
            name,
            passwordHash,
            role: "admin",
        },
    });

    console.log(`✅ Admin created successfully. Username: ${username}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
