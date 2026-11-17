export default {
  paths: ["tests/bdd/features/**/*.feature"],
  import: ["tests/bdd/steps/**/*.ts"],
  format: ["progress", "junit:reports/junit/bdd-junit.xml"],
};
