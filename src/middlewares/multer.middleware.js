import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // in order to have unique names for all the files being stored,
    // please use your logic according to the requirements

    // a sample example maybe as follows:
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // cb(null, file.fieldname + '-' + uniqueSuffix);

    cb(null, file.originalname);
  },
});

export const upload = multer({
  storage,
});
