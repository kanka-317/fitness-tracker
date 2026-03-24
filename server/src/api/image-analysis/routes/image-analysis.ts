export default {
  routes: [
    {
      method: 'POST',
      path: '/image-analysis/analyze',
      handler: 'image-analysis.analyze',
      config: {
        auth: false,
      },
    },
  ],
};
