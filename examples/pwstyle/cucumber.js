module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['steps/**/*.{ts,js}'],
    requireModule: ['ts-node/register'],
    publishQuiet: true,
  },
};