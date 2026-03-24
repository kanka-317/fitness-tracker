/**
 * activitiy-log controller
 */

import { factories } from '@strapi/strapi';

const ACTIVITY_LOG_UID = 'api::activitiy-log.activitiy-log';

export default factories.createCoreController(
  ACTIVITY_LOG_UID,
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

      const entity = await strapi.service(ACTIVITY_LOG_UID).create({
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

      const { results, pagination } = await strapi.service(ACTIVITY_LOG_UID).find({
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

      const entity = await strapi.service(ACTIVITY_LOG_UID).findOne(id, {
        ...sanitizedQuery,
        populate: ['users_permissions_user'],
      });

      if (!entity || entity.users_permissions_user?.id !== user.id) {
        return ctx.notFound('Not found or not yours');
      }

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },
  })
);
