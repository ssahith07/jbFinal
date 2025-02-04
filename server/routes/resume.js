// routes/resume.js

const express = require("express");
const router = express.Router();
const multer = require("multer");

const { connectToDatabase } = require("../database");
const { ObjectId } = require("mongodb");
const {verifyToken,authorizeRole} = require("../utils/verifyToken");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// const {
//   recruitersCollection,
//   seekersCollection,
//   jobsCollections,
//   resumeCollection,
// } = connectToDatabase();

router.get("/checking", verifyToken, (req, res) => {
  const seekerId = req.user._id;
  //65c0f20ada9ea2e9aa33def8
  console.log(seekerId);
  res.send("Hello World!!");
});

router.get("/all-res/:id",verifyToken, authorizeRole('seeker'), async (req, res) => {
  const { resumeCollection } = await connectToDatabase();
  try {
    const id = req.params.id;
    const resumes = await resumeCollection.findOne(
      { _id: new ObjectId(id) },
      { resume: 0 }
    );
    if (!resumes) {
      // If resume with the given email doesn't exist, you can handle it accordingly
      return res.status(404).json({ error: "Resume not found" });
    }
    res.send(resumes);
    // res.send(resume.email);
  } catch (error) {
    console.log({ error: error.message });
  }
});

// posting the resume with all fields.
router.post(
  "/post-res",
  verifyToken, authorizeRole('seeker'),
  upload.single("resume"),
  async (req, res) => {
    const seekerId = req.user._id;
    console.log(seekerId);
    console.log("Posting resume");
    const { resumeCollection, profileCollection } = await connectToDatabase();
    try {
      if (!req.file) {
        return res.status(400).send({
          message: "No file was uploaded.",
          status: false,
        });
      }

      const { fullName, email, number, description } = req.body;

      const Resumes = await resumeCollection.insertOne({
        seekerId: seekerId,
        fileType: req.file.mimetype,
        resume: req.file.buffer,
        createAt: new Date(),
      });
      const profile = await profileCollection.insertOne({
        fullName,
        email,
        number,
        description,
        seekerId,
      });
      const savedpProfile = profile;
      console.log(savedpProfile);
      if (Resumes.insertedId) {
        return res.status(200).send(Resumes);
      } else {
        return res.status(404).send({
          message: "Cannot upload resume, try again later!",
          status: false,
        });
      }
    } catch (error) {
      console.error("Error uploading resume:", error);
      return res.status(500).send({
        message: "Internal Server Error",
        status: false,
      });
    }
  }
);

//updating the profile of user by seeker
// PUT endpoint to update profile

    // If you're using multer for file uploads

router.put('/update-profile/:id', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    const { profileCollection } = await connectToDatabase();
    const { id } = req.params;
    const updateData = {
      fullName: req.body.fullName,
      email: req.body.email,
      number: req.body.number,
      description: req.body.description
    };
    
    // If a new resume file is uploaded, add it to updateData
    if (req.file) {
      updateData.resume = req.file.buffer;
    }

    const result = await profileCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.json(result);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get("/profile-info/:id",  verifyToken, authorizeRole('seeker'),async (req, res) => {
  const { profileCollection, resumeCollection } = await connectToDatabase();
  // const newId = new ObjectId(id);
  const id = req.params.id;
  // console.log(id);
  const profiles = await profileCollection.findOne({ seekerId: id });
  // console.log(profiles);
  res.status(200).json(profiles);
});
router.get("/testing", async (req, res) => {
  const id = "65c0f8f3e6e33113bce972d8";
  const profile = await resumeCollection.findOne({ _id: new ObjectId(id) });
  res.send(profile);
});
// deleting the resume of pdf format.

router.delete("/all-res/:id",verifyToken, authorizeRole('seeker'), async (req, res) => {
  console.log("deleting resume");
  const { resumeCollection, profileCollection } = await connectToDatabase();
  const id = req.params.id;
  // const filter = { _id: new ObjectId(id) };
  const filter = { seekerId: id };
  try {
    const resume = await resumeCollection.deleteOne(filter);
    const seeker = await profileCollection.deleteOne(filter);
    if (resume && seeker) {
      res.send(resume);
    } else {
      console.log("Bengindhi!!!");
    }
  } catch (error) {
    console.error("Error deleting the resume: ", error);
    res.status(500).send({
      message: "Internal server error",
    });
  }
});

//  recruiter side view resume

// Showing the resume of pdf format using
router.get("/view-resume/:id",verifyToken, authorizeRole('recruiter'), async (req, res) => {
  const { resumeCollection } = await connectToDatabase();
  try {
    const id = req.params.id;
    console.log(id);
    const resume = await resumeCollection.findOne({
      // _id: new ObjectId(id),
      seekerId: id,
    });

    if (!resume) {
      return res.status(404).send({
        message: "Resume not found",
        status: false,
      });
    }

    // Set headers to indicate the file type
    res.setHeader("Content-Type", resume.fileType || "application/pdf");
    // res.setHeader('Content-Disposition', 'inline; filename=resume.pdf');

    // Send the file buffer as a response
    res.send(resume.resume.buffer);

    console.log("Resume ID:", id);
    console.log("File Type:", resume.fileType);
  } catch (error) {
    console.error("Error fetching resume:", error);
    return res.status(500).send({
      message: error.message,
      status: false,
    });
  }
});

// Seekers
router.get("/view-res/:id",verifyToken, authorizeRole('seeker'), async (req, res) => {
  const { resumeCollection } = await connectToDatabase();
  try {
    const id = req.params.id;
    // console.log(id);
    const resume = await resumeCollection.findOne({
      // _id: new ObjectId(id),
      seekerId: id,
    });

    // console.log(
    //   "Resume Content Length:",
    //   resume.resume ? resume.resume.length : "N/A"
    // );

    if (!resume) {
      return res.status(404).send({
        message: "Resume not found",
        status: false,
      });
    }

    // Set headers to indicate the file type
    res.setHeader("Content-Type", resume.fileType || "application/pdf");
    // res.setHeader('Content-Disposition', 'inline; filename=resume.pdf');

    // Send the file buffer as a response
    res.send(resume.resume.buffer);

    console.log("Resume ID:", id);
    console.log("File Type:", resume.fileType);
  } catch (error) {
    console.error("Error fetching resume:", error);
    return res.status(500).send({
      message: error.message,
      status: false,
    });
  }
});

module.exports = router;
