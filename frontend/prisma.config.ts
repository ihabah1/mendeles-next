const { defineConfig } = require('prisma/config')
require('dotenv').config()

module.exports = defineConfig({
  datasourceUrl: process.env.DATABASE_URL,
})