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
  const updates = {};

  if (profile.firstName && !cleanString(user.firstName, 100)) {
    updates.firstName = profile.firstName;
  }

  if (profile.lastName && !cleanString(user.lastName, 100)) {
    updates.lastName = profile.lastName;
  }

  if (profile.email && !cleanString(user.email, 160)) {
    updates.email = profile.email;
  }

  if (!Object.keys(updates).length) return;

  try {
    await User.updateOne({ _id: user._id }, { $set: updates });
    Object.assign(user, updates);
  } catch (error) {
    if (error?.code === 11000 && updates.email) {
      delete updates.email;

      if (Object.keys(updates).length) {
        await User.updateOne({ _id: user._id }, { $set: updates });
        Object.assign(user, updates);
      }

      return;
    }

    throw error;
  }
}
