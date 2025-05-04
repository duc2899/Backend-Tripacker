const mongoose = require("mongoose");

const MemberTaskModel = require("../models/memberTasksModel");
const TemplateModel = require("../models/templatesModel");
const { getCache, setCache } = require("../utils/redisHelper");

const {
  handelCheckExitUserInTask,
  calculateNewPosition,
} = require("../logics/memberTask.logic");
const throwError = require("../utils/throwError");
const {
  createMemberTaskSchema,
  updateMemberTaskSchema,
  moveMemberTaskSchema,
  deleteMemberTaskSchema,
} = require("../validators/memberTask.validator");
const { handleGetListMembers } = require("../logics/template.logic");

const CACHE_TTL = 3600; // 1 hour
const CACHE_PREFIX = "member_tasks:";

const memberTaskService = {
  async createMemberTask(reqUser, data) {
    try {
      const { userId } = reqUser;
      const { templateId, memberTask } = data;

      await createMemberTaskSchema.validate(data);

      const Task = await MemberTaskModel.findOne({
        template: templateId,
      });

      const template = await TemplateModel.findById(templateId)
        .select("listMembers")
        .lean();

      if (memberTask.assignee) {
        const user = handelCheckExitUserInTask(
          memberTask.assignee,
          template.listMembers
        );
        if (!user) {
          throwError("TEM-036");
        }
      }

      const newPosition = await calculateNewPosition(
        templateId,
        undefined,
        memberTask.status
      );

      let createdTask;
      if (Task) {
        Task.memberTasks.push({
          title: memberTask.title,
          assignee: memberTask.assignee || userId,
          dueDate: memberTask.dueDate,
          priority: memberTask.priority,
          position: newPosition,
          createdBy: userId,
        });
        await Task.save();
        createdTask = getLatestTask(Task?.memberTasks || {});
      } else {
        const NewTask = new MemberTaskModel({
          template: templateId,
          memberTasks: [
            {
              title: memberTask.title,
              assignee: memberTask.assignee || userId,
              dueDate: memberTask.dueDate,
              priority: memberTask.priority,
              position: newPosition,
              createdBy: userId,
            },
          ],
        });
        await NewTask.save();
        createdTask = getLatestTask(NewTask?.memberTasks || {});
      }

      const populatedTask = await MemberTaskModel.populate(createdTask, [
        { path: "assignee", select: "avatar" },
        { path: "createdBy", select: "avatar" },
      ]);

      const [enrichedTask] = enrichTasksWithUsernames(
        [populatedTask],
        template.listMembers
      );

      // Update cache with new task
      const cacheKey = `${CACHE_PREFIX}${templateId}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        cachedData[enrichedTask.status].unshift(enrichedTask);
        await setCache(cacheKey, cachedData, CACHE_TTL);
      }

      return enrichedTask;
    } catch (error) {
      throwError(error.message);
    }
  },

  async getMemberTask(templateId) {
    try {
      // Try to get from cache first
      const cacheKey = `${CACHE_PREFIX}${templateId}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const task = await MemberTaskModel.findOne({
        template: templateId,
      }).populate({
        path: "memberTasks.assignee memberTasks.lastEditedBy",
        select: "avatar",
      });

      if (!task) throwError("TEM-037");

      const template = await TemplateModel.findById(templateId)
        .select("listMembers")
        .lean();

      const enrichTasks = enrichTasksWithUsernames(
        task.memberTasks,
        template.listMembers
      );
      const result = sortTasks(enrichTasks);

      // Cache the result
      await setCache(cacheKey, result, CACHE_TTL);

      return result;
    } catch (error) {
      throwError(error.message);
    }
  },

  async updateMemberTask(reqUser, data) {
    try {
      const { userId } = reqUser;
      const { templateId, memberTaskId, updates } = data;

      await updateMemberTaskSchema.validate(data);

      const task = await MemberTaskModel.findOne({
        template: templateId,
      }).populate({
        path: "memberTasks.assignee memberTasks.lastEditedBy memberTasks.createdBy",
        select: "avatar",
      });

      if (!task) {
        throwError("TEM-037");
      }

      const memberTaskIndex = task.memberTasks.findIndex(
        (mt) => mt._id.toString() === memberTaskId
      );

      if (memberTaskIndex === -1) {
        throwError("TEM-037");
      }

      if (updates.priority) {
        task.memberTasks[memberTaskIndex].priority = updates.priority;
      }

      if (updates.title) {
        task.memberTasks[memberTaskIndex].title = updates.title;
      }

      if (updates.dueDate) {
        task.memberTasks[memberTaskIndex].dueDate = updates.dueDate;
      }

      if (updates.assignee) {
        const template = await TemplateModel.findById(templateId)
          .select("listMembers")
          .lean();

        const user = handelCheckExitUserInTask(
          updates.assignee,
          template.listMembers
        );
        if (!user) {
          throwError("TEM-036");
        }

        task.memberTasks[memberTaskIndex].assignee = updates.assignee;
      }

      task.memberTasks[memberTaskIndex].lastEditedBy = userId;

      await task.save();

      // Lấy lại listMembers để enrich
      const template = await TemplateModel.findById(templateId)
        .select("listMembers")
        .lean();

      const [enrichedTask] = enrichTasksWithUsernames(
        [populatedTask],
        template.listMembers
      );

      // Update cache with updated task
      const cacheKey = `${CACHE_PREFIX}${templateId}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        // Remove old task from its current status
        Object.keys(cachedData).forEach((status) => {
          cachedData[status] = cachedData[status].filter(
            (t) => t._id.toString() !== memberTaskId
          );
        });
        // Add updated task to its status
        cachedData[enrichedTask.status].unshift(enrichedTask);
        await setCache(cacheKey, cachedData, CACHE_TTL);
      }

      return enrichedTask;
    } catch (error) {
      throwError(error.message);
    }
  },

  async moveMemberTask(reqUser, data) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId } = reqUser;
      const { templateId, memberTaskId, newStatus, newPosition } = data;

      await moveMemberTaskSchema.validate(data);

      // 1. Validate
      const taskDoc = await MemberTaskModel.findOne({
        template: templateId,
        "memberTasks._id": memberTaskId,
      })
        .populate({
          path: "memberTasks.assignee memberTasks.lastEditedBy memberTasks.createdBy",
          select: "avatar",
        })
        .session(session);

      if (!taskDoc) throwError("TEM-037");

      // 2. Tìm task và cập nhật
      const taskIndex = taskDoc.memberTasks.findIndex(
        (t) => t._id.toString() === memberTaskId
      );

      // 3. Cập nhật status và position
      taskDoc.memberTasks[taskIndex].status = newStatus;
      taskDoc.memberTasks[taskIndex].position = newPosition;
      taskDoc.memberTasks[taskIndex].lastEditedBy = userId;
      taskDoc.memberTasks[taskIndex].updatedAt = new Date();

      // 4. Lưu và commit
      await taskDoc.save({ session });
      await session.commitTransaction();

      // 5. Trả về data đã được sort
      const template = await TemplateModel.findById(templateId)
        .select("listMembers")
        .lean();

      const enrichTasks = enrichTasksWithUsernames(
        taskDoc.memberTasks,
        template.listMembers
      );
      const result = sortTasks(enrichTasks);

      // Update cache with new data
      await setCache(`${CACHE_PREFIX}${templateId}`, result, CACHE_TTL);

      return result;
    } catch (error) {
      await session.abortTransaction();
      throwError(error.message);
    } finally {
      session.endSession();
    }
  },

  async deleteMemberTask(data) {
    try {
      const { templateId, memberTaskId } = data;

      await deleteMemberTaskSchema.validate(data);

      const task = await MemberTaskModel.findOne({
        template: templateId,
        "memberTasks._id": memberTaskId,
      }).populate({
        path: "memberTasks.assignee memberTasks.lastEditedBy memberTasks.createdBy",
        select: "avatar",
      });

      if (!task) throwError("TEM-037");

      task.memberTasks = task.memberTasks.filter(
        (mt) => mt._id.toString() !== memberTaskId
      );

      await task.save();

      const template = await TemplateModel.findById(templateId)
        .select("listMembers")
        .lean();

      const enrichTasks = enrichTasksWithUsernames(
        task.memberTasks,
        template.listMembers
      );
      const result = sortTasks(enrichTasks);

      // Update cache with new data
      await setCache(`${CACHE_PREFIX}${templateId}`, result, CACHE_TTL);

      return result;
    } catch (error) {
      throwError(error.message);
    }
  },

  async getListMemberInTemplate(templateId) {
    try {
      // Try to get from cache first
      const cacheKey = `trip_timeline:${templateId}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return cachedData.infor.listMembers;
      }

      const template = await TemplateModel.findById(templateId)
        .populate({
          path: "listMembers.user",
          select: "avatar",
        })
        .select("listMembers")
        .lean();

      const listMembers = handleGetListMembers(template);

      return listMembers;
    } catch (error) {
      throwError(error.message);
    }
  },
};

const getLatestTask = (tasks) => {
  if (!tasks || tasks.length === 0) return null;

  // Sort tasks by createdAt in descending order and get the first one
  return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
};

// Hàm enrichTasksWithUsernames để dùng lại
const enrichTasksWithUsernames = (tasks, listMembers) => {
  const userMap = {};
  listMembers.forEach((member) => {
    if (member.user) {
      userMap[member.user.toString()] = member.name;
    }
  });

  return tasks.map((t) => {
    const assignee =
      t.assignee && typeof t.assignee === "object"
        ? {
            _id: t.assignee._id,
            avatar: t.assignee.avatar?.url || t.assignee.avatar || null,
            username: userMap[t.assignee._id?.toString()] || null,
          }
        : null;
    const lastEditedBy =
      t.lastEditedBy && typeof t.lastEditedBy === "object"
        ? {
            _id: t.lastEditedBy._id,
            avatar: t.lastEditedBy.avatar?.url || t.lastEditedBy.avatar || null,
            username: userMap[t.lastEditedBy._id?.toString()] || null,
          }
        : null;
    const createdBy =
      t.createdBy && typeof t.createdBy === "object"
        ? {
            _id: t.createdBy._id,
            avatar: t.createdBy.avatar?.url || t.createdBy.avatar || null,
            username: userMap[t.createdBy._id?.toString()] || null,
          }
        : null;
    return {
      ...t.toObject(),
      assignee,
      lastEditedBy,
      createdBy,
    };
  });
};

const sortTasks = (tasks) => {
  if (!tasks || tasks.length === 0) {
    return {
      Empty: [],
      InProgress: [],
      Done: [],
      Deleted: [],
    };
  }

  const priorityOrder = { low: 0, medium: 1, high: 2 };

  // Group tasks by status
  const groupedTasks = {
    Empty: [],
    InProgress: [],
    Done: [],
    Deleted: [],
  };

  tasks.forEach((task) => {
    groupedTasks[task.status].push(task);
  });

  // Sort each group by position (tăng dần) và priority (giảm dần)
  Object.keys(groupedTasks).forEach((status) => {
    groupedTasks[status].sort((a, b) => {
      // Ưu tiên sort theo position trước
      if (a.position !== b.position) {
        return a.position - b.position; // Tăng dần (số nhỏ lên trước)
      }

      // Nếu position bằng nhau thì sort theo priority
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  });

  return groupedTasks;
};

module.exports = memberTaskService;
