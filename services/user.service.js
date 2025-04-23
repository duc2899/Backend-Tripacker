const fs = require("fs");
const path = require("path");

const { MAX_SOCIAL_NETWORKS } = require("../config/constant");
const cloudinary = require("../config/cloudinary.js");
const User = require("../models/userModel");
const Template = require("../models/templatesModel.js");
const throwError = require("../utils/throwError");
const { checkBirthDay, checkPhoneNumberVN } = require("../utils/index.js");
const { updateUserSchema } = require("../validators/user.validator.js");

const Userservice = {
  async updateUser(reqUser, data) {
    try {
      const { userId } = reqUser;
      const { fullName, about, socialNetwork, gender, birthDay, phoneNumber } =
        data;

      await updateUserSchema.validate(data);
      const user = await User.findById(userId).select(
        "fullName avatar.url about gender socialNetwork _id email role createdAt birthDay phoneNumber"
      ); // Convert to plain JavaScript object

      // Validate socialNetwork links (max 3, must be valid URLs)
      if (socialNetwork) {
        const newListSocialNetwork = [...user.socialNetwork, ...socialNetwork];
        if (newListSocialNetwork.length > MAX_SOCIAL_NETWORKS) {
          throwError("USER-001");
        }
        user.socialNetwork = newListSocialNetwork;
      }
      if (birthDay) {
        checkBirthDay(birthDay);
        user.birthDay = birthDay;
      }

      if (phoneNumber) {
        checkPhoneNumberVN(phoneNumber);
        user.phoneNumber = phoneNumber;
      }

      if (fullName) user.fullName = fullName;
      if (about) user.about = about;
      if (gender) user.gender = gender;

      await user.save({ validateModifiedOnly: true });

      return {
        ...user.toObject(),
        avatar: user?.avatar?.url || "",
      };
    } catch (error) {
      throwError(error.message);
    }
  },

  async getUserInformation(reqUser) {
    const { userId } = reqUser;
    const user = await User.findById(userId)
      .select(
        "fullName avatar.url about gender socialNetwork _id email role createdAt birthDay phoneNumber"
      )
      .lean();
    return {
      ...user,
      avatar: user?.avatar?.url || "",
    };
  },

  async updateAvatar(reqUser, data) {
    try {
      const { userId } = reqUser;
      const avatar = data;

      if (!data) {
        throwError("USER-007");
      }

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
      return user.avatar.url;
    } catch (error) {
      throw error;
    }
  },

  async getTemplateOwner(reqUser) {
    const { userId } = reqUser;
    const templates = await Template.find({ owner: userId })
      .populate("tripType", "name")
      .populate("background", "background")
      .select("title description members createdAt buget _id")
      .lean();

    return templates;
  },
};

module.exports = Userservice;
