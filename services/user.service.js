const fs = require("fs");
const path = require("path");

const { MAX_SOCIAL_NETWORKS } = require("../config/constant");
const User = require("../models/userModel");
const Template = require("../models/templatesModel.js");
const cloudinary = require("../config/cloudinary.js");
const throwError = require("../utils/throwError");

const Userservice = {
  async updateUser(userId, updateData) {
    const { fullName, about, socialNetwork, gender, birthDay } = updateData;

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
    const isValidDateFormat = (dateString) => {
      const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
      return regex.test(dateString);
    };

    if (birthDay) {
      if (!isValidDateFormat(birthDay)) {
        throwError("USER-010", 400, "INVALID_DATE_FORMAT");
      }

      const birthDate = new Date(birthDay);
      const currentDate = new Date();

      if (isNaN(birthDate.getTime())) {
        throwError("USER-011", 400, "INVALID_DATE_VALUE");
      }

      if (birthDate >= currentDate) {
        throwError("USER-012", 400, "FUTURE_DATE_NOT_ALLOWED");
      }
    }

    // Prepare update object
    const updateObject = {};
    if (fullName) updateObject.fullName = fullName;
    if (about) updateObject.about = about;
    if (socialNetwork) updateObject.socialNetwork = socialNetwork;
    if (gender) updateObject.gender = gender;
    if (birthDay) updateObject.birthDay = birthDay;

    await User.findByIdAndUpdate(userId, updateObject, {
      new: true,
      runValidators: true,
    });

    return updateData;
  },

  async getMe(userId) {
    const user = await User.findById(userId).select("name avatar _id");
    return user;
  },

  async getUserInformation(userId) {
    const user = await User.findById(userId).select(
      "name fullName avatar about gender socialNetwork _id email role createdAt birthDay"
    );
    return user;
  },

  async updateAvatar(userId, avatar) {
    try {
      const user = await User.findById(userId);
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

  async getTemplateOwner(userId) {
    const templates = await Template.find({ user: userId })
      .populate("tripType", "name")
      .populate("background", "background")
      .select("title destination description members createdAt buget _id")
      .lean();

    return templates;
  },
};

module.exports = Userservice;
