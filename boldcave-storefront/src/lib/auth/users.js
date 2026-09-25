import User from "@/models/User";
import { cleanString, isValidEmail, normalizePhone } from "@/lib/validation";

export function getPhoneLookupValues(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return [];
  }

  return [
    normalizedPhone,
    `91${normalizedPhone}`,
    `+91${normalizedPhone}`,
  ];
}

export async function findUserByPhone(phone) {
  const values = getPhoneLookupValues(phone);

  if (!values.length) {
    return null;
  }

  return User.findOne({ phone: { $in: values } });
}

export async function findOrCreateUserForPhone(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  const existingUser = await findUserByPhone(normalizedPhone);

  if (existingUser) {
    return existingUser;
  }

  try {
    return await User.findOneAndUpdate(
      { phone: normalizedPhone },
      {
        $setOnInsert: {
          phone: normalizedPhone,
          phoneVerified: true,
          status: "active",
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    return findUserByPhone(normalizedPhone);
  }
}

export function checkoutProfileFromAddress(address = {}) {
  const fullName = cleanString(address.fullName, 160);
  const [firstName = "", ...lastNameParts] = fullName.split(/\s+/).filter(Boolean);
  const email = cleanString(address.email, 160).toLowerCase();

  return {
    firstName,
    lastName: lastNameParts.join(" "),
    email: email && isValidEmail(email) ? email : "",
  };
}

export async function syncUserProfileFromCheckoutAddress(user, address = {}) {
  if (!user) return;

  const profile = checkoutProfileFromAddress(address);
  const userId = user?._id || user;
  const candidates = Object.entries(profile).filter(([, value]) => Boolean(value));

  if (!userId || !candidates.length) return [];

  const updatedFields = [];

  // Keep checkout hydration fill-only. Each field has its own atomic blank check,
  // so an address/order can never overwrite a profile edit made at the same time.
  for (const [field, value] of candidates) {
    const result = await User.updateOne(
      {
        _id: userId,
        $or: [
          { [field]: { $exists: false } },
          { [field]: null },
          { [field]: "" },
        ],
      },
      { $set: { [field]: value } }
    );

    if (result.modifiedCount > 0) {
      updatedFields.push(field);

      if (user?._id) {
        user[field] = value;
      }
    }
  }

  return updatedFields;
}
