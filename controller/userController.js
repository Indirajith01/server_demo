const { prisma } = require("../config/PrismaConfig");
const bcrypt = require("bcrypt");
const joi = require("joi");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const userSchema = joi.object({
  name: joi.string().required(),
  phone: joi
    .string()
    .pattern(/^[0-9]{10}$/)
    .required(),
  email: joi.string().email().required(),
  passcode: joi.string().min(8).required(),
});

const updateSchema = joi.object({
  name: joi.string(),
  phone: joi.string().pattern(/^[0-9]{10}$/),
  email: joi.string().email(),
});

const register = async (req, res) => {
  try {
    const { error, value } = userSchema.validate(req.body);
    if (error) {
      console.log(error);
      res.status(400).json({ message: error.details[0].message });
    }
    const userExist = await prisma.userdetails.findFirst({
      where: {
        OR: [{ email: value.email }, { phone: value.phone }],
      },
    });
    if (userExist) {
      if (userExist.email === value.email) {
        return res.status(409).json({ message: "Email is already in use" });
      } else {
        return res
          .status(409)
          .json({ message: "Phone number is already in use" });
      }
    }
    const hashedpasscode = await bcrypt.hash(value.passcode, 10);
    const newUser = await prisma.userdetails.create({
      data: {
        name: value.name,
        phone: value.phone,
        email: value.email,
        passcode: hashedpasscode,
      },
    });
    res.status(200).json({ message: "User registered successfully", newUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const Login = async (req, res) => {
  const { email_phno, passcode } = req.body;
  try {
    const user = await prisma.userdetails.findFirst({
      where: {
        OR: [{ email: email_phno }, { phone: email_phno }],
      },
    });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid email/phone or password" });
    }
    const passcodeMatch = await bcrypt.compare(passcode, user.passcode);
    if (!passcodeMatch) {
      return res
        .status(401)
        .json({ message: "Invalid email/phone or password" });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1hrs",
    });
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const createDomain = async (req, res) => {
  try {
    const { title } = req.body;
    const user_id = req.user.id;
    const createdDomain = await prisma.task_Domain.create({
      data: {
        title: title,
        user: {
          connect: {
            id: user_id,
          },
        },
      },
    });
    return res
      .status(200)
      .json({ message: "Task Domain created Successfully!", createdDomain });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDomains = async (req, res) =>{
  try {
    const curr_id = req.user.id
    const domains = await prisma.task_Domain.findMany({
      where:{user_id:curr_id}
    })
    res.status(200).json(domains)
  } catch (error) {
    console.error("Error fetching domains:", error);
    return res.status(500).json({ message:"something went wrong"});
  }
}
  

const getDomain = async (req,res) =>{
  try {
    const user_id = req.user.id
    const taskDomainId = req.params.taskDomainId
    const domain = await prisma.task_Domain.findUnique({
      where:{user:{id:user_id},
      id:taskDomainId
    }
    })
    res.status(200).json({domain})
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
const createTodo = async (req, res) => {
  try {
    const { taskDomainId } = req.params;
    const { title, task } = req.body;

    const domainIdExists = await prisma.task_Domain.findUnique({
      where:{id:taskDomainId}
    })
    if(!domainIdExists){
      return res.status(404).json({message:"Domain is not found"})
    }
    // Create the todo and connect it to the user
    const createdTask = await prisma.task.create({
      data: {
        title: title,
        task: task,
        isCompleted:false,
        taskDomain: {
          connect: {
            id: taskDomainId,
          },
        },
      },
    });

    res.status(200).json({ message: "Task created successfully", createdTask });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const user_id = req.user.id;
    const taskDomainId = req.params.taskDomainId;
    
    // Check if the task domain exists and belongs to the user
    const domain = await prisma.task_Domain.findFirst({
      where: {
        id: taskDomainId,
        user: {
          id: user_id
        }
      }
    });

    if (!domain) {
      return res.status(404).json({ message: "Domain is not found or does not belong to the user" });
    }

    // Find tasks associated with the specified task domain
    const tasks = await prisma.task.findMany({
      where: {
        taskDomainId: taskDomainId
      }
    });

    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getTask = async (req, res)=>{
  try {
    const user_id = req.user.id
    const taskDomainId = req.params.taskDomainId
    const taskId = req.params.taskId
    const domainIdExists = await prisma.task_Domain.findUnique({
      where:{id:taskDomainId}
    })
    const taskIdExists = await prisma.task.findUnique({
      where:{id:taskId}
    })
    const taskexists = domainIdExists && taskIdExists
    if(!taskexists){
      return res.status(404).json({message:"Task is not found"})
    }
    const task = await prisma.task.findUnique({
      where:{id:taskId}
    })
    res.status(200).json({task})
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const updateDomain = async (req,res)=>{
  try {
    const {taskDomainId} = req.params
    const {title} = req.body
    const domainIdExists = await prisma.task_Domain.findUnique({
      where:{id:taskDomainId}
    })
    if(!domainIdExists){
      return res.status(404).json({message:"Domain is not found"})
    }
    const modify_domain = await prisma.task_Domain.update({
      where:{id:taskDomainId},
      data:{title:title}
    })
    res.status(200).json({message:"modified successfully",modify_domain})
  } catch (error){
    res.status(500).json({ message: error.message });
  }
}

const updateTodo = async (req,res)=>{
  try {
    const {taskDomainId,taskId} = req.params
    const {title,task,isCompleted} = req.body
    const domainIdExists = await prisma.task_Domain.findUnique({
      where:{id:taskDomainId}
    })
    const taskIdExists = await prisma.task.findUnique({
      where:{id:taskId}
    })
    const taskexists = domainIdExists && taskIdExists
    if(!taskexists){
      return res.status(404).json({message:"Task is not found"})
    }
    const modify_task = await prisma.task.update({
      where:{id:taskId},
      data:{
        title:title,
        task:task,
        isCompleted:isCompleted || false
      }
    })
    res.status(200).json({message:"modified successfully",modify_task})
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const deleteDomain = async (req, res) => {
  const taskDomainId = req.params.taskDomainId
  try {
    const domainIdExists = await prisma.task_Domain.findUnique({
      where:{id:taskDomainId}
    })
    if(!domainIdExists){
      return res.status(404).json({message:"Domain is not found"})
    }

    const tasks = await prisma.task.findMany({
      where:{taskDomainId:taskDomainId}
    })

    await Promise.all(tasks.map(async (task)=>{
      await prisma.task.delete({
        where:{
          id:task.id
        }
      })
    }))
    const delete_domain = await prisma.task_Domain.delete({
      where:{id:taskDomainId}
    })
    res.status(200).json({message:"Domain deleted",delete_domain})
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const deleteTodo = async (req,res)=>{
  try {
    const {taskDomainId,taskId} = req.params
    const domainIdExists = await prisma.task_Domain.findUnique({
      where:{id:taskDomainId}
    })
    const taskIdExists = await prisma.task.findUnique({
      where:{id:taskId}
    })
    const taskexists = domainIdExists && taskIdExists
    if(!taskexists){
      return res.status(404).json({message:"Task is not found"})
    }
    const delete_task = await prisma.task_Domain.findUnique({
      where:{id:taskDomainId}
    })
    res.status(200).json({message:"Task deleted",delete_task})
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const getUsers = async (req, res) => {
  try {
    const allUsers = await prisma.userdetails.findMany({});
    res.status(200).json(allUsers);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUser = async (req, res) => {
  const { id } = req.params;
  try {
    const single_user = await prisma.userdetails.findUnique({
      where: { id: id },
    });
    if (!single_user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(single_user);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const userExistence = await prisma.userdetails.findUnique({
      where: { id: id },
    });
    if (!userExistence) {
      return res.status(404).json({ message: "User not found" });
    }
    if (userId !== id) {
      return res
        .status(401)
        .json({ message: "You are not authorized to update this user" });
    }
    const modify_user = await prisma.userdetails.update({
      where: { id: id },
      data: value,
    });
    res
      .status(200)
      .json({ message: "User details updated successfully", modify_user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const drop_user = await prisma.userdetails.delete({
      where: { id: id },
    });
    if (!drop_user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  register,
  Login,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  createDomain,
  createTodo,
  updateDomain,
  updateTodo,
  deleteDomain,
  deleteTodo,
  getTasks,
  getTask,
  getDomain,
  getDomains,
};
