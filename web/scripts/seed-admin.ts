import { hashPassword } from "../src/lib/auth/hash";
import { prisma } from "../src/lib/db";

async function main() {
    const email = process.argv[2] || "admin@oriagent.local";
    const password = process.argv[3] || "Admin@123";
    const name = process.argv[4] || "Administrator";

    console.log(`Seeding admin user: ${email}`);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log("User already exists.");
        return;
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
        data: {
            email,
            name,
            passwordHash,
            role: "admin",
        },
    });

    console.log(`✅ Admin created successfully. Email: ${email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
