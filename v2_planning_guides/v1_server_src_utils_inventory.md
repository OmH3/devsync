# V1 Inventory: server/src/utils

This document lists all exported functions in the `server/src/utils` directory to serve as a checklist during the V2 migration.

## 📄 `uuid.js`
- `generateInviteCode()`

## 📄 `role-permissions.js`
- No exported functions detected or purely structural file.

## 📄 `bcrypt.js`
- No exported functions detected or purely structural file.

## 📄 `get-env.js`
- `getEnv(key, defaultValue = "")`

## 📄 `filesystem.utils.js`
- `updateChildrenPaths(parentId, newParentPath)`
- `getLanguageFromExtension(extension)`
- `deleteChildrenRecursively(parentId, session)`

## 📄 `app-error.js`
- No exported functions detected or purely structural file.

## 📄 `roleGuard.js`
- `roleGuard(role, requiredPermissions)`

