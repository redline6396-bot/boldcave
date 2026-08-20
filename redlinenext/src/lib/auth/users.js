import User from "@/models/User";
import { normalizePhone } from "@/lib/validation";

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
        new: true,
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
