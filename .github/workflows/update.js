const fs = require("fs");

let data = {
  targets: "Auto target list",
  spies: "Pulled from Discord",
  notes: "Generated at " + new Date()
};

fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
