const asyncHandler = require("express-async-handler");
const {
  getUsers,
  getUser,
  createUser,
  deleteUser,
  updateUserName,
} = require("../database");
const getContacts = asyncHandler(async (req, res) => {
  const contacts = await getUsers();
  res.status(200).send(contacts);
});

const getContact = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const contact = await getUser(id);
  // console.log(contact);
  if (!contact[0]) {
    res.status(404);
    throw new Error("The contact at the specified id does not exist!");
  }
  res.status(200).json(contact[0]);
});
const createContact = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400);
    throw new Error("All fields are mandatory!!");
  }
  const contact = await createUser(name);
  res.status(201).json(contact);
});

const updateContact = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const contact = getUser(id);
  if (!contact[0]) {
    res.status(404);
    throw new Error("Oops, this contact does not exist");
  }
  const { newname } = req.body;
  if (!newname) {
    res.status(400);
    throw new Error("Tf bro");
  }
  const newContact = await updateUserName(id, newname);
  res.status(200).json(newContact[0]);
});

const deleteContact = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const contact = await getUser(id);

  if (!contact[0]) {
    res.status(404);
    throw new Error("The contact at the specified id does not exist!");
  }
  deleteUser(id);
});

module.exports = {
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  createContact,
};
