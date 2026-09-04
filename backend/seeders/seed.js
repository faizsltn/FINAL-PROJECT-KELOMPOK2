require("dotenv").config();

const { sequelize, User } = require("../../../models");
const bcrypt = require("bcrypt");

async function seed() {
  await sequelize.sync();

  const email = "demo@aicourse.local";
  const exists = await User.findOne({ where: { email } });

  if (!exists) {
    await User.create({
      name: "Demo User",
      email,
      password: await bcrypt.hash("password123", 10)
    });
  }

  console.log("Seeder selesai.");
  console.log("Demo login: demo@aicourse.local / password123");

  await sequelize.close();
}

seed().catch(error => {
  console.error(error);
  process.exit(1);
});