import mongoose from "mongoose";
import "dotenv/config";
import connectDatabase from "../config/database.config.js";
import RoleModel from "../models/Role-permissions.model.js";
import { RolePermissions } from "../utils/role-permissions.js";

const seedRoles = async () => {
  console.log("Seeding roles initiating...");

  try {
    await connectDatabase();

    const session = await mongoose.startSession();
    session.startTransaction();

    console.log("clearing existing roles...");
    await RoleModel.deleteMany({}, { session });

    for (const roleName in RolePermissions) {
      const role = roleName;
      const permissions = RolePermissions[roleName];

      const existingRole = await RoleModel.findOne({ name: role }).session(
        session
      );
      if (!existingRole) {
        const newRole = new RoleModel({
          name: role,
          permissions: permissions,
        });
        await newRole.save({ session });
        console.log(`Role ${role} added with permissions.`);
      } else {
        console.log(`Role ${role} already exists.`);
      }
    }
    await session.commitTransaction();
    console.log("Transaction committed.");

    session.endSession();
    console.log("Session ended.");

    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Error seeding roles:", error.message);

    // Abort transaction if it's still active
    if (session.inTransaction()) {
      await session.abortTransaction();
      console.log("Transaction aborted due to error.");
    }

    session.endSession();
  }
};

seedRoles().catch((error) =>
  console.error("Error running seed script:", error)
);
