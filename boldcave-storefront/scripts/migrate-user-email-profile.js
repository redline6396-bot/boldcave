/* global require */

const mongoose = require("mongoose");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes("--apply");

function cleanString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function profileFromAddress(address = {}) {
  const fullName = cleanString(address.fullName, 160);
  const [firstName = "", ...lastNameParts] = fullName.split(/\s+/).filter(Boolean);

  return {
    firstName: cleanString(firstName, 100),
    lastName: cleanString(lastNameParts.join(" "), 100),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanString(address.email, 160))
      ? cleanString(address.email, 160).toLowerCase()
      : "",
  };
}

function getProfileUpdates(user) {
  const addresses = Array.isArray(user.addresses) ? user.addresses : [];
  const source = addresses.find((address) => address?.isDefault) || addresses[0];

  if (!source) return {};

  const profile = profileFromAddress(source);
  const updates = {};

  for (const field of ["firstName", "lastName", "email"]) {
    if (!cleanString(user[field], field === "email" ? 160 : 100) && profile[field]) {
      updates[field] = profile[field];
    }
  }

  return updates;
}

async function migrate() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  const users = mongoose.connection.db.collection("users");
  const indexes = await users.indexes();
  const emailIndex = indexes.find((index) => index.name === "email_1");
  const candidates = await users
    .find(
      { "addresses.0": { $exists: true } },
      { projection: { firstName: 1, lastName: 1, email: 1, addresses: 1 } }
    )
    .toArray();

  const backfills = candidates
    .map((user) => ({ user, updates: getProfileUpdates(user) }))
    .filter(({ updates }) => Object.keys(updates).length > 0);

  console.log(
    JSON.stringify(
      {
        mode: applyChanges ? "apply" : "dry-run",
        emailIndex: emailIndex
          ? { name: emailIndex.name, unique: Boolean(emailIndex.unique) }
          : null,
        usersToBackfill: backfills.length,
        fieldsToBackfill: backfills.reduce((counts, { updates }) => {
          for (const field of Object.keys(updates)) {
            counts[field] = (counts[field] || 0) + 1;
          }
          return counts;
        }, {}),
      },
      null,
      2
    )
  );

  if (!applyChanges) {
    console.log("Dry run only. Re-run with --apply to migrate the database.");
    return;
  }

  if (emailIndex?.unique) {
    await users.dropIndex(emailIndex.name);
    await users.createIndex({ email: 1 }, { name: "email_1" });
  } else if (!emailIndex) {
    await users.createIndex({ email: 1 }, { name: "email_1" });
  }

  if (backfills.length) {
    await users.bulkWrite(
      backfills.map(({ user, updates }) => ({
        updateOne: {
          filter: {
            _id: user._id,
            ...Object.fromEntries(
              Object.keys(updates).map((field) => [
                field,
                user[field] === undefined ? { $exists: false } : user[field],
              ])
            ),
          },
          update: {
            $set: updates,
            $currentDate: { updatedAt: true },
          },
        },
      })),
      { ordered: false }
    );
  }

  console.log("Migration applied successfully.");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
