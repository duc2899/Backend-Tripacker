const fs = require("fs");
const path = require("path");

const { MAX_SOCIAL_NETWORKS } = require("../config/constant");
const User = require("../models/userModel");
const Template = require("../models/templatesModel.js");
const cloudinary = require("../config/cloudinary.js");
const throwError = require("../utils/throwError");
const {
  checkBirthDay,
  checkPhoneNumberVN,
  sanitizeAndValidate,
} = require("../utils/index.js");

const Userservice = {
  async updateUser(req) {
    const userId = req.user.userId;
    const { fullName, about, socialNetwork, gender, birthDay, phoneNumber } =
      sanitizeAndValidate(req.body, [], {
        trim: true,
        removeNull: true,
      });

    // Validate socialNetwork links (max 3, must be valid URLs)
    if (socialNetwork && Array.isArray(socialNetwork)) {
      if (socialNetwork.length > MAX_SOCIAL_NETWORKS) {
        throwError("USER-001");
      }

      for (const link of socialNetwork) {
        try {
          new URL(link); // Will throw an error if not a valid URL
        } catch (error) {
          throwError("USER-002");
        }
      }
    }
    if (birthDay) {
      checkBirthDay(birthDay);
    }

    if (phoneNumber) {
      checkPhoneNumberVN(phoneNumber);
    }

    // Prepare update object
    const updateObject = {};
    if (fullName) updateObject.fullName = fullName;
    if (about) updateObject.about = about;
    if (socialNetwork) updateObject.socialNetwork = socialNetwork;
    if (gender) updateObject.gender = gender;
    if (birthDay) updateObject.birthDay = birthDay;
    if (phoneNumber) updateObject.phoneNumber = phoneNumber;

    const updatedUser = await User.findByIdAndUpdate(userId, updateObject, {
      new: true,
      runValidators: true,
      select:
        "fullName avatar about gender socialNetwork _id email role createdAt birthDay phoneNumber",
    }).lean(); // Convert to plain JavaScript object

    if (!updatedUser) {
      throwError("USER-014", 404); // User not found
    }

    return updatedUser;
  },

  // async getMe(userId) {
  //   const user = await User.findById(userId).select("fullName avatar _id");
  //   return user;
  // },

  async getUserInformation(req) {
    const { userId } = req.user;
    const user = await User.findById(userId)
      .select(
        "fullName avatar about gender socialNetwork _id email role createdAt birthDay phoneNumber"
      )
      .lean();
    return user;
  },

  async updateAvatar(req) {
    try {
      const { userId } = req.user;
      const avatar = req.file;

      const user = await User.findById(userId);
      if (!user) {
        throwError("AUTH-014");
      }
      // Nếu user đã có avatar trước đó, xóa avatar cũ trên Cloudinary
      if (user.avatar?.id) {
        await cloudinary.uploader.destroy(user.avatar.id);
      }
      // Upload image to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(avatar.path, {
        folder: "avatars",
        use_filename: true,
        unique_filename: false,
      });

      user.avatar = {
        id: uploadResponse.public_id,
        url: uploadResponse.secure_url,
      };

      await user.save({
        validateModifiedOnly: true,
      });
      // 🗑 Xóa file cục bộ sau khi upload lên Cloudinary
      fs.unlink(path.resolve(avatar.path), (err) => {
        if (err) console.error("Lỗi khi xóa file:", err);
      });
      return user.avatar;
    } catch (error) {
      throw error;
    }
  },

  async getTemplateOwner(req) {
    const { userId } = req.user;
    const templates = await Template.find({ user: userId })
      .populate("tripType", "name")
      .populate("background", "background")
      .select("title description members createdAt buget _id")
      .lean();

    return templates;
  },
};

module.exports = Userservice;
