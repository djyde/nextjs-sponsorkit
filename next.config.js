module.exports = {
  async rewrites() {
    return [
      {
        source: "/sponsors.svg",
        destination: "/api/sponsors",
      },
    ];
  },
};