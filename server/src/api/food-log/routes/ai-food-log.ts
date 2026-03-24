export default {
  routes: [
    {
      method: 'POST',
      path: '/food-logs/analyze-image',
      handler: 'food-log.analyzeImage',
      config: {
        auth: false,
      },
    },
  ],
};
