// Benchmark-only seed: preserve role IDs across runs and always close MongoDB.
import mongoose from 'mongoose';
import RoleModel from '../src/models/Role-permissions.model.js';
import { RolePermissions } from '../src/utils/role-permissions.js';

const uri = new URL(process.env.MONGO_URI);
if (!['localhost', '127.0.0.1'].includes(uri.hostname) || uri.pathname !== '/devsync_bench') {
  throw new Error('Benchmark seeding requires the local devsync_bench database');
}
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  for (const [name, permissions] of Object.entries(RolePermissions)) {
    const role = await RoleModel.findOne({ name });
    if (role) {
      role.permissions = permissions;
      await role.save();
    } else {
      await RoleModel.create({ name, permissions });
    }
  }
} finally {
  await mongoose.disconnect();
}
