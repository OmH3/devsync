import mongoose from "mongoose";
import "dotenv/config";
import connectDatabase from "../config/database.config.js";
import RoleModel from "../models/Role-permissions.model.js";
import { RolePermissions } from "../utils/role-permissions.js";

/**
 * Idempotent: upserts each role by name, so existing role ids (referenced by members)
 * are preserved and the script is safe to re-run on live data.
 */
const seedRoles = async () => {
  console.log("Seeding roles initiating...");
  await connectDatabase();
  for (const [name, permissions] of Object.entries(RolePermissions)) {
    await RoleModel.updateOne({ name }, { $set: { permissions } }, { upsert: true, setDefaultsOnInsert: false });
    console.log(`Role ${name} upserted.`);
  }
  console.log("Seeding completed successfully.");
};

try {
  await seedRoles();
} catch (error) {
  console.error("Error seeding roles:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
