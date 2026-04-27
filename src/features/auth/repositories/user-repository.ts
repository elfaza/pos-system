import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
}) {
  return prisma.user.create({ data });
}

export function updateUser(
  id: string,
  data: {
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    passwordHash?: string;
  },
) {
  return prisma.user.update({ where: { id }, data });
}
