const execute = require("../utils/execute");
const { installNodeDependencies } = require("../services/create");
const { red, green, blue } = require("../utils/colors");

module.exports = function createController({ name, mode }) {
  try {
    execute(
      `git clone https://gitlab.com/qelos/qelos.git ${name}`,
      "clone qelos"
    );
  } catch {
    console.log(red(`Failed to clone application!`));
    console.log(
      blue(
        "Make sure that all of Qelos dependencies are installed - use qelos missing"
      )
    );
    process.exit(1);
  }

  installNodeDependencies(name);

  console.log(
    green("Done!"),
    `\nEnter ${blue(name)} directory, You can run the application using: ${blue(
      "qelos start"
    )}`
  );
  process.exit(0);
};
