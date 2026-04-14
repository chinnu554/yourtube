import mongoose from "mongoose";
import users from "../Modals/Auth.js";

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({
        email,
        name,
        image,
        currentPlan: "free",
        premiumPlan: "free",
        watchLimitMinutes: 5,
        isPremium: false,
      });
      return res.status(201).json({ result: newUser });
    } else {
      const updatedUser =
        existingUser.currentPlan && existingUser.watchLimitMinutes !== undefined
          ? existingUser
          : await users.findByIdAndUpdate(
              existingUser._id,
              {
                $set: {
                  currentPlan: existingUser.currentPlan || "free",
                  premiumPlan: existingUser.premiumPlan || "free",
                  watchLimitMinutes:
                    existingUser.watchLimitMinutes !== undefined
                      ? existingUser.watchLimitMinutes
                      : 5,
                  isPremium: existingUser.isPremium || false,
                },
              },
              { new: true }
            );

      return res.status(200).json({ result: updatedUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
