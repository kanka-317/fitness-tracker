/**
 * food-log controller
 */

import { factories } from '@strapi/strapi';

const FOOD_LOG_UID = 'api::food-log.food-log';
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default factories.createCoreController(
  FOOD_LOG_UID,
  ({ strapi }) => ({
    async create(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login required');
      }

      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);
      const requestData = ctx.request.body?.data;

      if (!requestData || typeof requestData !== 'object' || Array.isArray(requestData)) {
        return ctx.badRequest('Missing "data" payload in the request body');
      }

      await this.validateInput(requestData, ctx);
      const sanitizedInputData = await this.sanitizeInput(requestData, ctx);
      const baseInputData =
        sanitizedInputData &&
        typeof sanitizedInputData === 'object' &&
        !Array.isArray(sanitizedInputData)
          ? sanitizedInputData
          : {};

      const entity = await strapi.service(FOOD_LOG_UID).create({
        ...sanitizedQuery,
        data: {
          ...baseInputData,
          users_permissions_user: user.id,
        },
        populate: ['users_permissions_user'],
      });

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      ctx.status = 201;

      return this.transformResponse(sanitizedEntity);
    },

    async find(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login required');
      }

      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);
      const existingFilters =
        sanitizedQuery.filters &&
        typeof sanitizedQuery.filters === 'object' &&
        !Array.isArray(sanitizedQuery.filters)
          ? sanitizedQuery.filters
          : {};

      const { results, pagination } = await strapi.service(FOOD_LOG_UID).find({
        ...sanitizedQuery,
        filters: {
          ...existingFilters,
          users_permissions_user: user.id,
        },
        populate: ['users_permissions_user'],
      });

      const sanitizedResults = await this.sanitizeOutput(results, ctx);

      return this.transformResponse(sanitizedResults, { pagination });
    },

    async findOne(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login required');
      }

      const { id } = ctx.params;

      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      const entity = await strapi.service(FOOD_LOG_UID).findOne(id, {
        ...sanitizedQuery,
        populate: ['users_permissions_user'],
      });

      if (!entity || entity.users_permissions_user?.id !== user.id) {
        return ctx.notFound('Not found or not yours');
      }

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    async analyzeImage(ctx) {
      const imageBase64 =
        typeof ctx.request.body?.imageBase64 === 'string'
          ? ctx.request.body.imageBase64.replace(/^data:[^;]+;base64,/, '').trim()
          : '';
      const mimeType =
        typeof ctx.request.body?.mimeType === 'string'
          ? ctx.request.body.mimeType.trim()
          : '';

      if (!imageBase64 || !mimeType) {
        return ctx.badRequest('Upload a meal photo before running AI Food Snap.');
      }

      if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
        return ctx.badRequest('Upload a JPG, PNG, or WEBP image.');
      }

      const imageBuffer = Buffer.from(imageBase64, 'base64');

      if (!imageBuffer.byteLength) {
        return ctx.badRequest('The uploaded image could not be read.');
      }

      if (imageBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
        return ctx.badRequest('Use an image smaller than 4 MB.');
      }

      try {
        const result = await strapi.service(FOOD_LOG_UID).analyzeImage({
          imageBase64,
          mimeType,
        });

        ctx.body = {
          data: {
            result,
          },
        };
      } catch (error) {
        strapi.log.error('Gemini food image analysis failed.', error);

        return ctx.internalServerError(
          error instanceof Error
            ? error.message
            : 'Food image analysis failed.',
        );
      }
    },
  })
);
